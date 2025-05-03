import { Request, Response } from 'express';
import * as teamService from '../services/team.service';
import { CreateTeamInput, UpdateTeamInput, UpdateTeamParams, GetTeamParams, DeleteTeamParams } from '../validation/schemas';

/**
 * Creates a new team.
 * POST /api/teams
 * Requires ADMIN role.
 */
export const createTeam = async (req: Request<object, object, CreateTeamInput>, res: Response) => {
    // Admin role check is handled by middleware
    try {
        const team = await teamService.createTeam(req.body);
        res.status(201).json(team);
    } catch (error: any) {
        if (error.message.includes('already exists')) {
             return res.status(409).json({ message: error.message });
        }
        console.error('Create team error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Gets a list of all teams.
 * GET /api/teams
 * Publicly accessible.
 */
export const getAllTeams = async (req: Request, res: Response) => {
    try {
        // Add options for pagination/sorting if needed later
        const teams = await teamService.findAllTeams();
        res.status(200).json(teams);
    } catch (error: any) {
        console.error('Get all teams error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Gets a single team by ID.
 * GET /api/teams/:teamId
 * Publicly accessible.
 */
export const getTeamById = async (req: Request<GetTeamParams>, res: Response) => {
    try {
        const team = await teamService.findTeamById(req.params.teamId);
        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }
        res.status(200).json(team);
    } catch (error: any) {
        console.error('Get team by ID error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Updates an existing team.
 * PUT /api/teams/:teamId
 * Requires ADMIN role.
 */
export const updateTeam = async (req: Request<UpdateTeamParams, object, UpdateTeamInput>, res: Response) => {
    // Admin role check handled by middleware
    try {
        const updatedTeam = await teamService.updateTeam(req.params.teamId, req.body);
        res.status(200).json(updatedTeam);
    } catch (error: any) {
        if (error.message === 'Team not found') {
            return res.status(404).json({ message: error.message });
        }
        if (error.message.includes('already exists')) {
             return res.status(409).json({ message: error.message });
        }
        console.error('Update team error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Deletes a team.
 * DELETE /api/teams/:teamId
 * Requires ADMIN role.
 */
export const deleteTeam = async (req: Request<DeleteTeamParams>, res: Response) => {
    // Admin role check handled by middleware
    try {
        await teamService.deleteTeam(req.params.teamId);
        res.status(204).send(); // No content on successful deletion
    } catch (error: any) {
        if (error.message === 'Team not found') {
            return res.status(404).json({ message: error.message });
        }
         if (error.message.startsWith('Cannot delete team')) { // Business rule error
             return res.status(400).json({ message: error.message });
         }
        console.error('Delete team error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
