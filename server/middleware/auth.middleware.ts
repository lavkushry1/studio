import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.utils';
import { UserRole } from '@prisma/client';

// Extend Express Request interface to include user property
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                role: string; // Store role as string initially from JWT
            };
        }
    }
}


/**
 * Middleware to authenticate requests using JWT access token.
 * Attaches user information ({ userId, role }) to the request object if authentication succeeds.
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    // Allow request to proceed if token is not provided,
    // but don't attach user. Routes needing auth will fail later.
    // This allows public routes to work without a token.
    // If strict authentication is always needed, return 401 here.
    // return res.status(401).json({ message: 'Unauthorized: No token provided' });
    return next();
  }

  const decoded = verifyAccessToken(token);

  if (!decoded) {
    // If token exists but is invalid/expired, deny access.
    return res.status(403).json({ message: 'Forbidden: Invalid or expired token' });
  }

  req.user = decoded; // Attach user payload to request
  next();
};

/**
 * Middleware factory to authorize requests based on user role.
 * Should be used *after* authenticateToken middleware.
 * @param allowedRoles - An array of roles allowed to access the route.
 */
export const authorizeRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Ensure authenticateToken ran successfully and attached user
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: 'Unauthorized: User not authenticated' });
    }

    // Check if the user's role (from token) is included in the allowed roles
    if (!allowedRoles.includes(req.user.role as UserRole)) { // Cast role string to UserRole enum
      return res.status(403).json({ message: `Forbidden: Access denied. Required roles: ${allowedRoles.join(', ')}` });
    }

    next(); // User has the required role, proceed
  };
};

/**
 * Convenience middleware to specifically require ADMIN role.
 */
export const requireAdmin = authorizeRole([UserRole.ADMIN]);

/**
 * Convenience middleware to specifically require ORGANIZER role (or ADMIN).
 */
export const requireOrganizer = authorizeRole([UserRole.ORGANIZER, UserRole.ADMIN]); // Admins can also organize
