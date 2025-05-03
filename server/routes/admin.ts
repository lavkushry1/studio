import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import * as adminController from '../controllers/admin.controller'; // Import admin controller
import { UpdateUpiSettingsSchema } from '../validation/schemas'; // Import UPI settings schema

const router = express.Router();

// Example Admin Route: Get system stats (requires admin role)
// router.get('/stats', authenticateToken, requireAdmin, adminController.getStats);

// UPI Settings Management Routes
router.get('/settings/upi', authenticateToken, requireAdmin, adminController.getUpiSettings);
router.put('/settings/upi', authenticateToken, requireAdmin, validateRequest(UpdateUpiSettingsSchema), adminController.updateUpiSettings);


// Placeholder for other admin functionalities
router.get('/placeholder', authenticateToken, requireAdmin, (req, res) => {
    res.json({ message: 'Admin placeholder route accessed' });
});


export default router;
