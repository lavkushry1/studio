import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

/**
 * Middleware factory to validate request data (body, params, query) against a Zod schema.
 * @param schema - The Zod schema object containing optional body, params, query schemas.
 * @returns Express middleware function.
 */
export const validateRequest = (schema: { body?: AnyZodObject, params?: AnyZodObject, query?: AnyZodObject }) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate params if schema exists
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      // Validate body if schema exists
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      // Validate query if schema exists
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors for a user-friendly response
        const errors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
        }));
        return res.status(400).json({ message: 'Validation failed', errors });
      }
      // Handle unexpected errors
      console.error('Unexpected validation error:', error);
      return res.status(500).json({ message: 'Internal Server Error during validation' });
    }
  };
