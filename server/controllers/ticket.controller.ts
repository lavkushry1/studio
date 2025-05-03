import { Request, Response } from 'express';
import * as ticketService from '../services/ticket.service'; // Assuming ticket service exists
import { ValidateTicketInput } from '../validation/schemas'; // Import validation schema

/**
 * Validates a ticket using its QR data.
 * POST /api/tickets/validate
 * Requires authentication (e.g., Scanner role or Admin).
 */
export const validateTicket = async (req: Request<object, object, ValidateTicketInput>, res: Response) => {
    const { qrData } = req.body;
    const validationUserId = req.user?.userId; // Get ID of user performing validation

    if (!validationUserId) {
        // Should be caught by middleware, but good safety check
        return res.status(401).json({ message: 'Validation user ID not found in request' });
    }

    try {
        // 1. Verify QR Data Format/Signature (Service function does this)
        const ticketId = ticketService.verifyQrData(qrData);
        if (!ticketId) {
             return res.status(400).json({ message: 'Invalid or tampered QR code data.', status: 'INVALID' });
        }

        // 2. Validate Ticket Status in DB (Service function does this)
        const validatedTicket = await ticketService.validateTicket(ticketId, validationUserId);

        // 3. Return success response
        res.status(200).json({
             message: 'Validation Successful!',
             ticket: { // Return relevant ticket info
                 id: validatedTicket.id,
                 eventTitle: validatedTicket.event?.title || 'N/A', // Include event title if needed
                 // Add other details like seat info if necessary
                 status: 'VALID',
             },
        });

    } catch (error: any) {
        console.error(`Ticket validation error for data "${qrData.substring(0,20)}..." by user ${validationUserId}:`, error);

        // Handle specific error types
        if (error.message.includes('Ticket not found')) {
            return res.status(404).json({ message: error.message, status: 'NOT_FOUND' });
        }
        if (error.message.includes('Ticket already used')) {
            // Return a different status code? 409 Conflict or 200 OK with USED status?
            // Let's use 409 Conflict for already used tickets.
             return res.status(409).json({ message: error.message, status: 'USED' });
        }
        // Generic error
        res.status(500).json({ message: 'Internal Server Error during ticket validation.', status: 'ERROR' });
    }
};
