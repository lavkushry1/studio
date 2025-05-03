import { z } from 'zod';
import { EventStatus, BookingStatus, UserRole } from '@prisma/client'; // Import enums

// ========== Auth Schemas ==========

export const RegisterSchema = z.object({
  body: z.object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
    name: z.string().min(1, { message: 'Name is required' }).optional(), // Optional for initial registration maybe?
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

export const CreateEventSchema = z.object({
  body: z.object({
    title: z.string().min(1, { message: 'Event title is required' }),
    description: z.string().min(1, { message: 'Event description is required' }),
    date: z.string().datetime({ message: 'Invalid date format' }), // Expect ISO string
    location: z.string().min(1, { message: 'Event location is required' }),
    imageUrl: z.string().url({ message: 'Invalid image URL' }).optional(),
    status: z.nativeEnum(EventStatus).optional(), // Defaults to DRAFT
    ticketCategories: z.array(z.object({
        name: z.string().min(1, {message: 'Category name is required'}),
        price: z.number().positive({message: 'Price must be positive'}),
        totalQty: z.number().int().positive({message: 'Total quantity must be a positive integer'}),
    })).min(1, {message: 'At least one ticket category is required'}),
  }),
});
export type CreateEventInput = z.infer<typeof CreateEventSchema>['body'];

export const UpdateEventSchema = z.object({
  params: z.object({
      eventId: z.string().cuid({message: 'Invalid event ID format'}),
  }),
  body: z.object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    date: z.string().datetime().optional(),
    location: z.string().min(1).optional(),
    imageUrl: z.string().url().optional().nullable(), // Allow removing image
    status: z.nativeEnum(EventStatus).optional(),
    // Note: Updating ticket categories might need a separate, more complex endpoint/logic
    // to handle additions, deletions, and modifications carefully, especially if bookings exist.
    // For simplicity here, we allow updating general details.
  }),
});
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>['body'];
export type UpdateEventParams = z.infer<typeof UpdateEventSchema>['params'];

export const GetEventSchema = z.object({
    params: z.object({
        eventId: z.string().cuid({message: 'Invalid event ID format'}),
    }),
});
export type GetEventParams = z.infer<typeof GetEventSchema>['params'];

export const DeleteEventSchema = z.object({
    params: z.object({
        eventId: z.string().cuid({message: 'Invalid event ID format'}),
    }),
});
export type DeleteEventParams = z.infer<typeof DeleteEventSchema>['params'];

// ========== Booking Schemas ==========

export const CreateBookingSchema = z.object({
  body: z.object({
    eventId: z.string().cuid({ message: 'Invalid event ID format' }),
    quantity: z.number().int().positive({ message: 'Quantity must be a positive integer' }),
    // Include delivery details only if needed *at creation* (might be separate step)
    deliveryName: z.string().min(1, {message: "Delivery name is required"}).optional(), // Make optional if collected later
    deliveryEmail: z.string().email({message: "Invalid delivery email"}).optional(),
    deliveryPhone: z.string().min(10, {message: "Invalid phone number"}).optional(), // Basic length check
    // userId is usually inferred from the authenticated user, not passed in body
    // ticketCategoryId could be added if booking specific category
  }),
});
export type CreateBookingInput = z.infer<typeof CreateBookingSchema>['body'];

export const SubmitUtrSchema = z.object({
    params: z.object({
        bookingId: z.string().cuid({message: 'Invalid booking ID format'}),
    }),
    body: z.object({
        utr: z.string().min(12, {message: 'UTR must be at least 12 characters'}).max(22, {message: 'UTR cannot exceed 22 characters'}),
    }),
});
export type SubmitUtrParams = z.infer<typeof SubmitUtrSchema>['params'];
export type SubmitUtrInput = z.infer<typeof SubmitUtrSchema>['body'];


export const VerifyPaymentSchema = z.object({
    params: z.object({
        bookingId: z.string().cuid({message: 'Invalid booking ID format'}),
    }),
    body: z.object({
        approve: z.boolean(), // True to approve, False to reject
    }),
});
export type VerifyPaymentParams = z.infer<typeof VerifyPaymentSchema>['params'];
export type VerifyPaymentInput = z.infer<typeof VerifyPaymentSchema>['body'];


export const GetBookingSchema = z.object({
    params: z.object({
        bookingId: z.string().cuid({message: 'Invalid booking ID format'}),
    }),
});
export type GetBookingParams = z.infer<typeof GetBookingSchema>['params'];

// Add schemas for listing bookings, filtering, etc. as needed
