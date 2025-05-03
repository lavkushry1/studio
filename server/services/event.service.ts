import { prisma } from '@/lib/prisma';
import { Event, TicketCategory, Prisma, EventStatus, UserRole } from '@prisma/client';
import { CreateEventInput, UpdateEventInput } from '../validation/schemas';

/**
 * Creates a new event along with its ticket categories.
 * @param data - Event creation data including ticket categories.
 * @param userId - The ID of the user creating the event (organizer or admin).
 * @param userRole - The role of the user creating the event.
 * @returns The newly created event object with categories.
 * @throws Error if user is not authorized.
 */
export const createEvent = async (
    data: CreateEventInput,
    userId: string,
    userRole: string // Assume role comes from authenticated user (req.user.role)
): Promise<Event & { ticketCategories: TicketCategory[] }> => {
    // Authorization Check: Only Admins or Organizers can create events
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.ORGANIZER) {
        throw new Error('Forbidden: You are not authorized to create events');
    }

    const { ticketCategories, ...eventData } = data;

    return prisma.event.create({
        data: {
            ...eventData,
            organizerId: userId, // Assign the creator as the organizer
            date: new Date(eventData.date), // Ensure date is a Date object
            status: eventData.status || EventStatus.DRAFT, // Default status if not provided
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
 * By default, only returns PUBLISHED events unless specified otherwise (e.g., for admin view).
 * @param options - Filtering and pagination options (optional).
 * @param isAdminView - If true, bypasses the default PUBLISHED status filter.
 * @returns An array of event objects.
 */
export const findAllEvents = async (options?: {
    where?: Prisma.EventWhereInput,
    orderBy?: Prisma.EventOrderByWithRelationInput,
    skip?: number,
    take?: number,
    include?: Prisma.EventInclude
}, isAdminView = false): Promise<Event[]> => {

    const defaultWhere: Prisma.EventWhereInput = isAdminView ? {} : { status: EventStatus.PUBLISHED };

    return prisma.event.findMany({
        where: { ...defaultWhere, ...options?.where }, // Combine default and specific where clauses
        orderBy: options?.orderBy || { date: 'asc' }, // Default sort by date
        skip: options?.skip,
        take: options?.take,
        include: options?.include || { ticketCategories: true, organizer: { select: { id: true, name: true, email: true } } }, // Default include
    });
};

/**
 * Finds a single event by its ID.
 * Returns event regardless of status (controller might filter based on role).
 * @param id - The ID of the event to find.
 * @param include - Optional relations to include.
 * @returns The event object if found, otherwise null.
 */
export const findEventById = async (id: string, include?: Prisma.EventInclude): Promise<(Event & { ticketCategories: TicketCategory[], organizer: { id: string, name: string | null, email: string } }) | null> => {
    return prisma.event.findUnique({
        where: { id },
        // Include categories and organizer details by default
        include: include || { ticketCategories: true, organizer: { select: { id: true, name: true, email: true } } },
    });
};

/**
 * Updates an existing event.
 * @param id - The ID of the event to update.
 * @param data - The data to update the event with.
 * @param userId - The ID of the user performing the update.
 * @param userRole - The role of the user performing the update.
 * @returns The updated event object.
 * @throws Error if the event is not found or the user is not authorized.
 */
export const updateEvent = async (
    id: string,
    data: UpdateEventInput,
    userId: string,
    userRole: string
): Promise<Event> => {
    const event = await findEventById(id);
    if (!event) {
        throw new Error('Event not found');
    }

    // Authorization Check: Allow update only if user is the organizer OR an Admin
    if (event.organizerId !== userId && userRole !== UserRole.ADMIN) {
        throw new Error('Forbidden: You are not authorized to update this event');
    }

    return prisma.event.update({
        where: { id },
        data: {
            ...data,
            date: data.date ? new Date(data.date) : undefined, // Convert date string if provided
             // Prevent updating ticket categories via this endpoint for now
            ticketCategories: undefined, // Explicitly remove if passed in data
        },
        include: { ticketCategories: true }, // Return updated event with categories
    });
};

/**
 * Deletes an event.
 * @param id - The ID of the event to delete.
 * @param userId - The ID of the user performing the deletion.
 * @param userRole - The role of the user performing the deletion.
 * @returns The deleted event object.
 * @throws Error if the event is not found or the user is not authorized.
 */
export const deleteEvent = async (id: string, userId: string, userRole: string): Promise<Event> => {
    const event = await findEventById(id, { bookings: { select: { id: true } } }); // Check for existing bookings
    if (!event) {
        throw new Error('Event not found');
    }

     // Authorization Check: Allow delete only if user is the organizer OR an Admin
    if (event.organizerId !== userId && userRole !== UserRole.ADMIN) {
        throw new Error('Forbidden: You are not authorized to delete this event');
    }

     // Business Logic Check: Prevent deletion if there are confirmed bookings? (Optional)
     // This depends on requirements. Maybe allow cancelling instead?
    // const hasConfirmedBookings = await prisma.booking.count({
    //     where: { eventId: id, status: BookingStatus.CONFIRMED }
    // }) > 0;
    // if (hasConfirmedBookings && userRole !== UserRole.ADMIN) { // Maybe allow admin override?
    //     throw new Error('Cannot delete event with confirmed bookings. Consider cancelling it instead.');
    // }

    // Deleting the event will cascade delete TicketCategories due to schema relation
    return prisma.event.delete({
        where: { id },
    });
};
