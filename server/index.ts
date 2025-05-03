import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables based on NODE_ENV
const envPath = process.env.NODE_ENV === 'production'
  ? path.resolve(__dirname, '../.env.production')
  : path.resolve(__dirname, '../.env.development');

dotenv.config({ path: envPath });

import { PrismaClient } from '@prisma/client';
// import authRoutes from './routes/auth'; // Example route import
// import eventRoutes from './routes/events'; // Example route import
// import bookingRoutes from './routes/bookings'; // Example route import
// import adminRoutes from './routes/admin'; // Example route import

const prisma = new PrismaClient();
const app: Express = express();
const port = process.env.PORT || 3001; // Backend runs on a different port

// Middleware
app.use(cors()); // Enable CORS for all origins (adjust in production)
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Basic Logging Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/events', eventRoutes);
// app.use('/api/bookings', bookingRoutes);
// app.use('/api/admin', adminRoutes);

// Simple health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Centralized Error Handling Middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[ERROR] ${err.stack}`);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// Handle 404 Not Found for API routes
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ message: 'API endpoint not found' });
});


async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('Database connected successfully.');

    app.listen(port, () => {
      console.log(`Backend server listening on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    process.exit(1); // Exit if database connection fails
  } finally {
    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down server...');
      await prisma.$disconnect();
      console.log('Database connection closed.');
      process.exit(0);
    });
    process.on('SIGTERM', async () => {
      console.log('Shutting down server...');
      await prisma.$disconnect();
      console.log('Database connection closed.');
      process.exit(0);
    });
  }
}

startServer();
