import { Request, Response } from 'express';
import * as seatService from '../services/seat.service';
import { UpdateSeatLayoutInput, UpdateSeatLayoutParams, ReserveSeatsInput, ReserveSeatsParams, ReleaseSeatsInput, ReleaseSeatsParams, GetSeatMapParams, GetSeatMapQuery, ReserveSeatsSchema, ReleaseSeatsSchema } from '../validation/schemas';
import { UserRole } from '@prisma/client';

// Export schemas for use in the router
export { ReserveSeatsSchema, ReleaseSeatsSchema };

/**
 * Gets the seat map for a specific event.
 * GET /api/events/:eventId/seats
 * Publicly accessible or Authenticated.
 */
export const getSeatMap = async (req: Request<GetSeatMapParams, object, object, GetSeatMapQuery>, res: Response) => {
    const { eventId } = req.params;
    const filters = req.query; // Contains optional section, status filters

    try {
        const seats = await seatService.getSeatMapForEvent(eventId, filters);
        res.status(200).json(seats);
    } catch (error: any) {
        console.error(`Error getting seat map for event ${eventId}:`, error);
        if (error.message === 'Event not found') {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Updates the entire seat layout for an event.
 * PUT /api/events/:eventId/seats
 * Requires ORGANIZER or ADMIN role.
 */
export const updateSeatLayout = async (req: Request<UpdateSeatLayoutParams, object, UpdateSeatLayoutInput>, res: Response) => {
    const { eventId } = req.params;
    const { seats } = req.body;

    // User role check is handled by middleware (requireOrganizerOrAdmin)

    try {
        const result = await seatService.updateEventSeatLayout(eventId, seats, req.user!.userId, req.user!.role as UserRole);
        res.status(200).json({ message: `Seat layout updated successfully for event ${eventId}. ${result.createdCount} created, ${result.updatedCount} updated, ${result.deletedCount} deleted.` });
    } catch (error: any) {
        console.error(`Error updating seat layout for event ${eventId}:`, error);
        if (error.message.startsWith('Forbidden')) {
            return res.status(403).json({ message: error.message });
        }
        if (error.message === 'Event not found') {
            return res.status(404).json({ message: error.message });
        }
         if (error.message.startsWith('Cannot modify layout')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Reserves a list of seats for an event during the booking process.
 * POST /api/events/:eventId/seats/reserve
 * Requires authentication.
 */
export const reserveSeats = async (req: Request<ReserveSeatsParams, object, ReserveSeatsInput>, res: Response) => {
    const { eventId } = req.params;
    const { seatIds } = req.body;
    const userId = req.user!.userId; // User must be authenticated

    try {
        const reservationResult = await seatService.reserveSeats(eventId, seatIds, userId);
        res.status(200).json({
            message: 'Seats reserved successfully.',
            reservedSeats: reservationResult.reservedSeats, // Send back IDs of successfully reserved seats
            // reservationId: reservationResult.reservationId, // If using reservation groups
        });
    } catch (error: any) {
        console.error(`Error reserving seats for event ${eventId}:`, error);
        if (error.message.includes('not found') || error.message.includes('not available') || error.message.includes('already reserved/booked')) {
            // Return specific error message and potentially which seats failed
            return res.status(409).json({ message: error.message }); // 409 Conflict
        }
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Releases a list of reserved seats for an event.
 * POST /api/events/:eventId/seats/release
 * Triggered by booking timeout or cancellation. Requires careful authorization.
 */
export const releaseSeats = async (req: Request<ReleaseSeatsParams, object, ReleaseSeatsInput>, res: Response) => {
    const { eventId } = req.params;
    const { seatIds } = req.body;
    const userId = req.user!.userId; // User must be authenticated

    // TODO: Add strict authorization: Only the user who reserved, an admin, or the system (via internal mechanism) should be able to release.
    // This might involve checking the 'reservedBy' field if added to the Seat model or using a reservation ID.
    // For now, we assume the authenticated user is performing an action related to their reservation.

    try {
        await seatService.releaseSeats(eventId, seatIds, userId); // Pass userId for potential validation
        res.status(200).json({ message: 'Seats released successfully.' });
    } catch (error: any) {
        console.error(`Error releasing seats for event ${eventId}:`, error);
        if (error.message.includes('not found') || error.message.includes('not currently reserved') || error.message.includes('Cannot release seats reserved by another user')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// --- Utility/Admin Endpoints (Optional) ---

/**
 * Updates the status of specific seats (Admin/Organizer action).
 * PATCH /api/events/:eventId/seats/status
 * Requires ADMIN or ORGANIZER role.
 */
// export const updateSeatStatus = async (req: Request, res: Response) => {
//     const { eventId } = req.params;
//     const { seatIds, status } = req.body; // Expect an array of seat IDs and the new status

//     // Validate status against SeatStatus enum
//     // Validate seatIds array

//     try {
//         // await seatService.updateSeatStatus(eventId, seatIds, status, req.user!.userId, req.user!.role as UserRole);
//         res.status(200).json({ message: `Status updated for ${seatIds.length} seats.` });
//     } catch (error: any) {
//         // Handle errors (not found, forbidden, validation)
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// };
