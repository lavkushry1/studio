import express from 'express';
import * as eventController from '../controllers/event.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { CreateEventSchema, UpdateEventSchema, GetEventSchema, DeleteEventSchema } from '../validation/schemas';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware'; // Using requireAdmin for event management for simplicity

const router = express.Router();

// GET /api/events - List all events (Public)
router.get('/', eventController.getAllEvents);

// GET /api/events/:eventId - Get a single event (Public)
router.get('/:eventId', validateRequest(GetEventSchema), eventController.getEventById);

// POST /api/events - Create a new event (Admin only)
router.post('/', authenticateToken, requireAdmin, validateRequest(CreateEventSchema), eventController.createEvent);

// PUT /api/events/:eventId - Update an event (Admin only)
router.put('/:eventId', authenticateToken, requireAdmin, validateRequest(UpdateEventSchema), eventController.updateEvent);

// DELETE /api/events/:eventId - Delete an event (Admin only)
router.delete('/:eventId', authenticateToken, requireAdmin, validateRequest(DeleteEventSchema), eventController.deleteEvent);

export default router;
