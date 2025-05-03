// src/services/adminService.ts
'use client';

import request from './api';

// Define types based on backend responses
interface UpiSetting {
    id: string;
    upiId: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface UpdateUpiResponse {
    message: string;
    setting: UpiSetting;
}

/**
 * Fetches the currently active UPI settings.
 * Requires Admin token.
 */
export const getUpiSettings = async (token: string): Promise<UpiSetting> => {
    if (!token) throw new Error('Authentication token is required.');
    return request<UpiSetting>('/admin/settings/upi', {
        headers: { 'Authorization': `Bearer ${token}` },
    });
};

/**
 * Updates the active UPI setting.
 * Requires Admin token.
 */
export const updateUpiSettings = async (upiId: string, token: string): Promise<UpdateUpiResponse> => {
    if (!token) throw new Error('Authentication token is required.');
    return request<UpdateUpiResponse>('/admin/settings/upi', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: { upiId },
    });
};

// Add other admin-related service functions here (e.g., getUserStats, manageUsers, etc.)
