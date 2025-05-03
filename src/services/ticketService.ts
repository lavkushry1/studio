// src/services/ticketService.ts
'use client'; // Mark as client component if used directly in client components

import request from './api';
import type { Ticket } from '@prisma/client'; // Import Ticket type if needed

interface ValidationResponse {
    message: string;
    ticket?: { // Optional ticket details on success
        id: string;
        eventTitle: string;
        attendeeName?: string; // Example extra info
        status: 'VALID' | 'INVALID' | 'USED'; // Example status
    };
}

/**
 * Sends QR data to the backend for validation.
 * Requires authenticaiton token (e.g., scanner personnel).
 */
export const validateTicketApi = async (qrData: string, token: string): Promise<ValidationResponse> => {
    if (!token) throw new Error('Authentication token is required for validation.');

    // Define the actual backend endpoint for validation
    const validationEndpoint = '/tickets/validate'; // Adjust this to your actual endpoint

    return request<ValidationResponse>(validationEndpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: { qrData },
    });
};

/**
 * Downloads a specific ticket PDF.
 * Requires authentication token.
 * Note: This function initiates the download via the browser, it doesn't return the PDF data directly.
 */
export const downloadTicketPdf = (bookingId: string, ticketId: string, token: string): void => {
     if (!token) {
         console.error("Authentication token required for download.");
         // Optionally throw an error or show a message
         return;
     }
    // The backend endpoint handles sending the file
    const downloadUrl = `/api/bookings/${bookingId}/tickets/${ticketId}/download`;

     // Use fetch with Authorization header to get the blob, then create object URL
     fetch(downloadUrl, { headers: { 'Authorization': `Bearer ${token}` }})
        .then(response => {
            if (!response.ok) {
                 throw new Error(`Download failed: ${response.statusText}`);
             }
            // Extract filename from Content-Disposition header
             const disposition = response.headers.get('Content-Disposition');
             let filename = `ticket_${ticketId}.pdf`; // Default filename
             if (disposition && disposition.indexOf('attachment') !== -1) {
                 const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                 const matches = filenameRegex.exec(disposition);
                 if (matches != null && matches[1]) {
                     filename = matches[1].replace(/['"]/g, '');
                 }
             }
            return response.blob().then(blob => ({ blob, filename }));
        })
        .then(({ blob, filename }) => {
            // Create a link element, use it to download the blob, and remove it
             const link = document.createElement('a');
             link.href = window.URL.createObjectURL(blob);
             link.download = filename;
             document.body.appendChild(link);
             link.click();
             document.body.removeChild(link);
             window.URL.revokeObjectURL(link.href); // Clean up
        })
        .catch(error => {
            console.error('Ticket download failed:', error);
            // Show error toast to user
             // Example: toast({ title: "Download Failed", description: error.message, variant: "destructive" });
        });

    // Alternative: Simple window.open - might be blocked by pop-up blockers
    // window.open(`${downloadUrl}?token=${token}`, '_blank'); // If backend supports token via query param (less secure)
};
