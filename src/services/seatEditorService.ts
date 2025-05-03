// Service for frontend components interacting with seat layout and event data
import request from './api';
import type { Seat, Event, SeatStatus } from '@prisma/client'; // Use Prisma types

// Interface matching the backend expectation for seat definitions
interface SeatDefinitionPayload {
    row: string;
    number: number;
    section?: string;
    status?: SeatStatus;
}

// Fetch basic event data (needed for context in editor)
export const getEventById = async (eventId: string, token: string): Promise<Event> => {
    if (!token) throw new Error('Authentication token is required.');
    return request<Event>(`/events/${eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
};

// Fetch the current seat map for an event
// Added options parameter, e.g., to fetch all statuses for the editor
export const getSeatMapForEvent = async (eventId: string, token: string, options?: { showAll?: boolean }): Promise<Seat[]> => {
     if (!token) throw new Error('Authentication token is required.');
     const params: Record<string, string> = {};
     if (options?.showAll) {
         // If backend supports a query param like `?status=all` or similar to bypass default filters
         // params.showAll = 'true'; // Example, adjust based on backend implementation
     }
    return request<Seat[]>(`/events/${eventId}/seats`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: params,
    });
};

// Update the entire seat layout for an event
export const updateSeatLayout = async (eventId: string, seats: SeatDefinitionPayload[], token: string): Promise<{ message: string }> => {
    if (!token) throw new Error('Authentication token is required.');
    return request<{ message: string }>(`/events/${eventId}/seats`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: { seats }, // Backend expects { seats: [...] }
    });
};

// Reserve seats
export const reserveSeats = async (eventId: string, seatIds: string[], token: string): Promise<{ message: string; reservedSeats: string[] }> => {
     if (!token) throw new Error('Authentication token is required.');
    return request<{ message: string; reservedSeats: string[] }>(`/events/${eventId}/seats/reserve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: { seatIds },
    });
}

// Release seats
export const releaseSeats = async (eventId: string, seatIds: string[], token: string): Promise<{ message: string }> => {
     if (!token) throw new Error('Authentication token is required.');
    return request<{ message: string }>(`/events/${eventId}/seats/release`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: { seatIds },
    });
}
