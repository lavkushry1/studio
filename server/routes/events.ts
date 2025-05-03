import express from 'express';
import * as eventController from '../controllers/event.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { CreateEventSchema, UpdateEventSchema, GetEventSchema, DeleteEventSchema } from '../validation/schemas';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware'; // Import authorizeRole
import { UserRole } from '@prisma/client'; // Import UserRole

const router = express.Router();

// Middleware to allow ORGANIZER or ADMIN for protected routes
const requireOrganizerOrAdmin = authorizeRole([UserRole.ORGANIZER, UserRole.ADMIN]);

// GET /api/events - List all events (Public, with filtering based on role in controller)
router.get('/', authenticateToken, eventController.getAllEvents); // Pass auth token to check role for filtering

// GET /api/events/:eventId - Get a single event (Public, with filtering based on role in controller)
router.get('/:eventId', authenticateToken, validateRequest(GetEventSchema), eventController.getEventById); // Pass auth token

// POST /api/events - Create a new event (Organizer or Admin only)
router.post('/', authenticateToken, requireOrganizerOrAdmin, validateRequest(CreateEventSchema), eventController.createEvent);

// PUT /api/events/:eventId - Update an event (Organizer or Admin only)
router.put('/:eventId', authenticateToken, requireOrganizerOrAdmin, validateRequest(UpdateEventSchema), eventController.updateEvent);

// DELETE /api/events/:eventId - Delete an event (Organizer or Admin only)
router.delete('/:eventId', authenticateToken, requireOrganizerOrAdmin, validateRequest(DeleteEventSchema), eventController.deleteEvent);

// TODO: Add image upload route if needed
// import upload from '../middleware/multer.middleware'; // Assuming multer setup
// router.post('/:eventId/image', authenticateToken, requireOrganizerOrAdmin, upload.single('eventImage'), eventController.uploadEventImage);

export default router;
