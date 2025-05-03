import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Use shared Prisma client
import { findAllEvents, countEvents } from '@/server/services/event.service'; // Use server-side service
import { Prisma, EventStatus, UserRole } from '@prisma/client';
import { listEventsSchema } from '@/server/validation/schemas'; // Use backend Zod schema
import { verifyAccessToken } from '@/server/utils/jwt.utils'; // For checking admin role
import { createClient } from 'redis'; // Import Redis client

// --- Redis Client Setup (Consider moving to a shared lib/config) ---
let redisClient: any = null;
if (process.env.REDIS_URL) {
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on('error', (err: Error) => console.error('API Route Redis Client Error:', err));
    // Connect on demand or ensure connection before first use
} else {
    console.warn('API Route: REDIS_URL not found. Caching is disabled.');
}
// --- End Redis Client Setup ---

const CACHE_DURATION_SECONDS = 60; // Cache event list for 60 seconds

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const cacheKey = `events:${searchParams.toString()}`; // Generate unique key based on query params

    // --- Check Cache ---
    if (redisClient) {
        try {
            if (!redisClient.isOpen) await redisClient.connect(); // Ensure connected
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                console.log(`Cache HIT for key: ${cacheKey}`);
                const parsedData = JSON.parse(cachedData);
                // Reconstruct headers from cached data or assume defaults
                const headers = new Headers();
                headers.set('X-Cache', 'HIT');
                headers.set('X-Total-Count', parsedData.totalCount?.toString() || '0');
                headers.set('X-Current-Page', parsedData.currentPage?.toString() || '1');
                headers.set('X-Per-Page', parsedData.limit?.toString() || '10');
                headers.set('X-Total-Pages', parsedData.totalPages?.toString() || '1');
                return NextResponse.json(parsedData.events, { headers });
            }
             console.log(`Cache MISS for key: ${cacheKey}`);
             // Continue to fetch from DB if cache miss
        } catch (cacheError) {
            console.error(`Redis GET error for key ${cacheKey}:`, cacheError);
            // Proceed without cache if error occurs
        }
    }
    // --- End Cache Check ---


    // Validate query parameters using Zod schema
    const queryParams = Object.fromEntries(searchParams.entries());
    const validationResult = listEventsSchema.safeParse({ query: queryParams });

    if (!validationResult.success) {
        return NextResponse.json({ message: 'Invalid query parameters', errors: validationResult.error.errors }, { status: 400 });
    }

    const { q, category, location, startDate, endDate, status: statusQuery, sortBy, order, page, limit } = validationResult.data.query;

    let isAdminView = false;
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    if (token) {
        const payload = await verifyAccessToken(token); // Use await here
        if (payload && payload.role === UserRole.ADMIN) {
            isAdminView = true;
        }
    }


    try {
        const options: { where?: Prisma.EventWhereInput, skip?: number, take?: number, orderBy?: Prisma.EventOrderByWithRelationInput } = {};
        let where: Prisma.EventWhereInput = {};

        // Build where clause based on validated query params
        if (statusQuery) {
             if (isAdminView) {
                where.status = statusQuery;
            } else if (statusQuery === EventStatus.PUBLISHED) {
                 where.status = EventStatus.PUBLISHED;
            } // Non-admins can only explicitly filter for PUBLISHED
        } else if (!isAdminView) {
            where.status = EventStatus.PUBLISHED; // Default for non-admins
        }

        if (startDate) {
            where.date = { ...where.date as Prisma.DateTimeFilter, gte: new Date(startDate) };
        }
        if (endDate) {
            where.date = { ...where.date as Prisma.DateTimeFilter, lte: new Date(endDate) };
        }
        if (location) {
            where.location = { contains: location, mode: 'insensitive' };
        }
        if (category) {
            where.category = { equals: category, mode: 'insensitive' };
        }
        if (q) {
             // Signal search query to service layer
             where.OR = [{ title: { contains: q, mode: 'insensitive' } }];
        }

        options.where = where;
        options.skip = (page - 1) * limit;
        options.take = limit;

        if (sortBy && order) {
            options.orderBy = { [sortBy]: order };
        }

        // Fetch events and count using the service layer
        const events = await findAllEvents(options, isAdminView);
        const totalEvents = await countEvents(options.where, isAdminView);
        const totalPages = Math.ceil(totalEvents / limit);

        // --- Set Cache ---
        if (redisClient && redisClient.isOpen) {
            try {
                const dataToCache = JSON.stringify({
                    events,
                    totalCount: totalEvents,
                    currentPage: page,
                    limit: limit,
                    totalPages: totalPages
                });
                 await redisClient.setEx(cacheKey, CACHE_DURATION_SECONDS, dataToCache);
                 console.log(`Cache SET for key: ${cacheKey}`);
            } catch (cacheSetError) {
                console.error(`Redis SETEX error for key ${cacheKey}:`, cacheSetError);
            }
        }
        // --- End Set Cache ---

        // Set pagination headers
        const headers = new Headers();
        headers.set('X-Cache', 'MISS'); // Indicate cache miss
        headers.set('X-Total-Count', totalEvents.toString());
        headers.set('X-Current-Page', page.toString());
        headers.set('X-Per-Page', limit.toString());
        headers.set('X-Total-Pages', totalPages.toString());

        return NextResponse.json(events, { headers });

    } catch (error: any) {
        console.error('Error fetching events:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}

// Add POST handler later if needed
// export async function POST(request: Request) { ... }
