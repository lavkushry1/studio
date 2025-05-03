import express from 'express';
import * as bookingController from '../controllers/booking.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { CreateBookingSchema, SubmitUtrSchema, VerifyPaymentSchema, GetBookingSchema } from '../validation/schemas';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = express.Router();

// POST /api/bookings - Create a new booking (Authenticated users or anonymous)
// Note: authenticateToken is optional here if anonymous bookings are allowed.
// If anonymous, the controller needs to handle the case where req.user is undefined.
router.post('/', authenticateToken, validateRequest(CreateBookingSchema), bookingController.createBooking);

// GET /api/bookings - List bookings (User sees own, Admin sees all)
router.get('/', authenticateToken, bookingController.getAllBookings);

// GET /api/bookings/:bookingId - Get a specific booking (User owns or Admin)
router.get('/:bookingId', authenticateToken, validateRequest(GetBookingSchema), bookingController.getBookingById);

// POST /api/bookings/:bookingId/submit-utr - Submit UTR for payment verification
// Needs validation for params and body. Authentication might be optional depending on flow.
router.post('/:bookingId/submit-utr', validateRequest(SubmitUtrSchema), bookingController.submitUtr);

// POST /api/bookings/:bookingId/verify-payment - Admin verifies/rejects payment
// Requires Admin role. Needs validation for params and body.
router.post('/:bookingId/verify-payment', authenticateToken, requireAdmin, validateRequest(VerifyPaymentSchema), bookingController.verifyPayment);

// TODO: Add PUT/PATCH endpoint for updating delivery details if needed
// router.patch('/:bookingId/delivery-details', authenticateToken, validateRequest(UpdateDeliveryDetailsSchema), bookingController.updateDeliveryDetails);


export default router;
