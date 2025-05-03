import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables based on NODE_ENV
const envPath = process.env.NODE_ENV === 'production'
  ? path.resolve(__dirname, '../../.env.production') // Adjust path relative to dist/server
  : path.resolve(__dirname, '../../.env.development'); // Adjust path relative to server

dotenv.config({ path: envPath });

import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth'; // Import authentication routes
import eventRoutes from './routes/events'; // Import event routes
import bookingRoutes from './routes/bookings'; // Import booking routes
import adminRoutes from './routes/admin'; // Import admin routes

// --- Swagger Setup (Optional but Recommended) ---
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs'; // Or use JSON
import fs from 'fs';

let swaggerDocument: any = null;
try {
    const swaggerFilePath = path.join(__dirname, '..', 'swagger.yaml'); // Assuming swagger.yaml is in the project root
    if (fs.existsSync(swaggerFilePath)) {
        swaggerDocument = YAML.load(swaggerFilePath);
        console.log('Swagger documentation loaded successfully.');
    } else {
         console.warn('swagger.yaml not found at project root. API docs will not be available.');
    }
} catch (e) {
    console.error('Failed to load swagger.yaml:', e);
}
// --- End Swagger Setup ---


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
  // Log request body for debugging (optional, be careful with sensitive data)
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


// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

// Simple health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Centralized Error Handling Middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[ERROR] ${err.stack}`);
  // Basic error handling - expand as needed
  if (err.message.includes('Validation failed')) {
      // Already handled by validateRequest middleware, but catch here just in case
      // The validateRequest middleware should ideally send the response itself.
      // This block might not be necessary if validateRequest always sends a response on error.
      return res.status(400).json({ message: 'Validation Error', details: err.message });
  }
   // Add handling for specific Prisma errors if needed (e.g., unique constraint)
   // if (err instanceof Prisma.PrismaClientKnownRequestError) { ... }

  res.status(500).json({ message: 'Internal Server Error', error: err.message }); // Avoid sending stack in production
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
    const shutdown = async (signal: string) => {
         console.log(`${signal} received. Shutting down server...`);
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
