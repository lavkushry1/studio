import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.utils';
import { UserRole } from '@prisma/client';

// Extend Express Request interface to include user property
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                role: string;
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
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const decoded = verifyAccessToken(token);

  if (!decoded) {
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
    if (!req.user || !req.user.role) {
        // This should ideally not happen if authenticateToken runs first
      return res.status(401).json({ message: 'Unauthorized: User not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      return res.status(403).json({ message: `Forbidden: Access denied for role ${req.user.role}` });
    }

    next();
  };
};

/**
 * Convenience middleware to specifically require ADMIN role.
 */
export const requireAdmin = authorizeRole([UserRole.ADMIN]);

// Add requireOrganizer if needed later
// export const requireOrganizer = authorizeRole([UserRole.ORGANIZER, UserRole.ADMIN]); // Admins can also organize
