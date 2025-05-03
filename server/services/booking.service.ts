import { prisma } from '@/lib/prisma';
import { Booking, BookingStatus, Prisma, EventStatus, Seat, SeatStatus } from '@prisma/client';
import { CreateBookingInput, SubmitUtrInput, VerifyPaymentInput } from '../validation/schemas';
import { findEventById } from './event.service'; // Import event service
import { releaseSeats } from './seat.service'; // Import seat service for releasing on failure/cancel

/**
 * Creates a new booking record, associating reserved seats.
 * Sets status to PENDING.
 * @param data - Booking creation data including seatIds or quantity.
 * @param userId - ID of the user making the booking (optional for anonymous).
 * @returns The newly created booking object.
 * @throws Error if event/seats not found, event not published, seats not reserved/available.
 */
export const createBooking = async (data: CreateBookingInput, userId?: string): Promise<Booking> => {
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
        const unavailableSeats = seats.filter(s => s.status !== SeatStatus.RESERVED /* && s.reservedByUserId !== userId */);
        if (unavailableSeats.length > 0) {
            // Important: Release any seats that *were* successfully reserved in the previous step but now can't be booked.
            // This scenario shouldn't happen often if reservation is atomic, but handles edge cases.
            await releaseSeats(eventId, seatIds, userId || 'system'); // Release all attempted seats on failure
            throw new Error(`Seats ${unavailableSeats.map(s => `${s.row}${s.number}`).join(', ')} are not currently reserved or available.`);
        }

        // Calculate price based on seats (assuming price is uniform or derivable, needs refinement)
        // For simplicity, use the first category's price. A real system might store price per seat or category link.
        const ticketCategory = event.ticketCategories[0];
        if (!ticketCategory) {
            throw new Error('No ticket categories found for price calculation.');
        }
        totalPrice = ticketCategory.price * calculatedQuantity;

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
        // a. Create the booking record
        const newBooking = await tx.booking.create({
            data: {
                eventId,
                quantity: calculatedQuantity,
                totalPrice,
                status: BookingStatus.PENDING,
                userId: userId, // Link to user if logged in
                deliveryName,
                deliveryEmail,
                deliveryPhone,
            },
        });

        // b. Update seats to BOOKED status if seat-based
        if (bookingSeatIds.length > 0) {
            await tx.seat.updateMany({
                where: { id: { in: bookingSeatIds }, eventId: eventId, status: SeatStatus.RESERVED },
                data: {
                    status: SeatStatus.BOOKED,
                    bookingId: newBooking.id, // Link seat to booking
                    reservedAt: null, // Clear reservation timestamp
                },
            });
        } else {
            // c. Update booked quantity for the ticket category if quantity-based
            const ticketCategory = event.ticketCategories[0]; // Assuming first category
            if (ticketCategory) {
                 await tx.ticketCategory.update({
                    where: { id: ticketCategory.id },
                    data: {
                        bookedQty: {
                            increment: calculatedQuantity,
                        },
                    },
                });
            }
        }

        return newBooking;
    });

     // TODO: Schedule booking expiration check (e.g., if payment isn't completed in X minutes)
     // scheduleBookingTimeout(booking.id);

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
 * @throws Error if booking not found or not in PENDING state.
 */
export const submitUtr = async (bookingId: string, utr: string): Promise<Booking> => {
    const booking = await findBookingById(bookingId);
    if (!booking) {
        throw new Error('Booking not found');
    }
    if (booking.status !== BookingStatus.PENDING) {
        throw new Error(`Booking status is ${booking.status}, cannot submit UTR.`);
    }

    // Check if UTR already exists (should be unique)
    const existingUtr = await prisma.booking.findUnique({where: { utr }});
    if (existingUtr && existingUtr.id !== bookingId) {
        // Handle potential duplicate UTR submission attempt
        console.warn(`Attempt to reuse UTR ${utr} for booking ${bookingId}, already used by ${existingUtr.id}`);
        throw new Error('This UTR number has already been used for another booking.');
    }


    return prisma.booking.update({
        where: { id: bookingId },
        data: {
            utr: utr,
            status: BookingStatus.PROCESSING, // Move to processing state
        },
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
    if (booking.status !== BookingStatus.PROCESSING) {
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
            },
        });

        // If payment failed/rejected, release seats or decrement booked quantity
        if (!approve) {
             const seatIdsToRelease = booking.seats.map(s => s.id);
             if (seatIdsToRelease.length > 0) {
                 // Release specific seats
                 await tx.seat.updateMany({
                     where: { id: { in: seatIdsToRelease }, eventId: booking.eventId, status: SeatStatus.BOOKED }, // Should be BOOKED if CONFIRMED was intended
                     data: {
                         status: SeatStatus.AVAILABLE,
                         bookingId: null, // Unlink from booking
                     }
                 });
                 console.log(`Released ${seatIdsToRelease.length} seats for failed booking ${bookingId}`);
             } else {
                 // Decrement booked quantity for quantity-based booking
                 const event = await tx.event.findUnique({
                    where: { id: booking.eventId },
                    include: { ticketCategories: true }
                 });
                 const ticketCategory = event?.ticketCategories[0]; // Assuming first category

                 if (ticketCategory) {
                      await tx.ticketCategory.update({
                         where: { id: ticketCategory.id },
                         data: {
                             bookedQty: {
                                 decrement: booking.quantity,
                             },
                         },
                     });
                     console.log(`Decremented booked quantity for failed booking ${bookingId}`);
                 } else {
                     console.warn(`Could not find ticket category to decrement quantity for failed booking ${bookingId}`);
                 }
             }
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

// TODO: Add function to handle booking cancellation
// export const cancelBooking = async (bookingId: string, userId: string): Promise<Booking> => { ... }
// This should check status, permissions, and call releaseSeats/decrement quantity.

// TODO: Add function for booking timeout handling
// export const handleBookingTimeout = async (bookingId: string): Promise<void> => { ... }
// This should change status to CANCELLED/FAILED and release resources.
