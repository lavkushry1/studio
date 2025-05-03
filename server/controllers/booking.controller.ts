import { Request, Response } from 'express';
import * as bookingService from '../services/booking.service';
import { CreateBookingInput, SubmitUtrInput, SubmitUtrParams, VerifyPaymentInput, VerifyPaymentParams, GetBookingParams } from '../validation/schemas';
import { Prisma, BookingStatus } from '@prisma/client'; // For query types

/**
 * Creates a new booking.
 * POST /api/bookings
 * Can be accessed by authenticated users or anonymously depending on setup.
 */
export const createBooking = async (req: Request<object, object, CreateBookingInput>, res: Response) => {
  const userId = req.user?.userId; // Get user ID if authenticated

  try {
    // Pass full validated body (including optional delivery details) to service
    const booking = await bookingService.createBooking(req.body, userId);
    res.status(201).json(booking);
  } catch (error: any) {
    console.error('Create booking error:', error);
     if (error.message.includes('Insufficient tickets') || error.message.includes('not found') || error.message.includes('not currently available') || error.message.includes('not currently reserved') || error.message.includes('Invalid booking request')) {
        return res.status(400).json({ message: error.message });
    }
     if (error.message.includes('Failed to reserve all seats') || error.message.includes('seat status change')) { // Specific errors from reservation/booking service
         return res.status(409).json({ message: error.message }); // 409 Conflict
     }
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * Submits the UTR number for a pending booking.
 * POST /api/bookings/:bookingId/submit-utr
 * Accessible by the user who made the booking (or publicly if anonymous).
 */
export const submitUtr = async (req: Request<SubmitUtrParams, object, SubmitUtrInput>, res: Response) => {
    const { bookingId } = req.params;
    const { utr } = req.body;

     // Optional: Add authorization check - does the authenticated user own this booking?
     // const userId = req.user?.userId;
     // const bookingOwner = await bookingService.findBookingById(bookingId);
     // if (userId && bookingOwner?.userId !== userId) {
     //     return res.status(403).json({ message: 'Forbidden: You do not own this booking' });
     // }

    try {
        const updatedBooking = await bookingService.submitUtr(bookingId, utr);
        res.status(200).json(updatedBooking);
    } catch (error: any) {
        console.error(`Submit UTR error for booking ${bookingId}:`, error);
         if (error.message.includes('not found') || error.message.includes('status is') || error.message.includes('already been used')) {
            return res.status(400).json({ message: error.message });
        }
         if (error.message.includes('already been used')) { // More specific error code for unique constraint
             return res.status(409).json({ message: error.message });
         }
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Verifies or rejects a payment for a booking (Admin action).
 * POST /api/bookings/:bookingId/verify-payment
 * Requires Admin authentication.
 */
export const verifyPayment = async (req: Request<VerifyPaymentParams, object, VerifyPaymentInput>, res: Response) => {
    const { bookingId } = req.params;
    const { approve } = req.body;
    const adminUserId = req.user?.userId; // Get admin ID from authenticated request

     if (!adminUserId) {
         // Should be caught by middleware, but good safety check
         return res.status(401).json({ message: 'Admin user ID not found in request' });
     }

    try {
        const updatedBooking = await bookingService.verifyPayment(bookingId, approve, adminUserId);
        res.status(200).json(updatedBooking);
    } catch (error: any) {
         console.error(`Verify payment error for booking ${bookingId} by admin ${adminUserId}:`, error);
         if (error.message.includes('not found') || error.message.includes('Cannot verify payment')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Gets a single booking by ID.
 * GET /api/bookings/:bookingId
 * Requires authentication and authorization (user owns booking or is admin).
 */
export const getBookingById = async (req: Request<GetBookingParams>, res: Response) => {
    const { bookingId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    try {
        const booking = await bookingService.findBookingById(bookingId);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Authorization Check: Allow access if user owns the booking OR is an Admin
        if (userRole !== 'ADMIN' && booking.userId !== userId) {
             return res.status(403).json({ message: 'Forbidden: You do not have permission to view this booking' });
        }

        res.status(200).json(booking);
    } catch (error: any) {
        console.error(`Get booking by ID error for ${bookingId}:`, error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


/**
 * Gets a list of bookings.
 * GET /api/bookings
 * Requires authentication. Admins see all (with filters/search), users see their own.
 */
export const getAllBookings = async (req: Request, res: Response) => {
     if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const userId = req.user.userId;
    const userRole = req.user.role;
    const isAdminView = userRole === 'ADMIN';
    const { q, status, page: pageStr, limit: limitStr, sortBy, order } = req.query;


    try {
        const options: { where?: Prisma.BookingWhereInput, skip?: number, take?: number, orderBy?: Prisma.BookingOrderByWithRelationInput, q?: string, isAdminView: boolean } = { isAdminView };
        let where: Prisma.BookingWhereInput = {};

        // Filter by user unless the user is an Admin
        if (!isAdminView) {
            where = { userId: userId };
        }

        // Add filtering by status from query params (example)
        if (status && typeof status === 'string') {
             const validStatuses = Object.values(BookingStatus);
             if (validStatuses.includes(status as BookingStatus)) {
                 where = { ...where, status: status as BookingStatus };
             } else if (isAdminView && status.toUpperCase() !== 'ALL') {
                  // Admins might request an invalid status, return bad request
                 return res.status(400).json({ message: `Invalid status filter: ${status}` });
             } // Non-admins don't get an error for invalid status, it just defaults
        }

         // Apply search query only for admins
         if (isAdminView && q && typeof q === 'string') {
             options.q = q; // Pass search term to service layer
         }

        options.where = where;


        // Add pagination (example)
        const page = parseInt(pageStr as string) || 1;
        const limit = parseInt(limitStr as string) || 10;
        options.skip = (page - 1) * limit;
        options.take = limit;

         // Add sorting (example)
        const sortField = typeof sortBy === 'string' ? sortBy : 'createdAt';
        const sortOrder = order === 'asc' ? 'asc' : 'desc';
        if (['createdAt', 'totalPrice', 'status'].includes(sortField)) { // Allow sorting by specific fields
             options.orderBy = { [sortField]: sortOrder };
        }

        const bookings = await bookingService.findBookings(options);
        const totalCount = await bookingService.countBookings({ where: options.where, q: options.q, isAdminView: options.isAdminView });

        res.setHeader('X-Total-Count', totalCount.toString());
        res.setHeader('X-Current-Page', page.toString());
        res.setHeader('X-Per-Page', limit.toString());
        res.setHeader('X-Total-Pages', Math.ceil(totalCount / limit).toString());


        res.status(200).json(bookings);
    } catch (error: any) {
        console.error('Get all bookings error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// TODO: Add controller function for updating delivery details
// export const updateDeliveryDetails = async (req: Request, res: Response) => { ... };
