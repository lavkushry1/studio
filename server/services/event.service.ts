import { prisma } from '@/lib/prisma';
import { Event, TicketCategory, Prisma, EventStatus, UserRole, Team } from '@prisma/client'; // Added Team
import { CreateEventInput, UpdateEventInput } from '../validation/schemas';

/**
 * Creates a new event along with its ticket categories.
 * @param data - Event creation data including ticket categories and optional teamId.
 * @param userId - The ID of the user creating the event (organizer or admin).
 * @param userRole - The role of the user creating the event.
 * @returns The newly created event object with categories and optional team.
 * @throws Error if user is not authorized or teamId is invalid.
 */
export const createEvent = async (
    data: CreateEventInput,
    userId: string,
    userRole: string // Assume role comes from authenticated user (req.user.role)
): Promise<Event & { ticketCategories: TicketCategory[], team: Team | null }> => {
    // Authorization Check: Only Admins or Organizers can create events
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.ORGANIZER) {
        throw new Error('Forbidden: You are not authorized to create events');
    }

    // Destructure including teamId
    const { ticketCategories, teamId, ...eventData } = data;

    // Optional: Validate teamId exists if provided
    if (teamId) {
        const teamExists = await prisma.team.findUnique({ where: { id: teamId } });
        if (!teamExists) {
            throw new Error('Invalid Team ID provided.');
        }
    }

    return prisma.event.create({
        data: {
            ...eventData,
            organizerId: userId, // Assign the creator as the organizer
            date: new Date(eventData.date), // Ensure date is a Date object
            status: eventData.status || EventStatus.DRAFT, // Default status if not provided
            category: eventData.category,
            teamId: teamId || null, // Assign teamId or null
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
            team: true, // Include team details
        },
    });
};

/**
 * Finds all events, optionally with filters, search, and pagination.
 * By default, only returns PUBLISHED events unless specified otherwise (e.g., for admin view).
 * Includes team relation.
 * @param options - Filtering, search, and pagination options (optional).
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

    let whereClause: Prisma.EventWhereInput = isAdminView ? {} : { status: EventStatus.PUBLISHED };

    // Combine default status filter with provided filters
    if (options?.where) {
        // Special handling for search query 'q'
        if (options.where.OR && options.where.OR[0]?.title?.contains) { // Check if 'q' was provided
            const searchQuery = (options.where.OR[0].title.contains as string) // Extract search term
            whereClause = {
                ...whereClause,
                 _search: searchQuery, // Use the text index for search
                // Keep other filters from options.where if they don't conflict directly with search
                 ...(Object.keys(options.where).length > 1 ? options.where : {}),
                 // Remove the OR clause used for search signaling
                 OR: undefined,
                 title: undefined, // Remove the fields used in OR
                 description: undefined,
                 location: undefined,
                 category: undefined,

            };
             console.log("Search Query:", searchQuery);
             console.log("Where Clause with Search:", JSON.stringify(whereClause, null, 2));

        } else {
             // Combine normally if no search query 'q'
            whereClause = { ...whereClause, ...options.where };
        }
    }


    return prisma.event.findMany({
        where: whereClause,
        orderBy: options?.orderBy || { date: 'asc' }, // Default sort by date
        skip: options?.skip,
        take: options?.take,
        // Include team by default in list view
        include: options?.include || { ticketCategories: true, organizer: { select: { id: true, name: true, email: true } }, team: true },
    });
};

/**
 * Counts events based on criteria.
 * Respects admin view for status filtering.
 * @param where - Filtering options.
 * @param isAdminView - If true, bypasses the default PUBLISHED status filter.
 * @returns The total count of matching events.
 */
export const countEvents = async (where?: Prisma.EventWhereInput, isAdminView = false): Promise<number> => {
    const defaultWhere: Prisma.EventWhereInput = isAdminView ? {} : { status: EventStatus.PUBLISHED };
    let whereClause: Prisma.EventWhereInput = { ...defaultWhere, ...where };

    // Handle search query for count
     if (where?.OR && where.OR[0]?.title?.contains) { // Check if 'q' was provided
        const searchQuery = (where.OR[0].title.contains as string) // Extract search term
         whereClause = {
             ...whereClause,
              _search: searchQuery, // Use the text index for search
             OR: undefined, title: undefined, description: undefined, location: undefined, category: undefined,
         };
     }


    return prisma.event.count({
        where: whereClause,
    });
};


/**
 * Finds a single event by its ID.
 * Returns event regardless of status (controller might filter based on role).
 * Includes team relation.
 * @param id - The ID of the event to find.
 * @param include - Optional relations to include.
 * @returns The event object if found, otherwise null.
 */
export const findEventById = async (id: string, include?: Prisma.EventInclude): Promise<(Event & { ticketCategories: TicketCategory[], organizer: { id: string, name: string | null, email: string }, team: Team | null }) | null> => {
    return prisma.event.findUnique({
        where: { id },
        // Include categories, organizer, and team details by default
        include: include || { ticketCategories: true, organizer: { select: { id: true, name: true, email: true } }, team: true },
    });
};

/**
 * Updates an existing event.
 * @param id - The ID of the event to update.
 * @param data - The data to update the event with (can include teamId).
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

    const { teamId, ...restData } = data;

    // Optional: Validate teamId exists if provided
    if (teamId) {
        const teamExists = await prisma.team.findUnique({ where: { id: teamId } });
        if (!teamExists) {
            throw new Error('Invalid Team ID provided.');
        }
    }
    // Allow setting teamId to null to remove association
    const teamIdUpdate = teamId === null ? null : (teamId || undefined); // Use undefined if not provided in update

    return prisma.event.update({
        where: { id },
        data: {
            ...restData,
            date: restData.date ? new Date(restData.date) : undefined, // Convert date string if provided
            teamId: teamIdUpdate, // Update teamId or set to null
             // Prevent updating ticket categories via this endpoint for now
            ticketCategories: undefined, // Explicitly remove if passed in data
            category: data.category, // Allow updating category
        },
        include: { ticketCategories: true, team: true }, // Return updated event with categories and team
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
    // It will also SetNull on the Event relation in Bookings
    return prisma.event.delete({
        where: { id },
    });
};
