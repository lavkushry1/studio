import { Request, Response } from 'express';
import * as bookingService from '../services/booking.service';
import * as ticketService from '../services/ticket.service'; // Import ticket service
import { CreateBookingInput, SubmitUtrInput, SubmitUtrParams, VerifyPaymentInput, VerifyPaymentParams, GetBookingParams, DownloadTicketParams } from '../validation/schemas'; // Added DownloadTicketParams
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
        // Include tickets relation to show ticket info
        const booking = await bookingService.findBookingById(bookingId, { tickets: { select: { id: true } } });
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

        // Include tickets relation in the findBookings call
        const includeRelations = {
             event: {select: {id: true, title: true}},
             user: {select: {id: true, email: true, name: true}},
             seats: {select: {id: true, row: true, number: true, section: true}},
             tickets: {select: {id: true}} // Include ticket IDs
        };
        options.include = includeRelations;


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

/**
 * Downloads the PDF for a specific ticket.
 * GET /api/bookings/:bookingId/tickets/:ticketId/download
 * Requires authentication and authorization (user owns booking or is admin).
 */
export const downloadTicket = async (req: Request<DownloadTicketParams>, res: Response) => {
    const { bookingId, ticketId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    try {
        // 1. Fetch the ticket and its booking to verify ownership and status
        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId },
            include: {
                booking: { select: { id: true, userId: true, status: true, event: { select: { title: true }} } },
            },
        });

        if (!ticket || ticket.bookingId !== bookingId) {
            return res.status(404).json({ message: 'Ticket not found or does not belong to this booking.' });
        }
        if (!ticket.booking) {
             return res.status(404).json({ message: 'Booking associated with ticket not found.' });
        }

        // 2. Authorization Check
        if (userRole !== 'ADMIN' && ticket.booking.userId !== userId) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to download this ticket.' });
        }

        // 3. Status Check (Only allow download for CONFIRMED bookings)
        if (ticket.booking.status !== BookingStatus.CONFIRMED) {
            return res.status(400).json({ message: `Cannot download ticket for booking with status ${ticket.booking.status}.` });
        }

        // 4. Generate the PDF (reuse PDF generation logic)
        // This part requires fetching full ticket/booking details again, ideally refactor PDF generation
        // to accept ticketId and generate on the fly or retrieve pre-generated PDF.

        // --- Placeholder PDF Generation (Replace with actual logic) ---
        // This assumes ticketService has a function like `generatePdfBufferForTicket(ticketId)`
        // For demonstration, we'll mock this. You need to implement the real generation.
        // const pdfBuffer = await ticketService.generatePdfBufferForTicket(ticketId);

        // Mock PDF Generation Start
         const fullTicketForPdf = await prisma.ticket.findUnique({
                where: { id: ticketId },
                include: {
                     booking: { include: { event: true, user: { select: { name: true } } } },
                     seat: true
                }
             });
         if (!fullTicketForPdf) throw new Error("Failed to refetch ticket details for PDF generation");
         const qrData = await QRCode.toDataURL(fullTicketForPdf.qrData);
         // NOTE: Using internal function directly - consider exposing via ticketService
         const { generatePdfTicketPdfkit } = require('../services/ticket.service');
         const pdfBuffer = await generatePdfTicketPdfkit(fullTicketForPdf, qrData);
         const filename = `Ticket_${ticket.booking.event.title.replace(/\s+/g, '_')}_${ticket.id.slice(-6)}.pdf`;
        // Mock PDF Generation End

        // 5. Send the PDF as a download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(pdfBuffer);

    } catch (error: any) {
        console.error(`Download ticket error for ticket ${ticketId}:`, error);
         if (error.message.includes('not found')) {
             return res.status(404).json({ message: error.message });
         }
        res.status(500).json({ message: 'Internal Server Error during ticket download.' });
    }
};


// TODO: Add controller function for updating delivery details
// export const updateDeliveryDetails = async (req: Request, res: Response) => { ... };
