import { prisma } from '@/lib/prisma';
import { Venue, Prisma } from '@prisma/client';
import { CreateVenueInput, UpdateVenueInput, ListVenuesQuery } from '../validation/schemas';

/**
 * Creates a new venue.
 * @param data - Venue creation data.
 * @returns The newly created venue object.
 * @throws Error if name is already taken.
 */
export const createVenue = async (data: CreateVenueInput): Promise<Venue> => {
    // Check for uniqueness is handled by Prisma schema (@unique)
    return prisma.venue.create({
        data: {
            name: data.name,
            location: data.location,
            city: data.city,
            country: data.country,
            capacity: data.capacity,
            imageUrl: data.imageUrl,
            amenities: data.amenities || [],
            layoutKey: data.layoutKey,
        },
    });
};

/**
 * Finds all venues.
 * @param options - Optional query options (e.g., filtering, pagination, sorting).
 * @returns An array of venue objects.
 */
export const findAllVenues = async (options?: {
    where?: Prisma.VenueWhereInput,
    orderBy?: Prisma.VenueOrderByWithRelationInput,
    skip?: number,
    take?: number
}): Promise<Venue[]> => {
    return prisma.venue.findMany({
        where: options?.where,
        orderBy: options?.orderBy || { name: 'asc' }, // Default sort by name
        skip: options?.skip,
        take: options?.take,
    });
};

/**
 * Counts venues based on criteria.
 * @param where - Filtering options.
 * @returns The total count of matching venues.
 */
export const countVenues = async (where?: Prisma.VenueWhereInput): Promise<number> => {
    return prisma.venue.count({ where });
};


/**
 * Finds a single venue by its ID.
 * @param id - The ID of the venue to find.
 * @returns The venue object if found, otherwise null.
 */
export const findVenueById = async (id: string): Promise<Venue | null> => {
    return prisma.venue.findUnique({
        where: { id },
        // include: { events: true } // Optionally include related events
    });
};

/**
 * Updates an existing venue.
 * @param id - The ID of the venue to update.
 * @param data - The data to update the venue with.
 * @returns The updated venue object.
 * @throws Error if the venue is not found or unique constraints are violated.
 */
export const updateVenue = async (id: string, data: UpdateVenueInput): Promise<Venue> => {
    // Check if venue exists first (Prisma update throws P2025 if not found)
    const venueExists = await findVenueById(id);
    if (!venueExists) {
        throw new Error('Venue not found');
    }
    // Uniqueness checks handled by Prisma schema
    return prisma.venue.update({
        where: { id },
        data: {
            name: data.name,
            location: data.location,
            city: data.city,
            country: data.country,
            capacity: data.capacity,
            imageUrl: data.imageUrl,
            amenities: data.amenities,
            layoutKey: data.layoutKey,
        },
    });
};

/**
 * Deletes a venue.
 * @param id - The ID of the venue to delete.
 * @returns The deleted venue object.
 * @throws Error if the venue is not found or if associated events exist.
 */
export const deleteVenue = async (id: string): Promise<Venue> => {
    // Check if venue exists
    const venue = await findVenueById(id);
    if (!venue) {
        throw new Error('Venue not found');
    }

    // Check if venue is associated with any events
    const eventCount = await prisma.event.count({
        where: { venueId: id },
    });

    if (eventCount > 0) {
        throw new Error(`Cannot delete venue. It is associated with ${eventCount} event(s). Please remove venue association from events first.`);
    }

    // Proceed with deletion
    return prisma.venue.delete({
        where: { id },
    });
};

/**
 * Searches venues based on query string and filters.
 * Used by the controller to handle list requests with search.
 * @param query - Search parameters including 'q' and 'city'.
 * @param pagination - Pagination options.
 * @returns Object containing list of venues and total count.
 */
export const searchVenues = async (
    query: ListVenuesQuery,
    pagination: { skip: number; take: number }
): Promise<{ venues: Venue[], totalCount: number }> => {
    let whereClause: Prisma.VenueWhereInput = {};

    if (query?.city) {
        whereClause.city = { contains: query.city, mode: 'insensitive' };
    }

    if (query?.q) {
        whereClause.OR = [
            { name: { contains: query.q, mode: 'insensitive' } },
            { location: { contains: query.q, mode: 'insensitive' } },
            { city: { contains: query.q, mode: 'insensitive' } },
        ];
    }

    const [venues, totalCount] = await prisma.$transaction([
        prisma.venue.findMany({
            where: whereClause,
            orderBy: { name: 'asc' },
            skip: pagination.skip,
            take: pagination.take,
        }),
        prisma.venue.count({ where: whereClause }),
    ]);

    return { venues, totalCount };
};
