
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { Prisma } from '@prisma/client'; // Import Prisma types
// import { createClient } from 'redis'; // Uncomment if using Redis

// Load environment variables based on NODE_ENV
const envPath = process.env.NODE_ENV === 'production'
  ? path.resolve(__dirname, '../../.env.production') // Adjust path relative to dist/server
  : path.resolve(__dirname, '../../.env.development'); // Adjust path relative to server

dotenv.config({ path: envPath });

// --- Redis Client Setup (Optional) ---
// let redisClient: any = null;
// if (process.env.REDIS_URL) {
//     redisClient = createClient({ url: process.env.REDIS_URL });
//     redisClient.on('error', (err: Error) => console.error('Redis Client Error:', err));
//     redisClient.connect().then(() => console.log('Connected to Redis.')).catch((err: Error) => console.error('Redis connection failed:', err));
// } else {
//     console.warn('REDIS_URL not found in environment variables. Redis caching will be disabled.');
// }
// --- End Redis Client Setup ---


// Use Prisma Client from the shared lib folder
import { prisma } from '@/lib/prisma';

// Import routes
import authRoutes from './routes/auth'; // Import auth routes
import eventRoutes from './routes/events'; // Import event routes
import bookingRoutes from './routes/bookings'; // Import booking routes
import adminRoutes from './routes/admin'; // Import admin routes
import ticketRoutes from './routes/tickets'; // Import ticket routes
import teamRoutes from './routes/teams'; // Import team routes
import venueRoutes from './routes/venues'; // Import venue routes

// Import services for background jobs
import * as seatService from './services/seat.service';
import * as bookingService from './services/booking.service';


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
const RESERVATION_TIMEOUT_MINUTES = parseInt(process.env.SEAT_RESERVATION_TIMEOUT_MINUTES || '15', 10);
const BOOKING_TIMEOUT_MINUTES = parseInt(process.env.BOOKING_TIMEOUT_MINUTES || '15', 10);


// Middleware
app.use(cors()); // Enable CORS for all origins (adjust in production)
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// --- Basic Caching Middleware Placeholder (Implement actual logic) ---
// const cacheMiddleware = (duration: number) => {
//   return async (req: Request, res: Response, next: NextFunction) => {
//     if (!redisClient || req.method !== 'GET') {
//       return next(); // Skip cache for non-GET or if Redis is disabled
//     }
//     const key = `__express__${req.originalUrl || req.url}`;
//     try {
//       const cachedBody = await redisClient.get(key);
//       if (cachedBody) {
//         res.setHeader('X-Cache', 'HIT');
//         res.setHeader('Content-Type', 'application/json');
//         res.send(cachedBody);
//         return;
//       } else {
//         res.setHeader('X-Cache', 'MISS');
//         // Capture response to cache it later
//         const originalSend = res.send;
//         res.send = (body: any): Response<any> => {
//           if (res.statusCode >= 200 && res.statusCode < 300) {
//             redisClient.setEx(key, duration, JSON.stringify(body)).catch((err: Error) => console.error("Redis setEx error:", err));
//           }
//           return originalSend.call(res, body);
//         };
//         next();
//       }
//     } catch (err) {
//       console.error("Redis get error:", err);
//       next(); // Proceed without cache on error
//     }
//   };
// };
// --- End Caching Middleware Placeholder ---

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
// Example applying cache middleware to GET requests for events
// app.get('/api/events', cacheMiddleware(60), eventRoutes); // Cache for 60 seconds
app.use('/api/events', eventRoutes); // Mount event routes (includes seat routes now)
app.use('/api/bookings', bookingRoutes); // Mount booking routes
app.use('/api/admin', adminRoutes); // Mount admin routes
app.use('/api/tickets', ticketRoutes); // Mount ticket routes
app.use('/api/teams', teamRoutes); // Mount team routes
app.use('/api/venues', venueRoutes); // Mount venue routes

// Centralized Error Handling Middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[ERROR] ${err.stack}`);
  // Basic error handling - expand as needed
  // Add handling for specific Prisma errors if needed (e.g., unique constraint)
   if (err instanceof Prisma.PrismaClientKnownRequestError) {
       // Handle specific Prisma errors, e.g., P2002 for unique constraint
       if (err.code === 'P2002') {
          // Check if it's the UTR constraint
           if (err.meta?.target === 'Booking_utr_key') {
                return res.status(409).json({ message: `Conflict: This UTR number has already been used.` });
           }
            // Check if it's the UPI ID constraint
           if (err.meta?.target === 'UpiSetting_upiId_key') {
                 return res.status(409).json({ message: `Conflict: This UPI ID is already configured.` });
           }
            // Check if it's the QR Data constraint
            if (err.meta?.target === 'Ticket_qrData_key') {
                 console.error("Duplicate QR Data collision detected!"); // Serious issue if this happens
                 return res.status(500).json({ message: `Internal Error: Ticket identifier conflict.` });
           }
            // Check for Team unique constraints
            if (err.meta?.target === 'Team_name_key') {
                 return res.status(409).json({ message: `Conflict: A team with this name already exists.` });
            }
            if (err.meta?.target === 'Team_shortName_key') {
                 return res.status(409).json({ message: `Conflict: A team with this short name already exists.` });
            }
             // Check for Venue unique constraints
             if (err.meta?.target === 'Venue_name_key') {
                 return res.status(409).json({ message: `Conflict: A venue with this name already exists.` });
             }
          return res.status(409).json({ message: `Conflict: A record with the same unique value already exists.`, field: err.meta?.target });
       }
       // P2025: Record to update/delete not found
       if (err.code === 'P2025') {
            return res.status(404).json({ message: `Resource not found. ${err.meta?.cause || ''}` });
       }
       // Add other Prisma error codes as needed
   }

    // Handle custom errors thrown by services
     if (err.message.includes('not found') || err.message.includes('Invalid') || err.message.includes('Forbidden') || err.message.includes('Cannot') || err.message.includes('Insufficient') || err.message.includes('Failed to') || err.message.includes('already been used') || err.message.includes('already used')) { // Added 'already used'
        let statusCode = 400; // Default bad request
        if (err.message.includes('not found')) statusCode = 404;
        if (err.message.includes('Forbidden')) statusCode = 403;
        if (err.message.includes('Unauthorized')) statusCode = 401;
        if (err.message.includes('already been used') || err.message.includes('already used')) statusCode = 409; // Conflict for unique constraint like UTR or Ticket Used
        return res.status(statusCode).json({ message: err.message });
    }


  // Fallback for generic errors
  res.status(500).json({ message: 'Internal Server Error', error: err.message }); // Avoid sending stack in production
});

// Handle 404 Not Found for API routes
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ message: 'API endpoint not found' });
});


let backgroundJobIntervalId: NodeJS.Timeout | null = null;

async function startServer() {
  try {
    // Test database connection using Prisma
    console.log('Attempting to connect to database...');
    // Use DATABASE_URL from environment variables for connection
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is not set.');
    }
    if (process.env.DATABASE_URL.includes('mongodb+srv')) {
        console.log('Connecting to MongoDB Atlas...');
    } else {
        console.log('Connecting to local/other MongoDB instance...');
    }
    await prisma.$connect();
    console.log('Database connected successfully.');

    // Start background job for releasing expired reservations/bookings
    // IMPORTANT: Use a proper scheduler (e.g., node-cron) or external service in production
    const backgroundJobInterval = 1 * 60 * 1000; // Run every 1 minute
    backgroundJobIntervalId = setInterval(async () => {
        try {
            await bookingService.runScheduledJobs(); // Run all scheduled jobs defined in booking service
        } catch (error) {
            console.error("Error in background job runner:", error);
        }
    }, backgroundJobInterval);
    console.log(`Background job runner started. Interval: ${backgroundJobInterval / 1000} seconds.`);


    app.listen(port, () => {
      console.log(`Backend server listening on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('Required ENV VARS: DATABASE_URL, PORT, ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, ACCESS_TOKEN_EXPIRATION, REFRESH_TOKEN_EXPIRATION');
       console.log('Optional Email ENV VARS: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM');
       console.log('Optional Security ENV VARS: QR_CODE_SECRET');
       // console.log('Optional Redis ENV VAR: REDIS_URL'); // Log if Redis URL is expected
      console.log(`Seat Reservation Timeout: ${RESERVATION_TIMEOUT_MINUTES} minutes`);
      console.log(`Booking Timeout: ${BOOKING_TIMEOUT_MINUTES} minutes`);
    });
  } catch (error) {
    console.error('Failed to start server or connect to the database:', error);
    process.exit(1); // Exit if database connection fails
  } finally {
    // Graceful shutdown
    const shutdown = async (signal: string) => {
         console.log(`${signal} received. Shutting down server...`);
         // Clear intervals
         if (backgroundJobIntervalId) {
            clearInterval(backgroundJobIntervalId);
            console.log('Background job runner stopped.');
         }
         // Close Redis connection if exists
         // if (redisClient && redisClient.isOpen) {
         //     await redisClient.quit();
         //     console.log('Redis connection closed.');
         // }
         try {
             await prisma.$disconnect();
             console.log('Database connection closed.');
             // Add any other cleanup tasks here
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


startServer();

// Export the app instance for potential testing or extension
// export default app; // Uncomment if needed
