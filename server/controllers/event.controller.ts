import { Request, Response } from 'express';
import * as eventService from '../services/event.service';
import { CreateEventInput, UpdateEventInput, UpdateEventParams, GetEventParams, DeleteEventParams } from '../validation/schemas';
import { Prisma } from '@prisma/client'; // Import Prisma types if needed for query building

/**
 * Creates a new event.
 * POST /api/events
 * Requires authentication (and potentially specific role like ADMIN or ORGANIZER).
 */
export const createEvent = async (req: Request<object, object, CreateEventInput>, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const event = await eventService.createEvent(req.body, req.user.userId);
    res.status(201).json(event);
  } catch (error: any) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * Gets a list of all events.
 * GET /api/events
 * Publicly accessible, but can add filters via query params.
 */
export const getAllEvents = async (req: Request, res: Response) => {
  try {
    // TODO: Add parsing and validation for query parameters (filtering, pagination)
    const options: { where?: Prisma.EventWhereInput, skip?: number, take?: number } = {};
    // Example: Add filtering based on query params like ?status=PUBLISHED
    if (req.query.status) {
        options.where = { ...options.where, status: req.query.status as any };
    }

    const events = await eventService.findAllEvents(options);
    res.status(200).json(events);
  } catch (error: any) {
    console.error('Get all events error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * Gets a single event by ID.
 * GET /api/events/:eventId
 * Publicly accessible.
 */
export const getEventById = async (req: Request<GetEventParams>, res: Response) => {
  try {
    const event = await eventService.findEventById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
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
 * Requires authentication and authorization (user must be organizer or admin).
 */
export const updateEvent = async (req: Request<UpdateEventParams, object, UpdateEventInput>, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    // The service layer handles the authorization check (is user the organizer?)
    const updatedEvent = await eventService.updateEvent(req.params.eventId, req.body, req.user.userId);
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
 * Requires authentication and authorization (user must be organizer or admin).
 */
export const deleteEvent = async (req: Request<DeleteEventParams>, res: Response) => {
   if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    // The service layer handles the authorization check (is user the organizer?)
    await eventService.deleteEvent(req.params.eventId, req.user.userId);
    res.status(204).send(); // No content on successful deletion
  } catch (error: any) {
     if (error.message === 'Event not found') {
      return res.status(404).json({ message: error.message });
    }
     if (error.message.startsWith('Forbidden')) {
         return res.status(403).json({ message: error.message });
    }
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
