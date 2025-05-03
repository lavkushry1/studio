import { Request, Response } from 'express';
import * as eventService from '../services/event.service';
import { CreateEventInput, UpdateEventInput, UpdateEventParams, GetEventParams, DeleteEventParams } from '../validation/schemas';
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
    const event = await eventService.createEvent(req.body, req.user.userId, req.user.role);
    res.status(201).json(event);
  } catch (error: any) {
    if (error.message.startsWith('Forbidden')) {
       return res.status(403).json({ message: error.message });
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
export const getAllEvents = async (req: Request, res: Response) => {
  const isAdminView = req.user?.role === UserRole.ADMIN; // Check if the viewer is an admin
  try {
    const options: { where?: Prisma.EventWhereInput, skip?: number, take?: number, orderBy?: Prisma.EventOrderByWithRelationInput } = {};

    // --- Filtering ---
    // Filter by status (allow admin to see all, others default to PUBLISHED)
    if (req.query.status) {
        if (isAdminView) {
            options.where = { ...options.where, status: req.query.status as EventStatus };
        } else if (req.query.status === EventStatus.PUBLISHED) {
             options.where = { ...options.where, status: EventStatus.PUBLISHED };
        } // Non-admins can only explicitly filter for PUBLISHED
    } else if (!isAdminView) {
        // Default filter for non-admins if no status query param
         options.where = { ...options.where, status: EventStatus.PUBLISHED };
    }

    // Filter by date range (example)
    if (req.query.startDate) {
       options.where = { ...options.where, date: { ...options.where?.date as Prisma.DateTimeFilter, gte: new Date(req.query.startDate as string) } };
    }
     if (req.query.endDate) {
       options.where = { ...options.where, date: { ...options.where?.date as Prisma.DateTimeFilter, lte: new Date(req.query.endDate as string) } };
    }
    // Filter by location (example - partial match)
    if (req.query.location) {
        options.where = { ...options.where, location: { contains: req.query.location as string, mode: 'insensitive' } };
    }

    // --- Pagination ---
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10; // Default 10 items per page
    options.skip = (page - 1) * limit;
    options.take = limit;

    // --- Sorting --- (Example: ?sortBy=date&order=desc)
    const sortBy = req.query.sortBy as string || 'date'; // Default sort by date
    const order = req.query.order as string || 'asc'; // Default order ascending
    if (['date', 'title', 'createdAt'].includes(sortBy)) { // Allow sorting by specific fields
         options.orderBy = { [sortBy]: order as Prisma.SortOrder };
    }


    const events = await eventService.findAllEvents(options, isAdminView);
    // TODO: Add count for pagination headers if needed
    // const totalEvents = await eventService.countEvents(options.where, isAdminView);
    // res.header('X-Total-Count', totalEvents.toString());
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
    const event = await eventService.findEventById(req.params.eventId);
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
    const updatedEvent = await eventService.updateEvent(req.params.eventId, req.body, req.user.userId, req.user.role);
    res.status(200).json(updatedEvent);
  } catch (error: any) {
    if (error.message === 'Event not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.startsWith('Forbidden')) {
         return res.status(403).json({ message: error.message });
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
