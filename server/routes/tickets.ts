import express from 'express';
import * as ticketController from '../controllers/ticket.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { ValidateTicketSchema } from '../validation/schemas'; // Import schema
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware'; // Import auth middleware
import { UserRole } from '@prisma/client';

const router = express.Router();

// Middleware to allow specific roles (e.g., ADMIN, ORGANIZER, or a custom SCANNER role)
const requireValidatorRole = authorizeRole([UserRole.ADMIN, UserRole.ORGANIZER]); // Adjust roles as needed

// POST /api/tickets/validate - Validate a ticket using QR data
router.post(
    '/validate',
    authenticateToken,
    requireValidatorRole, // Ensure user has permission to validate
    validateRequest(ValidateTicketSchema),
    ticketController.validateTicket
);

// Add other ticket-related routes here if needed (e.g., resend ticket email)

export default router;
