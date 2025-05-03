// server/routes/index.ts (Optional Central Router Setup)
// If you are mounting routes directly in server/index.ts, you don't need this file.
// If you prefer a central router, use this:

import express from 'express';
import authRoutes from './auth';
import eventRoutes from './events';
import bookingRoutes from './bookings';
import adminRoutes from './admin';
import ticketRoutes from './tickets'; // Import ticket routes
import teamRoutes from './teams'; // Import team routes
import venueRoutes from './venues'; // Import venue routes

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/bookings', bookingRoutes);
router.use('/admin', adminRoutes);
router.use('/tickets', ticketRoutes); // Mount ticket routes
router.use('/teams', teamRoutes); // Mount team routes
router.use('/venues', venueRoutes); // Mount venue routes

// Simple health check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});


export default router;
