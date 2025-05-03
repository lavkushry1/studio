import { Request, Response } from 'express';
import * as venueService from '../services/venue.service';
import { CreateVenueInput, UpdateVenueInput, UpdateVenueParams, GetVenueParams, DeleteVenueParams, ListVenuesQuery } from '../validation/schemas';
import { Prisma } from '@prisma/client';

/**
 * Creates a new venue.
 * POST /api/venues
 * Requires ADMIN role.
 */
export const createVenue = async (req: Request<object, object, CreateVenueInput>, res: Response) => {
    // Admin role check is handled by middleware
    try {
        const venue = await venueService.createVenue(req.body);
        res.status(201).json(venue);
    } catch (error: any) {
        if (error.message.includes('already exists')) {
             return res.status(409).json({ message: error.message });
        }
        console.error('Create venue error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Gets a list of all venues with optional filtering and search.
 * GET /api/venues
 * Publicly accessible.
 */
export const getAllVenues = async (req: Request<object, object, object, ListVenuesQuery>, res: Response) => {
    const { q, city, page: pageStr, limit: limitStr } = req.query || {};

    try {
        const page = parseInt(pageStr as string) || 1;
        const limit = parseInt(limitStr as string) || 10;
        const skip = (page - 1) * limit;

        const { venues, totalCount } = await venueService.searchVenues({ q, city }, { skip, take: limit });
        const totalPages = Math.ceil(totalCount / limit);

        res.setHeader('X-Total-Count', totalCount.toString());
        res.setHeader('X-Current-Page', page.toString());
        res.setHeader('X-Per-Page', limit.toString());
        res.setHeader('X-Total-Pages', totalPages.toString());

        res.status(200).json(venues);
    } catch (error: any) {
        console.error('Get all venues error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Gets a single venue by ID.
 * GET /api/venues/:venueId
 * Publicly accessible.
 */
export const getVenueById = async (req: Request<GetVenueParams>, res: Response) => {
    try {
        const venue = await venueService.findVenueById(req.params.venueId);
        if (!venue) {
            return res.status(404).json({ message: 'Venue not found' });
        }
        res.status(200).json(venue);
    } catch (error: any) {
        console.error('Get venue by ID error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Updates an existing venue.
 * PUT /api/venues/:venueId
 * Requires ADMIN role.
 */
export const updateVenue = async (req: Request<UpdateVenueParams, object, UpdateVenueInput>, res: Response) => {
    // Admin role check handled by middleware
    try {
        const updatedVenue = await venueService.updateVenue(req.params.venueId, req.body);
        res.status(200).json(updatedVenue);
    } catch (error: any) {
        if (error.message === 'Venue not found') {
            return res.status(404).json({ message: error.message });
        }
        if (error.message.includes('already exists')) {
             return res.status(409).json({ message: error.message });
        }
        console.error('Update venue error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Deletes a venue.
 * DELETE /api/venues/:venueId
 * Requires ADMIN role.
 */
export const deleteVenue = async (req: Request<DeleteVenueParams>, res: Response) => {
    // Admin role check handled by middleware
    try {
        await venueService.deleteVenue(req.params.venueId);
        res.status(204).send(); // No content on successful deletion
    } catch (error: any) {
        if (error.message === 'Venue not found') {
            return res.status(404).json({ message: error.message });
        }
         if (error.message.startsWith('Cannot delete venue')) { // Business rule error
             return res.status(400).json({ message: error.message });
         }
        console.error('Delete venue error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
