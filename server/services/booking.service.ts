import { prisma } from '@/lib/prisma';
import { Booking, BookingStatus, Prisma, EventStatus } from '@prisma/client';
import { CreateBookingInput, SubmitUtrInput, VerifyPaymentInput } from '../validation/schemas';
import { findEventById } from './event.service'; // Import event service

/**
 * Creates a new booking record.
 * Initially sets status to PENDING.
 * @param data - Booking creation data.
 * @param userId - ID of the user making the booking (optional for anonymous).
 * @returns The newly created booking object.
 * @throws Error if event not found, not published, or insufficient tickets.
 */
export const createBooking = async (data: CreateBookingInput, userId?: string): Promise<Booking> => {
    const { eventId, quantity, deliveryName, deliveryEmail, deliveryPhone } = data;

    // 1. Find the event and check availability/status
    const event = await findEventById(eventId, { ticketCategories: true }); // Include categories to get price later
    if (!event) {
        throw new Error('Event not found');
    }
    if (event.status !== EventStatus.PUBLISHED) {
        throw new Error('Event is not currently available for booking');
    }

    // TODO: Implement proper ticket category selection and quantity checks
    // For simplicity now, assume a single category or price calculation method
    // Example: Use the first category's price
    const ticketCategory = event.ticketCategories[0];
    if (!ticketCategory) {
        throw new Error('No ticket categories found for this event.');
    }

    const availableQty = ticketCategory.totalQty - ticketCategory.bookedQty;
    if (quantity > availableQty) {
        throw new Error(`Insufficient tickets available. Only ${availableQty} left.`);
    }

    const totalPrice = ticketCategory.price * quantity;

    // 2. Create the booking record within a transaction
    const booking = await prisma.$transaction(async (tx) => {
        // a. Create the booking record
        const newBooking = await tx.booking.create({
            data: {
                eventId,
                quantity,
                totalPrice,
                status: BookingStatus.PENDING,
                userId: userId, // Link to user if logged in
                deliveryName,
                deliveryEmail,
                deliveryPhone,
            },
        });

        // b. (Optional but recommended) Update the booked quantity for the ticket category
        await tx.ticketCategory.update({
            where: { id: ticketCategory.id },
            data: {
                bookedQty: {
                    increment: quantity,
                },
            },
        });

        return newBooking;
    });

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
        include: include || { event: true, user: {select: {id: true, email: true, name: true}} }, // Default include
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
 * @param bookingId - The ID of the booking.
 * @param approve - Boolean indicating whether to approve (true) or reject (false).
 * @returns The updated booking object.
 * @throws Error if booking not found or not in PROCESSING state.
 */
export const verifyPayment = async (bookingId: string, approve: boolean): Promise<Booking> => {
    const booking = await findBookingById(bookingId);
    if (!booking) {
        throw new Error('Booking not found');
    }
    if (booking.status !== BookingStatus.PROCESSING) {
        throw new Error(`Cannot verify payment for booking with status ${booking.status}.`);
    }

    const newStatus = approve ? BookingStatus.CONFIRMED : BookingStatus.FAILED;
    const paymentVerifiedAt = approve ? new Date() : null; // Record verification time only on approval


     // Transaction to update booking and potentially release tickets on failure
    const updatedBooking = await prisma.$transaction(async (tx) => {
        const result = await tx.booking.update({
            where: { id: bookingId },
            data: {
                status: newStatus,
                paymentVerifiedAt: paymentVerifiedAt,
            },
        });

        // If payment failed/rejected, decrement the booked quantity
        if (!approve) {
             const event = await tx.event.findUnique({
                where: { id: booking.eventId },
                include: { ticketCategories: true }
            });
            const ticketCategory = event?.ticketCategories[0]; // Assuming single category for simplicity

            if (ticketCategory) {
                 await tx.ticketCategory.update({
                    where: { id: ticketCategory.id },
                    data: {
                        bookedQty: {
                            decrement: booking.quantity,
                        },
                    },
                });
            } else {
                console.warn(`Could not find ticket category to decrement quantity for failed booking ${bookingId}`);
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
         include: options?.include || { event: {select: {id: true, title: true}}, user: {select: {id: true, email: true}} },
        orderBy: options?.orderBy || { createdAt: 'desc' },
    });
};
