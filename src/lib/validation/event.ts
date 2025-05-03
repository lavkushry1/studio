import { z } from 'zod';
import { EventStatus } from '@prisma/client'; // Import enum if needed, though optional for creation

// Base schema for a ticket category during creation (frontend)
const ticketCategorySchema = z.object({
  name: z.string().min(1, { message: 'Category name is required.' }),
  price: z.coerce // Use coerce to handle potential string input from forms
    .number({ invalid_type_error: 'Price must be a number.' })
    .positive({ message: 'Price must be positive.' })
    .finite({ message: 'Price must be a valid number.' }),
  totalQty: z.coerce // Use coerce for quantity as well
    .number({ invalid_type_error: 'Quantity must be a number.' })
    .int({ message: 'Quantity must be a whole number.' })
    .positive({ message: 'Total quantity must be positive.' }),
});

// Schema for the event creation form (frontend)
export const eventFormSchema = z.object({
  title: z.string().min(3, { message: 'Event title must be at least 3 characters.' }),
  description: z.string().min(10, { message: 'Event description must be at least 10 characters.' }),
  category: z.string().min(1, { message: 'Category is required.'}).optional(), // Add category field
  // Use z.date() for Date objects from date pickers, or string().datetime() if expecting ISO strings directly
  date: z.date({ required_error: 'Event date and time are required.' }),
  location: z.string().min(3, { message: 'Event location must be at least 3 characters.' }),
  imageUrl: z.string().url({ message: 'Please enter a valid image URL.' }).optional().or(z.literal('')), // Allow empty string or valid URL
  // Status might be set automatically or selected, making it optional here initially
  status: z.nativeEnum(EventStatus).default(EventStatus.DRAFT).optional(), // Default to DRAFT
  teamId: z.string().nullable().optional(), // Optional team ID, can be string (ObjectId) or null
  ticketCategories: z.array(ticketCategorySchema)
    .min(1, { message: 'At least one ticket category is required.' }),
});

export type EventFormValues = z.infer<typeof eventFormSchema>;

// Type for a single ticket category in the form array
export type TicketCategoryFormValues = z.infer<typeof ticketCategorySchema>;
