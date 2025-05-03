import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

/**
 * Middleware factory to validate request data (body, params, query) against a Zod schema.
 * @param schema - The Zod schema object containing optional body, params, query schemas.
 * @returns Express middleware function.
 */
export const validateRequest = (schema: AnyZodObject | { body?: AnyZodObject, params?: AnyZodObject, query?: AnyZodObject }) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if ('parse' in schema && typeof schema.parse === 'function') {
        // Handle single schema object directly (e.g., for simpler cases)
         await schema.parseAsync({
            body: req.body,
            query: req.query,
            params: req.params,
         });

      } else {
         // Handle object with optional body, params, query schemas
          if (schema.params) {
            req.params = await schema.params.parseAsync(req.params);
          }
          if (schema.body) {
            req.body = await schema.body.parseAsync(req.body);
          }
          if (schema.query) {
            req.query = await schema.query.parseAsync(req.query);
          }
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
