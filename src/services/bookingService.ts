// src/services/bookingService.ts
'use client';

import request from './api';
import type { Booking } from '@prisma/client'; // Import Booking type
// Assume CreateBookingInput is defined similarly to backend schema for frontend use
// Or import from a shared types definition if available

// Define the structure expected by the create booking API endpoint
interface CreateBookingPayload {
    eventId: string;
    quantity?: number;
    seatIds?: string[];
    deliveryName?: string;
    deliveryEmail?: string;
    deliveryPhone?: string;
}

/**
 * Creates a new booking.
 * Requires authentication token if the user is logged in.
 */
export const createBooking = async (data: CreateBookingPayload, token?: string | null): Promise<Booking> => {
    return request<Booking>('/bookings', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}, // Add token if available
        body: data,
    });
};

/**
 * Submits the UTR number for a booking.
 * May or may not require authentication depending on backend implementation.
 */
export const submitUtr = async (bookingId: string, utr: string, token?: string | null): Promise<Booking> => {
    return request<Booking>(`/bookings/${bookingId}/submit-utr`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}, // Add token if available
        body: { utr },
    });
};

/**
 * Fetches a specific booking by ID.
 * Requires authentication token.
 */
export const getBookingById = async (bookingId: string, token: string): Promise<Booking> => {
    if (!token) throw new Error("Authentication is required to view booking details.");
    return request<Booking>(`/bookings/${bookingId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
};

/**
 * Fetches a list of bookings for the current user.
 * Requires authentication token.
 */
export const getMyBookings = async (token: string, params?: Record<string, string>): Promise<Booking[]> => {
     if (!token) throw new Error("Authentication is required to view bookings.");
    return request<Booking[]>('/bookings', { // Assuming GET /bookings fetches user's bookings when authenticated
        headers: { 'Authorization': `Bearer ${token}` },
        params: params, // Pass any filter/pagination params
    });
};


// Add other booking-related service functions here if needed
// e.g., cancelBooking, getBookingStatus, etc.
