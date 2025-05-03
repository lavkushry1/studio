// src/services/paymentService.ts
'use client';

import request from './api';

// Define types based on backend responses
interface UpiSetting {
    id: string;
    upiId: string;
    isActive: boolean;
    // Add other fields if needed
}

/**
 * Fetches the currently active UPI ID (VPA).
 * This endpoint might be public or require admin auth depending on backend setup.
 * Assuming public for checkout use case.
 */
export const getActiveUpiId = async (): Promise<string> => {
    try {
        // Assuming the admin endpoint returns the full setting object,
        // but we only need the upiId for the public checkout flow.
        // A dedicated public endpoint `/payment/upi-details` might be better.
        // For now, using the admin endpoint (ensure it's readable without auth if needed).
        const setting = await request<UpiSetting>('/admin/settings/upi'); // Using admin endpoint
        if (!setting || !setting.isActive) {
            // Fallback or throw error if no active setting found
            console.error("No active UPI setting found.");
            throw new Error("Payment configuration error.");
        }
        return setting.upiId;
    } catch (error) {
        console.error("Failed to fetch active UPI ID:", error);
         // Check if it's a 404 error (no setting configured)
         if (error instanceof Error && error.message.includes('404')) {
             throw new Error("UPI payment is not configured.");
         }
        throw new Error("Could not retrieve payment details."); // Generic error for frontend
    }
};

// Add other payment-related functions here if needed
// e.g., generating QR code data URL (if done client-side, though backend is better)
// Note: QR code generation is handled client-side in the checkout component using the fetched UPI ID.

