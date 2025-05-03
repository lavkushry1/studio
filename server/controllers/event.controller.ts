import { Request, Response } from 'express';
import * as eventService from '../services/event.service';
import { CreateEventInput, UpdateEventInput, UpdateEventParams, GetEventParams, DeleteEventParams, ListEventsQuery } from '../validation/schemas';
import { Prisma, UserRole, EventStatus } from '@prisma/client'; // Import Prisma types if needed for query building

/**
 * Creates a new event.
 * POST /api/events
 * Requires authentication (ORGANIZER or ADMIN role).
 */
export const createEvent = async (req: Request<object, object, CreateEventInput>, res: Response) => {
  // User must be authenticated by middleware before this point
  if (!req.user) {
    // This check is redundant if authenticateToken middleware is used, but safe to keep
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    // Pass user ID and role from authenticated request to the service layer for authorization
    // Also pass the validated request body which now includes optional teamId and venueId
    const event = await eventService.createEvent(req.body, req.user.userId, req.user.role);
    res.status(201).json(event);
  } catch (error: any) {
    if (error.message.startsWith('Forbidden')) {
       return res.status(403).json({ message: error.message });
    }
    // Handle specific validation errors like invalid ID
    if (error.message.includes('Invalid Team ID') || error.message.includes('Invalid Venue ID')) {
        return res.status(400).json({ message: error.message });
    }
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * Gets a list of all events.
 * GET /api/events
 * Publicly accessible, but filters unpublished events unless user is admin.
 * Supports filtering via query params.
 */
export const getAllEvents = async (req: Request<object, object, object, ListEventsQuery>, res: Response) => {
  const isAdminView = req.user?.role === UserRole.ADMIN; // Check if the viewer is an admin
  // Destructure all potential query params including teamId and venueId
  const { q, category, location, teamId, venueId, startDate, endDate, sortBy, order, page: pageStr, limit: limitStr } = req.query;

  try {
    const options: { where?: Prisma.EventWhereInput, skip?: number, take?: number, orderBy?: Prisma.EventOrderByWithRelationInput } = {};
    let where: Prisma.EventWhereInput = {};

    // --- Filtering ---
    // Filter by status (allow admin to see all, others default to PUBLISHED)
    if (req.query.status) {
        if (isAdminView) {
            where.status = req.query.status as EventStatus;
        } else if (req.query.status === EventStatus.PUBLISHED) {
             where.status = EventStatus.PUBLISHED;
        } // Non-admins can only explicitly filter for PUBLISHED
    } else if (!isAdminView) {
        // Default filter for non-admins if no status query param
         where.status = EventStatus.PUBLISHED;
    }

    // Filter by date range (example)
    if (startDate) {
       where.date = { ...where.date as Prisma.DateTimeFilter, gte: new Date(startDate as string) };
    }
     if (endDate) {
       where.date = { ...where.date as Prisma.DateTimeFilter, lte: new Date(endDate as string) };
    }
    // Filter by location (partial match)
    if (location) {
        where.location = { contains: location as string, mode: 'insensitive' };
    }
    // Filter by category (exact match, case-insensitive)
    if (category) {
        where.category = { equals: category, mode: 'insensitive' };
    }
     // Filter by teamId (exact match)
    if (teamId) {
        where.teamId = teamId as string;
    }
     // Filter by venueId (exact match)
    if (venueId) {
        where.venueId = venueId as string;
    }


    // Text Search (using 'q' query parameter)
    if (q) {
       // Signal to the service layer that a search is requested
       // We use an OR condition with 'contains' on multiple fields as a proxy
       // The service layer will convert this to a `_search` filter if a text index exists
        where.OR = [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { location: { contains: q, mode: 'insensitive' } },
            { category: { contains: q, mode: 'insensitive' } },
            // Optionally search by team name if 'q' is present? Requires relation join.
            // { team: { name: { contains: q, mode: 'insensitive' } } } // Example if relation is included
             { venue: { name: { contains: q, mode: 'insensitive' } } } // Search by venue name too
        ];
    }

    options.where = where;

    // --- Pagination ---
    const page = parseInt(pageStr as string) || 1;
    const limit = parseInt(limitStr as string) || 10; // Default 10 items per page
    options.skip = (page - 1) * limit;
    options.take = limit;

    // --- Sorting --- (Example: ?sortBy=date&order=desc)
    const sortField = sortBy || 'date'; // Default sort by date
    const sortOrder = order || 'asc'; // Default order ascending
    if (['date', 'title', 'createdAt', 'location', 'category'].includes(sortField)) { // Allow sorting by specific fields
         options.orderBy = { [sortField]: sortOrder as Prisma.SortOrder };
    }


    const events = await eventService.findAllEvents(options, isAdminView);
    const totalEvents = await eventService.countEvents(options.where, isAdminView); // Get total count based on filters

    res.setHeader('X-Total-Count', totalEvents.toString());
    res.setHeader('X-Current-Page', page.toString());
    res.setHeader('X-Per-Page', limit.toString());
    res.setHeader('X-Total-Pages', Math.ceil(totalEvents / limit).toString());

    res.status(200).json(events);
  } catch (error: any) {
    console.error('Get all events error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * Gets a single event by ID.
 * GET /api/events/:eventId
 * Publicly accessible, but might hide DRAFT/CANCELLED for non-admins.
 */
export const getEventById = async (req: Request<GetEventParams>, res: Response) => {
  const isAdminView = req.user?.role === UserRole.ADMIN;
  try {
    // Include team and venue relations when fetching single event
    const event = await eventService.findEventById(req.params.eventId, { ticketCategories: true, organizer: true, team: true, venue: true });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Hide non-published events from non-admins
    if (!isAdminView && event.status !== EventStatus.PUBLISHED) {
        return res.status(404).json({ message: 'Event not found' }); // Treat as not found for regular users
    }

    res.status(200).json(event);
  } catch (error: any) {
    console.error('Get event by ID error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * Updates an existing event.
 * PUT /api/events/:eventId
 * Requires authentication (ORGANIZER or ADMIN role).
 */
export const updateEvent = async (req: Request<UpdateEventParams, object, UpdateEventInput>, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    // Pass user ID and role from authenticated request to the service layer for authorization
    // Pass validated request body which now includes optional teamId and venueId
    const updatedEvent = await eventService.updateEvent(req.params.eventId, req.body, req.user.userId, req.user.role);
    res.status(200).json(updatedEvent);
  } catch (error: any) {
    if (error.message === 'Event not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.startsWith('Forbidden')) {
         return res.status(403).json({ message: error.message });
    }
     // Handle specific validation errors like invalid ID
     if (error.message.includes('Invalid Team ID') || error.message.includes('Invalid Venue ID')) {
        return res.status(400).json({ message: error.message });
    }
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * Deletes an event.
 * DELETE /api/events/:eventId
 * Requires authentication (ORGANIZER or ADMIN role).
 */
export const deleteEvent = async (req: Request<DeleteEventParams>, res: Response) => {
   if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
     // Pass user ID and role from authenticated request to the service layer for authorization
    await eventService.deleteEvent(req.params.eventId, req.user.userId, req.user.role);
    res.status(204).send(); // No content on successful deletion
  } catch (error: any) {
     if (error.message === 'Event not found') {
      return res.status(404).json({ message: error.message });
    }
     if (error.message.startsWith('Forbidden')) {
         return res.status(403).json({ message: error.message });
    }
     if (error.message.startsWith('Cannot delete event')) { // Specific business rule error
         return res.status(400).json({ message: error.message });
     }
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// TODO: Implement image upload controller if needed
// export const uploadEventImage = async (req: Request, res: Response) => { ... }
