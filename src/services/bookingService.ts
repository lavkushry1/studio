// src/services/bookingService.ts
'use client';

import request from './api';
import type { Booking, BookingStatus } from '@prisma/client'; // Import Booking type

// Define the structure expected by the create booking API endpoint
interface CreateBookingPayload {
    eventId: string;
    quantity?: number;
    seatIds?: string[];
    deliveryName?: string;
    deliveryEmail?: string;
    deliveryPhone?: string;
}

// Define Booking structure including relations if needed based on API response
interface BookingWithDetails extends Booking {
    event: { id: string; title: string; } | null;
    user: { id: string; email: string; name: string | null; } | null;
    seats: { id: string; row: string; number: number; section: string | null; }[];
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
 * Requires authentication token (user or admin).
 */
export const getBookingById = async (bookingId: string, token: string): Promise<BookingWithDetails> => {
    if (!token) throw new Error("Authentication is required to view booking details.");
    return request<BookingWithDetails>(`/bookings/${bookingId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
};

/**
 * Fetches a list of bookings for the current user.
 * Requires authentication token.
 */
export const getMyBookings = async (token: string, params?: Record<string, string>): Promise<BookingWithDetails[]> => {
     if (!token) throw new Error("Authentication is required to view bookings.");
    return request<BookingWithDetails[]>('/bookings', { // Assuming GET /bookings fetches user's bookings when authenticated
        headers: { 'Authorization': `Bearer ${token}` },
        params: params, // Pass any filter/pagination params
    });
};

/**
 * Fetches all bookings for admin view, with filtering and pagination.
 * Requires Admin authentication token.
 */
export const getAllBookingsForAdmin = async (
    token: string,
    params: Record<string, string> // Includes filters, search (q), pagination (page, limit), sorting (sortBy, order)
): Promise<{ bookings: BookingWithDetails[], totalCount: number, totalPages: number }> => {
    if (!token) throw new Error("Admin authentication is required.");

     const response = await fetch(`/api/bookings?${new URLSearchParams(params)}`, {
         headers: { 'Authorization': `Bearer ${token}` },
     });

     if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.message || 'Failed to fetch admin bookings');
     }

     const bookings = await response.json();
     const totalCount = parseInt(response.headers.get('X-Total-Count') || '0', 10);
     const totalPages = parseInt(response.headers.get('X-Total-Pages') || '1', 10);

     return { bookings, totalCount, totalPages };

    // Alternative using request helper (if it supports returning headers)
    // const response = await request<BookingWithDetails[]>('/bookings', {
    //     headers: { 'Authorization': `Bearer ${token}` },
    //     params: params,
    //     // Need a way for request helper to return headers
    // });
    // return response; // Adjust based on how headers are handled by `request`
};

/**
 * Verifies or rejects a booking payment (Admin action).
 * Requires Admin authentication token.
 */
export const verifyBookingPayment = async (bookingId: string, approve: boolean, token: string): Promise<BookingWithDetails> => {
     if (!token) throw new Error("Admin authentication is required.");
    return request<BookingWithDetails>(`/bookings/${bookingId}/verify-payment`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: { approve },
    });
};

// Add other booking-related service functions here if needed
// e.g., cancelBooking, getBookingStatus, etc.
