
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables based on NODE_ENV
const envPath = process.env.NODE_ENV === 'production'
  ? path.resolve(__dirname, '../../.env.production') // Adjust path relative to dist/server
  : path.resolve(__dirname, '../../.env.development'); // Adjust path relative to server

dotenv.config({ path: envPath });

// Use Prisma Client from the shared lib folder
import { prisma } from '@/lib/prisma';

// Import routes
import authRoutes from './routes/auth'; // Import auth routes
import eventRoutes from './routes/events'; // Import event routes
import bookingRoutes from './routes/bookings'; // Import booking routes
// import adminRoutes from './routes/admin'; // Keep for later

// --- Swagger Setup (Keep existing setup) ---
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs'; // Or use JSON
import fs from 'fs';

let swaggerDocument: any = null;
try {
    // Adjust path relative to the current file location (dist/server/index.js or server/index.ts)
    // It needs to go up two levels from dist/server or one level from server
    const swaggerFilePath = path.resolve(__dirname, '../../swagger.yaml');
    if (fs.existsSync(swaggerFilePath)) {
        swaggerDocument = YAML.load(swaggerFilePath);
        console.log('Swagger documentation loaded successfully.');
    } else {
         console.warn(`swagger.yaml not found at ${swaggerFilePath}. API docs will not be available.`);
    }
} catch (e) {
    console.error('Failed to load swagger.yaml:', e);
}
// --- End Swagger Setup ---


const app: Express = express();
const port = process.env.PORT || 3001; // Backend runs on a different port

// Middleware
app.use(cors()); // Enable CORS for all origins (adjust in production)
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Basic Logging Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  // Optional: Log request body for debugging (be careful with sensitive data)
  // if (Object.keys(req.body).length > 0) {
  //   console.log(' Body:', JSON.stringify(req.body));
  // }
  next();
});

// --- API Documentation Route ---
if (swaggerDocument) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    console.log(`API Documentation available at http://localhost:${port}/api-docs`);
}
// --- End API Documentation Route ---


// Simple health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes); // Mount auth routes
app.use('/api/events', eventRoutes); // Mount event routes (includes seat routes now)
app.use('/api/bookings', bookingRoutes); // Mount booking routes
// app.use('/api/admin', adminRoutes); // Uncomment when ready

// Centralized Error Handling Middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[ERROR] ${err.stack}`);
  // Basic error handling - expand as needed
  // Add handling for specific Prisma errors if needed (e.g., unique constraint)
   if (err instanceof Prisma.PrismaClientKnownRequestError) {
       // Handle specific Prisma errors, e.g., P2002 for unique constraint
       if (err.code === 'P2002') {
          return res.status(409).json({ message: `Conflict: A record with the same unique value already exists.`, field: err.meta?.target });
       }
       // P2025: Record to update/delete not found
       if (err.code === 'P2025') {
            return res.status(404).json({ message: `Resource not found. ${err.meta?.cause || ''}` });
       }
       // Add other Prisma error codes as needed
   }

  // Fallback for generic errors
  res.status(500).json({ message: 'Internal Server Error', error: err.message }); // Avoid sending stack in production
});

// Handle 404 Not Found for API routes
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ message: 'API endpoint not found' });
});


async function startServer() {
  try {
    // Test database connection using Prisma
    await prisma.$connect();
    console.log('Database connected successfully.');

    // Start background job for releasing expired seat reservations (basic example)
    // IMPORTANT: Use a proper scheduler (e.g., node-cron) or external service in production
    setInterval(async () => {
        try {
            await seatService.releaseExpiredReservations();
        } catch (error) {
            console.error("Error in background job releasing expired seats:", error);
        }
    }, 1 * 60 * 1000); // Run every 1 minute

    app.listen(port, () => {
      console.log(`Backend server listening on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('Required ENV VARS: DATABASE_URL, PORT, ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, ACCESS_TOKEN_EXPIRATION, REFRESH_TOKEN_EXPIRATION');
      console.log(`Seat Reservation Timeout: ${RESERVATION_TIMEOUT_MINUTES} minutes`);
    });
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    process.exit(1); // Exit if database connection fails
  } finally {
    // Graceful shutdown
    const shutdown = async (signal: string) => {
         console.log(`${signal} received. Shutting down server...`);
         try {
             await prisma.$disconnect();
             console.log('Database connection closed.');
             // Add any other cleanup tasks here
             // Clear intervals if needed
             // clearInterval(backgroundJobIntervalId);
         } catch (e) {
            console.error('Error during shutdown:', e);
         } finally {
             process.exit(0);
         }
    }

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }
}

// Import seat service here for background job
import * as seatService from './services/seat.service';
const RESERVATION_TIMEOUT_MINUTES = parseInt(process.env.SEAT_RESERVATION_TIMEOUT_MINUTES || '15', 10);

startServer();

// Export the app instance for potential testing or extension
// export default app; // Uncomment if needed
