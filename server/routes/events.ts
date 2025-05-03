import express from 'express';
import * as eventController from '../controllers/event.controller';
import * as seatController from '../controllers/seat.controller'; // Import seat controller
import { validateRequest } from '../middleware/validate.middleware';
import { CreateEventSchema, UpdateEventSchema, GetEventSchema, DeleteEventSchema, ListEventsSchema, UpdateSeatLayoutSchema, GetSeatMapSchema } from '../validation/schemas'; // Import Seat schemas
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware'; // Import authorizeRole
import { UserRole } from '@prisma/client'; // Import UserRole

const router = express.Router();

// Middleware to allow ORGANIZER or ADMIN for protected routes
const requireOrganizerOrAdmin = authorizeRole([UserRole.ORGANIZER, UserRole.ADMIN]);

// --- Event CRUD Routes ---
// GET /api/events - List all events (Public, with filtering based on role in controller)
router.get('/', authenticateToken, validateRequest(ListEventsSchema), eventController.getAllEvents); // Pass auth token, validate query

// GET /api/events/:eventId - Get a single event (Public, with filtering based on role in controller)
router.get('/:eventId', authenticateToken, validateRequest(GetEventSchema), eventController.getEventById); // Pass auth token

// POST /api/events - Create a new event (Organizer or Admin only)
router.post('/', authenticateToken, requireOrganizerOrAdmin, validateRequest(CreateEventSchema), eventController.createEvent);

// PUT /api/events/:eventId - Update an event (Organizer or Admin only)
router.put('/:eventId', authenticateToken, requireOrganizerOrAdmin, validateRequest(UpdateEventSchema), eventController.updateEvent);

// DELETE /api/events/:eventId - Delete an event (Organizer or Admin only)
router.delete('/:eventId', authenticateToken, requireOrganizerOrAdmin, validateRequest(DeleteEventSchema), eventController.deleteEvent);

// --- Seat Management Routes (Nested under Events) ---

// GET /api/events/:eventId/seats - Get the seat map for an event (Public or Authenticated)
router.get('/:eventId/seats', validateRequest(GetSeatMapSchema), seatController.getSeatMap);

// PUT /api/events/:eventId/seats - Update the entire seat layout (Organizer or Admin only)
router.put('/:eventId/seats', authenticateToken, requireOrganizerOrAdmin, validateRequest(UpdateSeatLayoutSchema), seatController.updateSeatLayout);

// POST /api/events/:eventId/seats/reserve - Reserve seats for booking (Authenticated user)
router.post('/:eventId/seats/reserve', authenticateToken, validateRequest(seatController.ReserveSeatsSchema), seatController.reserveSeats);

// POST /api/events/:eventId/seats/release - Release reserved seats (System/User action)
// Needs careful consideration for who can trigger this (e.g., booking timeout service, cancellation flow)
router.post('/:eventId/seats/release', authenticateToken, validateRequest(seatController.ReleaseSeatsSchema), seatController.releaseSeats);


// TODO: Add image upload route if needed
// import upload from '../middleware/multer.middleware'; // Assuming multer setup
// router.post('/:eventId/image', authenticateToken, requireOrganizerOrAdmin, upload.single('eventImage'), eventController.uploadEventImage);

export default router;
