'use client'; // Can be used client-side

import request from './api';
import type { CreateEventInput, UpdateEventInput } from '@/server/validation/schemas'; // Use backend schema types
import type { Event, TicketCategory } from '@prisma/client'; // Use Prisma types if needed for response structure

// Define response types based on backend responses (align with swagger.yaml)
// Assuming EventResponse includes ticketCategories and organizer details as defined in swagger
type EventResponse = Event & {
    ticketCategories: TicketCategory[];
    organizer: { id: string; name: string | null; email: string; };
};
type EventsListResponse = EventResponse[];

// Fetch all events
export const getEvents = async (params?: Record<string, string>, token?: string): Promise<EventsListResponse> => {
    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return request<EventsListResponse>('/events', { params, headers });
};

// Fetch a single event by ID
export const getEventById = async (eventId: string, token?: string): Promise<EventResponse> => {
    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return request<EventResponse>(`/events/${eventId}`, { headers });
};

// Create a new event - Requires authentication token
export const createEvent = async (data: CreateEventInput, token: string): Promise<EventResponse> => {
    if (!token) {
        throw new Error('Authentication token is required to create an event.');
    }
    return request<EventResponse>('/events', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: data,
    });
};

// Update an existing event - Requires authentication token
export const updateEvent = async (eventId: string, data: UpdateEventInput, token: string): Promise<EventResponse> => {
     if (!token) {
        throw new Error('Authentication token is required to update an event.');
    }
    return request<EventResponse>(`/events/${eventId}`, {
        method: 'PUT',
         headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: data,
    });
};


// Delete an event - Requires authentication token
export const deleteEvent = async (eventId: string, token: string): Promise<void> => {
     if (!token) {
        throw new Error('Authentication token is required to delete an event.');
    }
    // Expecting 204 No Content on success, so return type is void
    await request<null>(`/events/${eventId}`, {
        method: 'DELETE',
         headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
};
