import express from 'express';
import * as teamController from '../controllers/team.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { CreateTeamSchema, UpdateTeamSchema, GetTeamSchema, DeleteTeamSchema } from '../validation/schemas';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware'; // Admins manage teams

const router = express.Router();

// GET /api/teams - List all teams (Publicly accessible)
router.get('/', teamController.getAllTeams);

// GET /api/teams/:teamId - Get a single team by ID (Publicly accessible)
router.get('/:teamId', validateRequest(GetTeamSchema), teamController.getTeamById);

// POST /api/teams - Create a new team (Admin only)
router.post('/', authenticateToken, requireAdmin, validateRequest(CreateTeamSchema), teamController.createTeam);

// PUT /api/teams/:teamId - Update a team (Admin only)
router.put('/:teamId', authenticateToken, requireAdmin, validateRequest(UpdateTeamSchema), teamController.updateTeam);

// DELETE /api/teams/:teamId - Delete a team (Admin only)
router.delete('/:teamId', authenticateToken, requireAdmin, validateRequest(DeleteTeamSchema), teamController.deleteTeam);

export default router;
