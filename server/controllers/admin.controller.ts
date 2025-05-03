import { Request, Response } from 'express';
import * as upiService from '../services/upi.service';
import { UpdateUpiSettingsInput } from '../validation/schemas';

/**
 * Gets the active UPI settings.
 * GET /api/admin/settings/upi
 * Requires Admin authentication.
 */
export const getUpiSettings = async (req: Request, res: Response) => {
    try {
        const settings = await upiService.getActiveUpiSetting();
        if (!settings) {
            // Handle case where no setting exists yet (e.g., first setup)
            return res.status(404).json({ message: 'No active UPI setting found. Please configure one.' });
        }
        res.status(200).json(settings);
    } catch (error: any) {
        console.error('Error getting UPI settings:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Updates the active UPI settings. Deactivates old setting, creates/activates new one.
 * PUT /api/admin/settings/upi
 * Requires Admin authentication.
 */
export const updateUpiSettings = async (req: Request<object, object, UpdateUpiSettingsInput>, res: Response) => {
    const { upiId } = req.body;
    // Optional: Get admin ID from req.user if you want to log who made the change
    // const adminId = req.user?.userId;

    try {
        const newSetting = await upiService.updateActiveUpiSetting(upiId /*, adminId */);
        res.status(200).json({ message: 'UPI setting updated successfully', setting: newSetting });
    } catch (error: any) {
        console.error('Error updating UPI settings:', error);
         if (error.message.includes('Invalid UPI ID format')) { // Example custom error
             return res.status(400).json({ message: error.message });
         }
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Add other admin controller functions (stats, user management etc.) here later
// export const getStats = async (req: Request, res: Response) => { ... }

