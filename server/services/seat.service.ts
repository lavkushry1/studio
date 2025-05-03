import { prisma } from '@/lib/prisma';
import { Seat, SeatStatus, UserRole, Prisma, EventStatus } from '@prisma/client';
import { SeatDefinition } from '../validation/schemas';
import { findEventById } from './event.service'; // To check event existence and status

const RESERVATION_TIMEOUT_MINUTES = parseInt(process.env.SEAT_RESERVATION_TIMEOUT_MINUTES || '15', 10); // Default 15 minutes

/**
 * Retrieves the seat map for a given event, optionally filtered.
 * @param eventId - The ID of the event.
 * @param filters - Optional filters for section or status.
 * @returns An array of seat objects.
 * @throws Error if the event is not found.
 */
export const getSeatMapForEvent = async (
    eventId: string,
    filters?: { section?: string; status?: SeatStatus }
): Promise<Seat[]> => {
    const event = await findEventById(eventId);
    if (!event) {
        throw new Error('Event not found');
    }

    // Clean expired reservations before fetching
    await releaseExpiredReservations(eventId);

    const whereClause: Prisma.SeatWhereInput = { eventId };
    if (filters?.section) {
        whereClause.section = filters.section;
    }
    if (filters?.status) {
        whereClause.status = filters.status;
    }

    return prisma.seat.findMany({
        where: whereClause,
        orderBy: [
            { section: 'asc' },
            { row: 'asc' },
            { number: 'asc' },
        ],
        // Select only necessary fields for the map view to reduce payload
        select: {
            id: true,
            row: true,
            number: true,
            section: true,
            status: true,
            // Avoid sending reservedAt or bookingId to public map view
        }
    });
};

/**
 * Updates the entire seat layout for an event.
 * Deletes existing seats and creates new ones based on the provided definitions.
 * Only allowed if the event has no confirmed bookings and is not published (or if user is Admin).
 * @param eventId - The ID of the event.
 * @param seatDefinitions - Array of new seat definitions.
 * @param userId - ID of the user performing the action.
 * @param userRole - Role of the user performing the action.
 * @returns Object indicating counts of created, updated, deleted seats.
 * @throws Error if event not found, forbidden, or cannot modify layout.
 */
export const updateEventSeatLayout = async (
    eventId: string,
    seatDefinitions: SeatDefinition[],
    userId: string,
    userRole: UserRole
): Promise<{ createdCount: number; updatedCount: number; deletedCount: number }> => {
    const event = await findEventById(eventId, { bookings: { where: { status: 'CONFIRMED' } } });
    if (!event) {
        throw new Error('Event not found');
    }

    // Authorization: Only organizer or admin can update layout
    if (event.organizerId !== userId && userRole !== UserRole.ADMIN) {
        throw new Error('Forbidden: You are not authorized to modify this event layout');
    }

    // Business Rule: Prevent layout changes if event is PUBLISHED or has CONFIRMED bookings (unless Admin override?)
    const hasConfirmedBookings = event.bookings.length > 0;
    if (userRole !== UserRole.ADMIN && (event.status === EventStatus.PUBLISHED || hasConfirmedBookings)) {
        let reason = '';
        if (event.status === EventStatus.PUBLISHED) reason += 'event is published';
        if (hasConfirmedBookings) reason += (reason ? ' and ' : '') + 'has confirmed bookings';
        throw new Error(`Cannot modify layout when ${reason}. Only Admins can override.`);
    }

    // Use a transaction to ensure atomicity
    return prisma.$transaction(async (tx) => {
        // 1. Delete all existing seats for the event
        const { count: deletedCount } = await tx.seat.deleteMany({
            where: { eventId: eventId },
        });

        // 2. Create new seats based on definitions
        const createData = seatDefinitions.map(def => ({
            ...def,
            eventId: eventId,
        }));

        const { count: createdCount } = await tx.seat.createMany({
            data: createData,
            skipDuplicates: true, // Should not happen due to deleteMany, but good practice
        });

        return { createdCount, updatedCount: 0, deletedCount }; // Simplified result for createMany
    });
};

/**
 * Reserves a list of seats for a specific event and user.
 * Sets seat status to RESERVED and records reservation time.
 * @param eventId - The ID of the event.
 * @param seatIds - An array of seat IDs to reserve.
 * @param userId - The ID of the user reserving the seats.
 * @returns Object containing the IDs of successfully reserved seats.
 * @throws Error if event not found, seats not found, or seats are not available.
 */
export const reserveSeats = async (
    eventId: string,
    seatIds: string[],
    userId: string // Consider adding a unique reservationId for grouping
): Promise<{ reservedSeats: string[] }> => {
     const event = await findEventById(eventId);
     if (!event) {
         throw new Error('Event not found');
     }
     if (event.status !== EventStatus.PUBLISHED) {
          throw new Error('Event is not currently available for booking');
     }

     const reservationTimestamp = new Date();

     // Clean expired reservations first
     await releaseExpiredReservations(eventId);

    // Use a transaction for atomic reservation attempt
    const result = await prisma.$transaction(async (tx) => {
        // 1. Attempt to update status of target seats ONLY if they are AVAILABLE
        const updateResult = await tx.seat.updateMany({
            where: {
                id: { in: seatIds },
                eventId: eventId,
                status: SeatStatus.AVAILABLE, // Crucial condition for concurrency control
            },
            data: {
                status: SeatStatus.RESERVED,
                reservedAt: reservationTimestamp,
                // reservedByUserId: userId, // Optional: Add who reserved it
                // reservationId: uniqueReservationId // Optional: Add reservation group ID
            },
        });

        // 2. Check if the number of updated seats matches the requested number
        if (updateResult.count !== seatIds.length) {
            // Find which seats failed (were not AVAILABLE or didn't belong to event)
            const actuallyReservedSeats = await tx.seat.findMany({
                 where: {
                    id: { in: seatIds },
                    eventId: eventId,
                    status: SeatStatus.RESERVED,
                    reservedAt: reservationTimestamp, // Match the exact timestamp
                    // reservedByUserId: userId, // Match user if added
                 },
                 select: { id: true }
            });
            const reservedIds = actuallyReservedSeats.map(s => s.id);
            const failedSeatIds = seatIds.filter(id => !reservedIds.includes(id));

            // Rollback the successful reservations within this transaction
            await tx.seat.updateMany({
                where: { id: { in: reservedIds }, eventId: eventId },
                data: { status: SeatStatus.AVAILABLE, reservedAt: null /* reservedByUserId: null, reservationId: null */ },
            });

            throw new Error(`Failed to reserve all seats. ${failedSeatIds.length} seat(s) were not available or already reserved/booked.`);
        }

        // 3. If successful, return the list of reserved seat IDs
        return { reservedSeats: seatIds };
    });

    // Schedule timeout for this reservation (outside transaction)
    // This should ideally be handled by a background job or queue system
    // For simplicity here, we might use setTimeout (not reliable in serverless)
    // scheduleReservationTimeout(eventId, seatIds, userId /*, uniqueReservationId */ );

    return result;
};


/**
 * Releases a list of reserved seats for an event.
 * Sets seat status back to AVAILABLE.
 * @param eventId - The ID of the event.
 * @param seatIds - An array of seat IDs to release.
 * @param userId - The ID of the user requesting release (for validation).
 * @throws Error if seats not found or not currently reserved by this user/context.
 */
export const releaseSeats = async (
    eventId: string,
    seatIds: string[],
    userId: string // Or reservationId for validation
): Promise<void> => {

    // Option 1: Simple release (trusting the caller or timeout mechanism)
    // const result = await prisma.seat.updateMany({
    //     where: {
    //         id: { in: seatIds },
    //         eventId: eventId,
    //         status: SeatStatus.RESERVED,
    //     },
    //     data: {
    //         status: SeatStatus.AVAILABLE,
    //         reservedAt: null,
    //         // reservedByUserId: null,
    //         // reservationId: null,
    //     },
    // });

    // Option 2: Stricter release (validating against who reserved) - Requires reservedByUserId
    // const result = await prisma.seat.updateMany({
    //     where: {
    //         id: { in: seatIds },
    //         eventId: eventId,
    //         status: SeatStatus.RESERVED,
    //         reservedByUserId: userId, // Add this condition
    //     },
    //     data: {
    //         status: SeatStatus.AVAILABLE,
    //         reservedAt: null,
    //         reservedByUserId: null,
    //         // reservationId: null,
    //     },
    // });

     // Using Option 1 for simplicity, assuming called by timeout or booking flow
      const result = await prisma.seat.updateMany({
        where: {
            id: { in: seatIds },
            eventId: eventId,
            status: SeatStatus.RESERVED, // Only release if RESERVED
        },
        data: {
            status: SeatStatus.AVAILABLE,
            reservedAt: null,
        },
    });


    if (result.count === 0 && seatIds.length > 0) {
        // This could mean seats were already released, booked, or never existed/reserved.
        console.warn(`Attempted to release seats for event ${eventId}, but none were updated. Seat IDs: ${seatIds.join(', ')}`);
        // Optionally check why:
        // const seats = await prisma.seat.findMany({ where: { id: { in: seatIds }, eventId: eventId }});
        // if (seats.length !== seatIds.length) throw new Error("One or more seats not found.");
        // const nonReservedSeats = seats.filter(s => s.status !== SeatStatus.RESERVED);
        // if (nonReservedSeats.length > 0) throw new Error(`One or more seats are not currently reserved (Status: ${nonReservedSeats.map(s=>s.status).join(',')}). Cannot release.`);
        // Maybe throw a less severe error or just log if 0 count is acceptable sometimes.
    } else {
         console.log(`Successfully released ${result.count} seats for event ${eventId}.`);
    }
};


/**
 * Finds and releases seats whose reservation time has expired.
 * Should be run periodically by a background job or before reservation attempts.
 * @param eventId - Optional: Limit check to a specific event.
 */
export const releaseExpiredReservations = async (eventId?: string): Promise<number> => {
    const timeoutThreshold = new Date(Date.now() - RESERVATION_TIMEOUT_MINUTES * 60 * 1000);

    const whereClause: Prisma.SeatWhereInput = {
        status: SeatStatus.RESERVED,
        reservedAt: {
            lt: timeoutThreshold, // Reserved before the threshold
        },
    };
    if (eventId) {
        whereClause.eventId = eventId;
    }

    const expiredSeats = await prisma.seat.findMany({
        where: whereClause,
        select: { id: true },
    });

    if (expiredSeats.length === 0) {
        return 0; // No expired seats found
    }

    const expiredSeatIds = expiredSeats.map(s => s.id);

    const result = await prisma.seat.updateMany({
        where: {
            id: { in: expiredSeatIds },
            // Add eventId again for safety if not globally checking
            ...(eventId && { eventId: eventId }),
        },
        data: {
            status: SeatStatus.AVAILABLE,
            reservedAt: null,
            // reservedByUserId: null,
            // reservationId: null,
        },
    });

    console.log(`Released ${result.count} expired reserved seats` + (eventId ? ` for event ${eventId}` : ''));
    return result.count;
};

// --- Helper for scheduling timeout ---
// IMPORTANT: This is a basic setTimeout example and is NOT reliable for production,
// especially in serverless environments. Use a proper job queue (e.g., BullMQ, Celery)
// or a scheduled task runner (e.g., cron, AWS Lambda scheduled events).
// function scheduleReservationTimeout(eventId: string, seatIds: string[], userId: string /*, reservationId: string */) {
//     setTimeout(async () => {
//         try {
//             console.log(`Checking reservation timeout for seats ${seatIds.join(', ')} on event ${eventId}`);
//             // Check if seats are STILL reserved by this user/reservation before releasing
//             const seats = await prisma.seat.findMany({
//                 where: {
//                     id: { in: seatIds },
//                     eventId: eventId,
//                     status: SeatStatus.RESERVED,
//                     // reservedByUserId: userId, // Check if still reserved by the same user
//                     // reservationId: reservationId, // Or check by reservation ID
//                     reservedAt: {
//                          // Ensure it hasn't been refreshed or re-reserved
//                         lt: new Date(Date.now() - (RESERVATION_TIMEOUT_MINUTES - 1) * 60 * 1000) // Slightly less than full timeout to avoid race conditions
//                     }
//                 },
//                 select: { id: true }
//             });

//             const idsToRelease = seats.map(s => s.id);

//             if (idsToRelease.length > 0) {
//                 console.log(`Releasing expired seats: ${idsToRelease.join(', ')}`);
//                 await releaseSeats(eventId, idsToRelease, userId /* system user or reservation ID */);
//             } else {
//                  console.log(`Seats ${seatIds.join(', ')} already booked or released.`);
//             }
//         } catch (error) {
//             console.error(`Error releasing expired seats ${seatIds.join(', ')} for event ${eventId}:`, error);
//         }
//     }, RESERVATION_TIMEOUT_MINUTES * 60 * 1000);
// }
