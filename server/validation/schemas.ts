import { z } from 'zod';
import { EventStatus, BookingStatus, UserRole, SeatStatus } from '@prisma/client'; // Import enums

// ========== Auth Schemas ==========

export const RegisterSchema = z.object({
  body: z.object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
    name: z.string().min(1, { message: 'Name is required' }).optional(),
    role: z.nativeEnum(UserRole).optional(), // Allow specifying role, defaults handled in service
  }),
});
export type RegisterInput = z.infer<typeof RegisterSchema>['body'];

export const LoginSchema = z.object({
  body: z.object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(1, { message: 'Password is required' }),
  }),
});
export type LoginInput = z.infer<typeof LoginSchema>['body'];

export const RefreshTokenSchema = z.object({
    body: z.object({
        refreshToken: z.string().min(1, {message: 'Refresh token is required'}),
    })
})
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>['body'];

// Schema for Logout is same as RefreshTokenSchema as it needs the token to invalidate
export const LogoutSchema = RefreshTokenSchema;
export type LogoutInput = RefreshTokenInput;


// ========== Event Schemas ==========

// Base schema for a ticket category during creation
const TicketCategoryInputSchema = z.object({
  name: z.string().min(1, { message: 'Category name is required' }),
  price: z.coerce.number().positive({ message: 'Price must be positive' }), // Use coerce
  totalQty: z.coerce.number().int().positive({ message: 'Total quantity must be a positive integer' }), // Use coerce
});

export const CreateEventSchema = z.object({
  body: z.object({
    title: z.string().min(1, { message: 'Event title is required' }),
    description: z.string().min(1, { message: 'Event description is required' }),
    category: z.string().optional(), // Added category field
    date: z.string().datetime({ message: 'Invalid date-time format (ISO 8601 expected)' }), // Expect ISO string like "2024-12-31T19:00:00.000Z"
    location: z.string().min(1, { message: 'Event location is required' }),
    imageUrl: z.string().url({ message: 'Invalid image URL' }).optional().or(z.literal('')).nullable(), // Allow empty or null
    status: z.nativeEnum(EventStatus).optional(), // Defaults to DRAFT in service
    ticketCategories: z.array(TicketCategoryInputSchema)
                      .min(1, { message: 'At least one ticket category is required' }),
    hasSeatMap: z.boolean().optional().default(false), // Add hasSeatMap flag
    teamId: z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), { message: 'Invalid team ID format' }).optional().nullable(), // Optional Team ID
    venueId: z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), { message: 'Invalid venue ID format' }).optional().nullable(), // Optional Venue ID
  }),
});
export type CreateEventInput = z.infer<typeof CreateEventSchema>['body'];

export const UpdateEventSchema = z.object({
  params: z.object({
      eventId: z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), { message: 'Invalid event ID format' }), // MongoDB ObjectId check
  }),
  body: z.object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    category: z.string().optional(), // Added category field
    date: z.string().datetime().optional(),
    location: z.string().min(1).optional(),
    imageUrl: z.string().url().optional().nullable(), // Allow removing image by passing null
    status: z.nativeEnum(EventStatus).optional(),
    hasSeatMap: z.boolean().optional(), // Allow updating hasSeatMap flag
    teamId: z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), { message: 'Invalid team ID format' }).optional().nullable(), // Optional Team ID (allow null to unset)
    venueId: z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), { message: 'Invalid venue ID format' }).optional().nullable(), // Optional Venue ID (allow null to unset)
    // Note: Updating ticket categories might need a separate, more complex endpoint/logic
    // to handle additions, deletions, and modifications carefully, especially if bookings exist.
    // For simplicity here, we only allow updating general event details.
    // ticketCategories: z.array(TicketCategoryInputSchema).optional(), // Excluded for now
  }),
});
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>['body'];
export type UpdateEventParams = z.infer<typeof UpdateEventSchema>['params'];

export const GetEventSchema = z.object({
    params: z.object({
        eventId: z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), { message: 'Invalid event ID format' }),
    }),
});
export type GetEventParams = z.infer<typeof GetEventSchema>['params'];

export const DeleteEventSchema = z.object({
    params: z.object({
        eventId: z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), { message: 'Invalid event ID format' }),
    }),
});
export type DeleteEventParams = z.infer<typeof DeleteEventSchema>['params'];

// Schema for List Events Query Parameters
export const listEventsSchema = z.object({ // Renamed for frontend usage consistency
    query: z.object({
        q: z.string().optional(), // Search query
        category: z.string().optional(), // Filter by category
        location: z.string().optional(), // Filter by location
        teamId: z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), { message: 'Invalid team ID format' }).optional(), // Filter by team
        venueId: z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), { message: 'Invalid venue ID format' }).optional(), // Filter by venue
        startDate: z.string().datetime().optional(), // Filter by start date
        endDate: z.string().datetime().optional(), // Filter by end date
        status: z.nativeEnum(EventStatus).optional(), // Filter by status
        sortBy: z.enum(['date', 'title', 'createdAt', 'location', 'category']).default('date').optional(), // Sorting field
        order: z.enum(['asc', 'desc']).default('asc').optional(), // Sorting order
        page: z.coerce.number().int().min(1).default(1).optional(), // Pagination page
        limit: z.coerce.number().int().min(1).max(100).default(10).optional(), // Pagination limit
    }),
});
export type ListEventsQuery = z.infer<typeof listEventsSchema>['query'];


// ========== Seat Schemas ==========

// Schema for defining a single seat in the layout editor
export const SeatDefinitionSchema = z.object({ // Exported for use in updateSeatLayout
    row: z.string().min(1, { message: 'Row identifier is required (e.g., A)' }),
    number: z.coerce.number().int().positive({ message: 'Seat number must be a positive integer' }),
    section: z.string().optional().describe('Optional section name (e.g., North Stand)'),
    status: z.nativeEnum(SeatStatus).default(SeatStatus.AVAILABLE).optional().describe('Initial status (usually AVAILABLE or UNAVAILABLE)'),
    price: z.coerce.number().positive().optional().nullable(), // Optional price override per seat
    ticketCategoryId: z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), { message: 'Invalid category ID format' }).optional().nullable(), // Link seat to a category
});
export type SeatDefinition = z.infer<typeof SeatDefinitionSchema>;


// Schema for updating the entire seat layout for an event (Organizer action)
export const UpdateSeatLayoutSchema = z.object({
    params: z.object({
        eventId: z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), { message: 'Invalid event ID format' }),
    }),
    body: z.object({
        seats: z.array(SeatDefinitionSchema).min(1, { message: 'At least one seat definition is required' }),
    }),
});
export type UpdateSeatLayoutInput = z.infer<typeof UpdateSeatLayoutSchema>['body'];
export type UpdateSeatLayoutParams = z.infer<typeof UpdateSeatLayoutSchema>['params'];

// Schema for reserving seats (User action during checkout)
export const ReserveSeatsSchema = z.object({
    params: z.object({
        eventId: z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), { message: 'Invalid event ID format' }),
    }),
    body: z.object({
        seatIds: z.array(z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), { message: 'Invalid seat ID format' })).min(1, { message: 'At least one seat ID is required' }),
        // reservationId: z.string().uuid().optional(), // Optional ID to group reservations
    }),
});
export type ReserveSeatsInput = z.infer<typeof ReserveSeatsSchema>['body'];
export type ReserveSeatsParams = z.infer<typeof ReserveSeatsSchema>['params'];

// Schema for releasing reserved seats (e.g., on timeout or booking cancellation)
export const ReleaseSeatsSchema = z.object({
    params: z.object({
        eventId: z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), { message: 'Invalid event ID format' }),
    }),
    body: z.object({
        seatIds: z.array(z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), { message: 'Invalid seat ID format' })).min(1, { message: 'At least one seat ID is required' }),
        // reservationId: z.string().uuid().optional(), // Match reservation ID if used
    }),
});
export type ReleaseSeatsInput = z.infer<typeof ReleaseSeatsSchema>['body'];
export type ReleaseSeatsParams = z.infer<typeof ReleaseSeatsSchema>['params'];


// Schema for getting seat map for an event (Public or authenticated user)
export const GetSeatMapSchema = z.object({
    params: z.object({
        eventId: z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), { message: 'Invalid event ID format' }),
    }),
    query: z.object({
        // Optional query params for filtering (e.g., section)
        section: z.string().optional(),
        status: z.nativeEnum(SeatStatus).optional(),
        showAll: z.enum(['true', 'false']).optional().transform(val => val === 'true'), // For editor use
    }).optional(),
});
export type GetSeatMapParams = z.infer<typeof GetSeatMapSchema>['params'];
export type GetSeatMapQuery = z.infer<typeof GetSeatMapSchema>['query'];


// ========== Booking Schemas ==========

export const CreateBookingSchema = z.object({
  body: z.object({
    eventId: z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), { message: 'Invalid event ID format' }),
    quantity: z.coerce.number().int().positive({ message: 'Quantity must be a positive integer' }).optional(), // Make optional if using seats
    seatIds: z.array(z.string().refine((val) => /^[a-f\d]{24}$/i.test(val))).optional().describe('IDs of the seats being booked'), // Add seatIds
    deliveryName: z.string().min(1, {message: "Delivery name is required"}).optional(), // Make optional
    deliveryEmail: z.string().email({message: "Invalid delivery email"}).optional(), // Make optional
    deliveryPhone: z.string().min(10, {message: "Invalid phone number"}).optional(), // Basic length check, make optional
  }).refine(data => data.quantity || (data.seatIds && data.seatIds.length > 0), {
      message: "Either quantity or seatIds must be provided",
      path: ["quantity", "seatIds"], // Indicate which fields are involved
  }),
});
export type CreateBookingInput = z.infer<typeof CreateBookingSchema>['body'];


export const SubmitUtrSchema = z.object({
    params: z.object({
        bookingId: z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), { message: 'Invalid booking ID format' }),
    }),
    body: z.object({
        // Basic UTR validation: usually alphanumeric, length varies (often 12, 16, or 22)
        // Allow slightly broader range for flexibility
        utr: z.string()
             .min(10, {message: 'UTR must be at least 10 characters'})
             .max(30, {message: 'UTR cannot exceed 30 characters'})
             .regex(/^[a-zA-Z0-9]+$/, { message: 'UTR must be alphanumeric' }),
    }),
});
export type SubmitUtrParams = z.infer<typeof SubmitUtrSchema>['params'];
export type SubmitUtrInput = z.infer<typeof SubmitUtrSchema>['body'];


export const VerifyPaymentSchema = z.object({
    params: z.object({
        bookingId: z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), { message: 'Invalid booking ID format' }),
    }),
    body: z.object({
        approve: z.boolean(), // True to approve, False to reject
    }),
});
export type VerifyPaymentParams = z.infer<typeof VerifyPaymentSchema>['params'];
export type VerifyPaymentInput = z.infer<typeof VerifyPaymentSchema>['body'];


export const GetBookingSchema = z.object({
    params: z.object({
        bookingId: z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), { message: 'Invalid booking ID format' }),
    }),
});
export type GetBookingParams = z.infer<typeof GetBookingSchema>['params'];

// Schema for downloading a ticket
export const DownloadTicketSchema = z.object({
    params: z.object({
        bookingId: z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), { message: 'Invalid booking ID format' }),
        ticketId: z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), { message: 'Invalid ticket ID format' }),
    }),
});
export type DownloadTicketParams = z.infer<typeof DownloadTicketSchema>['params'];


// Add schemas for listing bookings, filtering, etc. as needed


// ========== UPI Settings Schemas ==========

// Schema for getting UPI settings (No specific params/body needed)
export const GetUpiSettingsSchema = z.object({});

// Schema for updating UPI settings (Admin action)
export const UpdateUpiSettingsSchema = z.object({
    body: z.object({
        // Basic UPI VPA validation (user@bank or user@domain)
        upiId: z.string()
                 .min(3, { message: 'UPI ID must be at least 3 characters' })
                 .regex(/^[a-zA-Z0-9.\-_]+@[a-zA-Z0-9]+$/, { message: 'Invalid UPI ID format' }),
    }),
});
export type UpdateUpiSettingsInput = z.infer<typeof UpdateUpiSettingsSchema>['body'];

// ========== Ticket Validation Schema ==========
// Schema for the QR code validation endpoint (if implemented)
export const ValidateTicketSchema = z.object({
    body: z.object({
        qrData: z.string().min(1, { message: 'QR data is required' }),
    }),
});
export type ValidateTicketInput = z.infer<typeof ValidateTicketSchema>['body'];

// ========== Team Schemas ==========
export const CreateTeamSchema = z.object({
    body: z.object({
        name: z.string().min(1, { message: 'Team name is required' }),
        shortName: z.string().min(1, { message: 'Short name/code is required' }),
        logoUrl: z.string().url({ message: 'Invalid logo URL' }).optional().nullable(),
        primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, { message: 'Invalid hex color format (e.g., #FFFFFF)' }).optional().nullable(),
        secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, { message: 'Invalid hex color format (e.g., #FFFFFF)' }).optional().nullable(),
        colorAccent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, { message: 'Invalid hex color format (e.g., #FFFFFF)' }).optional().nullable(),
    }),
});
export type CreateTeamInput = z.infer<typeof CreateTeamSchema>['body'];

export const UpdateTeamSchema = z.object({
    params: z.object({
        teamId: z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), { message: 'Invalid team ID format' }),
    }),
    body: z.object({
        name: z.string().min(1).optional(),
        shortName: z.string().min(1).optional(),
        logoUrl: z.string().url().optional().nullable(),
        primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
        secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
        colorAccent: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
    }),
});
export type UpdateTeamInput = z.infer<typeof UpdateTeamSchema>['body'];
export type UpdateTeamParams = z.infer<typeof UpdateTeamSchema>['params'];

export const GetTeamSchema = z.object({
    params: z.object({
        teamId: z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), { message: 'Invalid team ID format' }),
    }),
});
export type GetTeamParams = z.infer<typeof GetTeamSchema>['params'];

export const DeleteTeamSchema = z.object({
    params: z.object({
        teamId: z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), { message: 'Invalid team ID format' }),
    }),
});
export type DeleteTeamParams = z.infer<typeof DeleteTeamSchema>['params'];

// ========== Venue Schemas ==========
export const CreateVenueSchema = z.object({
    body: z.object({
        name: z.string().min(1, { message: 'Venue name is required' }),
        location: z.string().min(1, { message: 'Location is required' }),
        city: z.string().optional().nullable(),
        country: z.string().optional().nullable(),
        capacity: z.coerce.number().int().positive().optional().nullable(),
        imageUrl: z.string().url({ message: 'Invalid image URL' }).optional().nullable(),
        amenities: z.array(z.string()).optional().default([]),
        layoutKey: z.string().optional().nullable().describe('Key for predefined layout, e.g., wankhede_2024'),
    }),
});
export type CreateVenueInput = z.infer<typeof CreateVenueSchema>['body'];

export const UpdateVenueSchema = z.object({
    params: z.object({
        venueId: z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), { message: 'Invalid venue ID format' }),
    }),
    body: z.object({
        name: z.string().min(1).optional(),
        location: z.string().min(1).optional(),
        city: z.string().optional().nullable(),
        country: z.string().optional().nullable(),
        capacity: z.coerce.number().int().positive().optional().nullable(),
        imageUrl: z.string().url().optional().nullable(),
        amenities: z.array(z.string()).optional(),
        layoutKey: z.string().optional().nullable(),
    }),
});
export type UpdateVenueInput = z.infer<typeof UpdateVenueSchema>['body'];
export type UpdateVenueParams = z.infer<typeof UpdateVenueSchema>['params'];

export const GetVenueSchema = z.object({
    params: z.object({
        venueId: z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), { message: 'Invalid venue ID format' }),
    }),
});
export type GetVenueParams = z.infer<typeof GetVenueSchema>['params'];

export const DeleteVenueSchema = z.object({
    params: z.object({
        venueId: z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), { message: 'Invalid venue ID format' }),
    }),
});
export type DeleteVenueParams = z.infer<typeof DeleteVenueSchema>['params'];

export const ListVenuesSchema = z.object({
    query: z.object({
        q: z.string().optional(), // Search query
        city: z.string().optional(), // Filter by city
        page: z.coerce.number().int().min(1).default(1).optional(), // Pagination page
        limit: z.coerce.number().int().min(1).max(100).default(10).optional(), // Pagination limit
    }).optional(),
});
export type ListVenuesQuery = z.infer<typeof ListVenuesSchema>['query'];
