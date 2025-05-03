import express from 'express';
import * as venueController from '../controllers/venue.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { CreateVenueSchema, UpdateVenueSchema, GetVenueSchema, DeleteVenueSchema, ListVenuesSchema } from '../validation/schemas';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware'; // Admins manage venues

const router = express.Router();

// GET /api/venues - List all venues (Publicly accessible, with filters)
router.get('/', validateRequest(ListVenuesSchema), venueController.getAllVenues);

// GET /api/venues/:venueId - Get a single venue by ID (Publicly accessible)
router.get('/:venueId', validateRequest(GetVenueSchema), venueController.getVenueById);

// POST /api/venues - Create a new venue (Admin only)
router.post('/', authenticateToken, requireAdmin, validateRequest(CreateVenueSchema), venueController.createVenue);

// PUT /api/venues/:venueId - Update a venue (Admin only)
router.put('/:venueId', authenticateToken, requireAdmin, validateRequest(UpdateVenueSchema), venueController.updateVenue);

// DELETE /api/venues/:venueId - Delete a venue (Admin only)
router.delete('/:venueId', authenticateToken, requireAdmin, validateRequest(DeleteVenueSchema), venueController.deleteVenue);

export default router;
