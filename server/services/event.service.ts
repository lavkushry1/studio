import { prisma } from '@/lib/prisma';
import { Event, TicketCategory, Prisma, EventStatus } from '@prisma/client';
import { CreateEventInput, UpdateEventInput } from '../validation/schemas';

/**
 * Creates a new event along with its ticket categories.
 * @param data - Event creation data including ticket categories.
 * @param organizerId - The ID of the user creating the event.
 * @returns The newly created event object with categories.
 */
export const createEvent = async (data: CreateEventInput, organizerId: string): Promise<Event & { ticketCategories: TicketCategory[] }> => {
    const { ticketCategories, ...eventData } = data;

    return prisma.event.create({
        data: {
            ...eventData,
            organizerId: organizerId,
            date: new Date(eventData.date), // Ensure date is a Date object
            status: eventData.status || EventStatus.DRAFT, // Default status
            ticketCategories: {
                create: ticketCategories.map(category => ({
                    name: category.name,
                    price: category.price,
                    totalQty: category.totalQty,
                    bookedQty: 0, // Initialize booked quantity
                })),
            },
        },
        include: {
            ticketCategories: true, // Include categories in the returned object
        },
    });
};

/**
 * Finds all events, optionally with filters and pagination.
 * @param options - Filtering and pagination options (optional).
 * @returns An array of event objects.
 */
export const findAllEvents = async (options?: {
    where?: Prisma.EventWhereInput,
    orderBy?: Prisma.EventOrderByWithRelationInput,
    skip?: number,
    take?: number,
    include?: Prisma.EventInclude
}): Promise<Event[]> => {
    return prisma.event.findMany({
        ...options,
        include: options?.include || { ticketCategories: true, organizer: { select: { id: true, name: true, email: true } } }, // Default include
        orderBy: options?.orderBy || { date: 'asc' }, // Default sort
    });
};

/**
 * Finds a single event by its ID.
 * @param id - The ID of the event to find.
 * @param include - Optional relations to include.
 * @returns The event object if found, otherwise null.
 */
export const findEventById = async (id: string, include?: Prisma.EventInclude): Promise<(Event & { ticketCategories: TicketCategory[], organizer: { id: string, name: string | null, email: string } }) | null> => {
    return prisma.event.findUnique({
        where: { id },
        include: include || { ticketCategories: true, organizer: { select: { id: true, name: true, email: true } } }, // Default include
    });
};

/**
 * Updates an existing event.
 * @param id - The ID of the event to update.
 * @param data - The data to update the event with.
 * @param organizerId - The ID of the organizer performing the update (for authorization).
 * @returns The updated event object.
 * @throws Error if the event is not found or the user is not authorized.
 */
export const updateEvent = async (id: string, data: UpdateEventInput, organizerId: string): Promise<Event> => {
    const event = await findEventById(id);
    if (!event) {
        throw new Error('Event not found');
    }
    // Basic check: Ensure the user updating the event is the organizer
    if (event.organizerId !== organizerId) {
        throw new Error('Forbidden: You are not authorized to update this event');
    }

    return prisma.event.update({
        where: { id },
        data: {
            ...data,
            date: data.date ? new Date(data.date) : undefined, // Convert date string if provided
        },
    });
};

/**
 * Deletes an event.
 * @param id - The ID of the event to delete.
 * @param organizerId - The ID of the organizer performing the deletion (for authorization).
 * @returns The deleted event object.
 * @throws Error if the event is not found or the user is not authorized.
 */
export const deleteEvent = async (id: string, organizerId: string): Promise<Event> => {
    const event = await findEventById(id);
    if (!event) {
        throw new Error('Event not found');
    }
     // Basic check: Ensure the user deleting the event is the organizer
    if (event.organizerId !== organizerId) {
        throw new Error('Forbidden: You are not authorized to delete this event');
    }

    // Consider adding checks here: prevent deletion if there are active bookings?
    // Or handle cascading deletes carefully in Prisma schema.

    return prisma.event.delete({
        where: { id },
    });
};
