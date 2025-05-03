import { z } from 'zod';

// Schema for the login form
export const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

// Schema for the registration form
export const registerSchema = z.object({
  name: z.string().min(1, { message: 'Full name is required.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long.' }),
  // Optional: Add password confirmation if needed
  // confirmPassword: z.string().min(6, { message: 'Please confirm your password.' }),
})
// Optional: Refine to check if passwords match
// .refine((data) => data.password === data.confirmPassword, {
//   message: "Passwords don't match",
//   path: ["confirmPassword"], // path of error
// });


export type RegisterFormValues = z.infer<typeof registerSchema>;
