import { prisma } from '@/lib/prisma';
import { Booking, BookingStatus, Prisma, EventStatus, Seat, SeatStatus } from '@prisma/client';
import { CreateBookingInput } from '../validation/schemas';
import { findEventById } from './event.service'; // Import event service
import { releaseSeats } from './seat.service'; // Import seat service for releasing on failure/cancel

/**
 * Creates a new booking record, associating reserved seats.
 * Sets status to PENDING.
 * @param data - Booking creation data including seatIds or quantity and optional delivery details.
 * @param userId - ID of the user making the booking (optional for anonymous).
 * @returns The newly created booking object.
 * @throws Error if event/seats not found, event not published, seats not reserved/available.
 */
export const createBooking = async (data: CreateBookingInput, userId?: string): Promise<Booking> => {
    // Destructure all potential fields from the input data
    const { eventId, quantity, seatIds, deliveryName, deliveryEmail, deliveryPhone } = data;

    // 1. Find the event and check availability/status
    const event = await findEventById(eventId, { ticketCategories: true }); // Include categories to get price
    if (!event) {
        throw new Error('Event not found');
    }
    if (event.status !== EventStatus.PUBLISHED) {
        throw new Error('Event is not currently available for booking');
    }

    // 2. Determine seats and calculate price
    let bookingSeatIds: string[];
    let calculatedQuantity: number;
    let totalPrice: number;

    if (seatIds && seatIds.length > 0) {
        // --- Seat-based Booking ---
        calculatedQuantity = seatIds.length;
        bookingSeatIds = seatIds;

        // Verify the specified seats are RESERVED (ideally by this user, if tracking) and belong to the event
        const seats = await prisma.seat.findMany({
            where: {
                id: { in: seatIds },
                eventId: eventId,
            },
        });

        if (seats.length !== seatIds.length) {
            throw new Error('One or more selected seats not found for this event.');
        }
        // Ensure seats are RESERVED. Status check should ideally happen during the atomic reservation step.
        // Here, we double-check before creating the booking.
        const unavailableSeats = seats.filter(s => s.status !== SeatStatus.RESERVED /* && s.reservedByUserId !== userId */);
        if (unavailableSeats.length > 0) {
            // If any seat is not reserved (e.g., timeout between selection and booking creation), fail the booking.
            // Release the other seats that *were* reserved.
             console.warn(`Booking attempt for event ${eventId} failed: Seats ${unavailableSeats.map(s=>s.id).join(', ')} were not in RESERVED state.`);
             // Attempt to release all originally intended seats to be safe
            await releaseSeats(eventId, seatIds, userId || 'system-booking-failure'); // Use a distinct identifier
            throw new Error(`Seats ${unavailableSeats.map(s => `${s.row}${s.number}`).join(', ')} are not currently reserved. Please try selecting again.`);
        }

        // Calculate price based on seats (assuming price is uniform or derivable, needs refinement)
        // For simplicity, use the first category's price. A real system might store price per seat or category link.
        const ticketCategory = event.ticketCategories[0]; // Find category relevant to the seats if needed, otherwise use a default/average
        if (!ticketCategory) {
             // Fallback or error if no pricing info available
            throw new Error('No ticket categories found for price calculation.');
        }
         // A more robust price calculation would sum the price of each selected seat, potentially fetched with the seat data
        totalPrice = seats.reduce((sum, seat) => sum + (ticketCategory.price), 0); // Example using first category price for all seats


    } else if (quantity && quantity > 0) {
        // --- Quantity-based Booking (General Admission style) ---
        calculatedQuantity = quantity;
        bookingSeatIds = []; // No specific seats

        // Check availability based on TicketCategory
        const ticketCategory = event.ticketCategories[0]; // Assuming booking against the first category
        if (!ticketCategory) {
            throw new Error('No ticket categories found for this event.');
        }
        const availableQty = ticketCategory.totalQty - ticketCategory.bookedQty;
        if (quantity > availableQty) {
            throw new Error(`Insufficient tickets available. Only ${availableQty} left.`);
        }
        totalPrice = ticketCategory.price * calculatedQuantity;

    } else {
        throw new Error('Invalid booking request: Must specify either seat IDs or quantity.');
    }

    // 3. Create the booking record within a transaction
    const booking = await prisma.$transaction(async (tx) => {
        // a. Create the booking record, including delivery details if provided
        const newBooking = await tx.booking.create({
            data: {
                eventId,
                quantity: calculatedQuantity,
                totalPrice,
                status: BookingStatus.PENDING,
                userId: userId, // Link to user if logged in
                deliveryName: deliveryName, // Store provided name
                deliveryEmail: deliveryEmail, // Store provided email
                deliveryPhone: deliveryPhone, // Store provided phone
            },
        });

        // b. Update seats to BOOKED status if seat-based
        if (bookingSeatIds.length > 0) {
            // Ensure we only update the seats that were part of this booking attempt
            const updateResult = await tx.seat.updateMany({
                where: {
                     id: { in: bookingSeatIds },
                     eventId: eventId,
                     status: SeatStatus.RESERVED // Critical: Only update if still RESERVED
                     // reservedByUserId: userId // Add if tracking user reservation
                },
                data: {
                    status: SeatStatus.BOOKED,
                    bookingId: newBooking.id, // Link seat to booking
                    reservedAt: null, // Clear reservation timestamp
                    // reservedByUserId: null, // Clear reservation user
                },
            });

            // If the number of updated seats doesn't match, it means some seats were lost between reservation and booking commit (race condition/timeout).
            if (updateResult.count !== bookingSeatIds.length) {
                 console.error(`Concurrency issue: Failed to update all ${bookingSeatIds.length} seats to BOOKED for booking ${newBooking.id}. Only ${updateResult.count} updated.`);
                // This requires rolling back the transaction, which $transaction does automatically on error.
                throw new Error('Failed to finalize booking due to seat status change. Please try again.');
            }

        } else {
            // c. Update booked quantity for the ticket category if quantity-based
            const ticketCategory = event.ticketCategories[0]; // Assuming first category
            if (ticketCategory) {
                 // Use atomic increment to prevent race conditions
                 await tx.ticketCategory.update({
                    where: { id: ticketCategory.id },
                    data: {
                        bookedQty: {
                            increment: calculatedQuantity,
                        },
                    },
                });
                // Verify available quantity after increment (optional, but safer)
                 const updatedCategory = await tx.ticketCategory.findUnique({ where: { id: ticketCategory.id }});
                 if (!updatedCategory || updatedCategory.bookedQty > updatedCategory.totalQty) {
                     throw new Error('Insufficient tickets available after update. Booking failed.'); // Rollback
                 }
            }
        }

        return newBooking;
    });

    // Schedule booking expiration check after successful transaction
    // In a real app, use a message queue or reliable job scheduler
    scheduleBookingTimeout(booking.id);
    console.log(`Booking ${booking.id} created. Timeout scheduled.`);

    return booking;
};

/**
 * Finds a booking by its ID.
 * @param id - The ID of the booking.
 * @param include - Optional relations to include.
 * @returns The booking object if found, otherwise null.
 */
export const findBookingById = async (id: string, include?: Prisma.BookingInclude): Promise<Booking | null> => {
    return prisma.booking.findUnique({
        where: { id },
        include: include || {
            event: { select: { id: true, title: true } },
            user: { select: { id: true, email: true, name: true } },
            seats: { // Include associated seats
                 select: { id: true, row: true, number: true, section: true },
                 orderBy: [{section: 'asc'}, {row: 'asc'}, {number: 'asc'}]
            }
        },
    });
};


/**
 * Submits the UTR number for a booking and updates status to PROCESSING.
 * @param bookingId - The ID of the booking.
 * @param utr - The Unique Transaction Reference number.
 * @returns The updated booking object.
 * @throws Error if booking not found or not in PENDING state or UTR already used.
 */
export const submitUtr = async (bookingId: string, utr: string): Promise<Booking> => {
    // Use transaction to ensure atomicity of check and update
    return prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findUnique({ where: { id: bookingId } });

        if (!booking) {
            throw new Error('Booking not found');
        }
        if (booking.status !== BookingStatus.PENDING) {
            throw new Error(`Booking status is ${booking.status}, cannot submit UTR.`);
        }

        // Check if UTR already exists (should be unique)
        const existingUtr = await tx.booking.findUnique({ where: { utr } });
        if (existingUtr && existingUtr.id !== bookingId) {
            // Handle potential duplicate UTR submission attempt
            console.warn(`Attempt to reuse UTR ${utr} for booking ${bookingId}, already used by ${existingUtr.id}`);
            throw new Error('This UTR number has already been used for another booking.');
        }

        return tx.booking.update({
            where: { id: bookingId },
            data: {
                utr: utr,
                status: BookingStatus.PROCESSING, // Move to processing state
            },
        });
    });
};

/**
 * Verifies or rejects a payment for a booking (Admin action).
 * Updates booking status to CONFIRMED or FAILED.
 * If FAILED, releases associated seats or decrements ticket category count.
 * @param bookingId - The ID of the booking.
 * @param approve - Boolean indicating whether to approve (true) or reject (false).
 * @returns The updated booking object.
 * @throws Error if booking not found or not in PROCESSING state.
 */
export const verifyPayment = async (bookingId: string, approve: boolean): Promise<Booking> => {
    const booking = await findBookingById(bookingId, { seats: { select: { id: true } } }); // Include seats
    if (!booking) {
        throw new Error('Booking not found');
    }
    // Allow verification if PENDING (e.g., instant payment methods) or PROCESSING (UTR submitted)
    if (booking.status !== BookingStatus.PROCESSING && booking.status !== BookingStatus.PENDING) {
        throw new Error(`Cannot verify payment for booking with status ${booking.status}.`);
    }

    const newStatus = approve ? BookingStatus.CONFIRMED : BookingStatus.FAILED;
    const paymentVerifiedAt = approve ? new Date() : null; // Record verification time only on approval


     // Transaction to update booking and potentially release resources on failure
    const updatedBooking = await prisma.$transaction(async (tx) => {
        const result = await tx.booking.update({
            where: { id: bookingId },
            data: {
                status: newStatus,
                paymentVerifiedAt: paymentVerifiedAt,
                 utr: booking.status === BookingStatus.PENDING && !approve ? 'N/A-FAILED' : booking.utr, // Mark UTR if failed before submission
            },
        });

        // If payment failed/rejected, release seats or decrement booked quantity
        if (!approve) {
             await releaseResourcesForFailedBooking(tx, booking);
        }

        return result;
    });

     // TODO: Trigger e-ticket generation and email sending if approved

    return updatedBooking;
};


/**
 * Finds bookings based on criteria (e.g., status, user ID).
 * @param options - Filtering and pagination options.
 * @returns An array of booking objects.
 */
export const findBookings = async (options?: {
    where?: Prisma.BookingWhereInput,
    orderBy?: Prisma.BookingOrderByWithRelationInput,
    skip?: number,
    take?: number,
    include?: Prisma.BookingInclude
}): Promise<Booking[]> => {
    return prisma.booking.findMany({
        ...options,
         include: options?.include || {
             event: {select: {id: true, title: true}},
             user: {select: {id: true, email: true}},
             seats: {select: {id: true, row: true, number: true, section: true}} // Include seats info
         },
        orderBy: options?.orderBy || { createdAt: 'desc' },
    });
};

/**
 * Handles booking cancellation.
 * @param bookingId - ID of the booking to cancel.
 * @param userId - ID of the user initiating cancellation (for permission check).
 * @returns The cancelled booking object.
 * @throws Error if booking not found, not cancellable, or user unauthorized.
 */
export const cancelBooking = async (bookingId: string, userId: string): Promise<Booking> => {
    return prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findUnique({
            where: { id: bookingId },
            include: { seats: { select: { id: true } } }
        });

        if (!booking) {
            throw new Error('Booking not found');
        }

        // Permission Check: Allow user who made booking or admin to cancel
        const isAdmin = (await tx.user.findUnique({ where: { id: userId }, select: { role: true } }))?.role === 'ADMIN';
        if (booking.userId !== userId && !isAdmin) {
            throw new Error('Forbidden: You are not authorized to cancel this booking.');
        }

        // Status Check: Allow cancellation only if PENDING or PROCESSING? (Depends on policy)
        if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.PROCESSING) {
            throw new Error(`Booking cannot be cancelled with status ${booking.status}.`);
        }

        // Update booking status to CANCELLED
        const cancelledBooking = await tx.booking.update({
            where: { id: bookingId },
            data: { status: BookingStatus.CANCELLED },
        });

        // Release associated resources
        await releaseResourcesForFailedBooking(tx, booking); // Reuse the resource release logic

        console.log(`Booking ${bookingId} cancelled by user ${userId}.`);
        return cancelledBooking;
    });
};

/**
 * Handles booking timeout. Finds PENDING bookings older than timeout and marks them as CANCELLED.
 * Releases associated resources.
 * Intended to be run by a scheduled job.
 * @returns Number of bookings timed out.
 */
export const handleBookingTimeouts = async (): Promise<number> => {
    const BOOKING_TIMEOUT_MINUTES = parseInt(process.env.BOOKING_TIMEOUT_MINUTES || '15', 10);
    const timeoutThreshold = new Date(Date.now() - BOOKING_TIMEOUT_MINUTES * 60 * 1000);

    const expiredBookings = await prisma.booking.findMany({
        where: {
            status: BookingStatus.PENDING,
            createdAt: {
                lt: timeoutThreshold,
            },
        },
        include: { seats: { select: { id: true } } } // Include seats to release
    });

    if (expiredBookings.length === 0) {
        return 0;
    }

    console.log(`Found ${expiredBookings.length} expired PENDING bookings to cancel.`);

    let cancelledCount = 0;
    for (const booking of expiredBookings) {
        try {
            await prisma.$transaction(async (tx) => {
                // Update status to CANCELLED
                await tx.booking.update({
                    where: { id: booking.id },
                    data: { status: BookingStatus.CANCELLED },
                });
                // Release resources
                await releaseResourcesForFailedBooking(tx, booking);
            });
            cancelledCount++;
            console.log(`Booking ${booking.id} cancelled due to timeout.`);
        } catch (error) {
            console.error(`Error cancelling expired booking ${booking.id}:`, error);
            // Decide how to handle partial failures - log, retry later?
        }
    }

    return cancelledCount;
};


// --- Helper Functions ---

/**
 * Releases seats or decrements ticket category quantity for a failed/cancelled booking.
 * Designed to be used within a transaction.
 * @param tx - Prisma transaction client.
 * @param booking - The booking object (must include seats relation if seat-based).
 */
async function releaseResourcesForFailedBooking(tx: Prisma.TransactionClient, booking: Booking & { seats: { id: string }[] }): Promise<void> {
    const seatIdsToRelease = booking.seats.map(s => s.id);

    if (seatIdsToRelease.length > 0) {
        // Release specific seats - ensure they were linked to *this* booking
        const result = await tx.seat.updateMany({
            where: {
                id: { in: seatIdsToRelease },
                eventId: booking.eventId,
                // status: SeatStatus.BOOKED, // Could be BOOKED or RESERVED depending on when failure occurs
                bookingId: booking.id, // Ensure we only release seats linked to this booking
            },
            data: {
                status: SeatStatus.AVAILABLE,
                bookingId: null, // Unlink from booking
                reservedAt: null,
            }
        });
        console.log(`Released ${result.count} seats for failed/cancelled booking ${booking.id}`);
    } else if (booking.quantity > 0) {
        // Decrement booked quantity for quantity-based booking
        // Find the relevant ticket category (assuming first for simplicity)
        const event = await tx.event.findUnique({
           where: { id: booking.eventId },
           include: { ticketCategories: true }
        });
        const ticketCategory = event?.ticketCategories[0];

        if (ticketCategory) {
             await tx.ticketCategory.update({
                where: { id: ticketCategory.id },
                data: {
                    bookedQty: {
                        decrement: booking.quantity,
                    },
                },
            });
            console.log(`Decremented booked quantity by ${booking.quantity} for failed/cancelled booking ${booking.id}`);
        } else {
            console.warn(`Could not find ticket category to decrement quantity for failed/cancelled booking ${booking.id}`);
        }
    }
}


// Placeholder for scheduling timeout - use a real scheduler in production
const timeouts = new Map<string, NodeJS.Timeout>();
function scheduleBookingTimeout(bookingId: string) {
     const BOOKING_TIMEOUT_MINUTES = parseInt(process.env.BOOKING_TIMEOUT_MINUTES || '15', 10);
     if (timeouts.has(bookingId)) {
         clearTimeout(timeouts.get(bookingId));
     }
     const timeoutId = setTimeout(async () => {
         try {
             console.log(`Checking timeout for booking ${bookingId}...`);
             const booking = await prisma.booking.findUnique({
                 where: { id: bookingId },
                 select: { status: true },
             });
             // Only cancel if it's still PENDING
             if (booking?.status === BookingStatus.PENDING) {
                 console.log(`Booking ${bookingId} timed out. Cancelling...`);
                 // Use a separate function to handle the cancellation logic including resource release
                 await handleBookingTimeoutCancellation(bookingId);
             } else {
                  console.log(`Booking ${bookingId} status is ${booking?.status}, not cancelling via direct timeout.`);
             }
         } catch (error) {
             console.error(`Error during timeout check for booking ${bookingId}:`, error);
         } finally {
             timeouts.delete(bookingId);
         }
     }, BOOKING_TIMEOUT_MINUTES * 60 * 1000);
     timeouts.set(bookingId, timeoutId);
}

// Separate function for timeout cancellation logic
async function handleBookingTimeoutCancellation(bookingId: string) {
     return prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findUnique({
            where: { id: bookingId },
            include: { seats: { select: { id: true } } }
        });

        if (!booking || booking.status !== BookingStatus.PENDING) {
            // Already processed or doesn't exist
            console.log(`Booking ${bookingId} no longer PENDING, timeout cancellation skipped.`);
            return;
        }

        // Update booking status to CANCELLED
        await tx.booking.update({
            where: { id: bookingId },
            data: { status: BookingStatus.CANCELLED },
        });

        // Release associated resources
        await releaseResourcesForFailedBooking(tx, booking);

        console.log(`Booking ${bookingId} cancelled due to timeout.`);
    });
}

// Job to run periodically (e.g., via cron or background worker)
export async function runScheduledJobs() {
    console.log("Running scheduled jobs...");
     try {
         const releasedCount = await handleBookingTimeouts();
         console.log(`Scheduled job: Cancelled ${releasedCount} expired bookings.`);
     } catch (error) {
         console.error("Error running scheduled booking timeout job:", error);
     }
     // Add other scheduled jobs here (e.g., release expired seat reservations)
     try {
         const expiredSeats = await releaseExpiredReservations(); // Call seat service function
         console.log(`Scheduled job: Released ${expiredSeats} expired seat reservations.`);
     } catch (error) {
         console.error("Error running scheduled seat reservation release job:", error);
     }

}

// Import releaseExpiredReservations from seat service
import { releaseExpiredReservations } from './seat.service';
