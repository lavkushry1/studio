import express from 'express';
import * as authController from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { RegisterSchema, LoginSchema, RefreshTokenSchema } from '../validation/schemas';
import { authenticateToken } from '../middleware/auth.middleware'; // Import auth middleware

const router = express.Router();

// POST /api/auth/register - User Registration
router.post('/register', validateRequest(RegisterSchema), authController.register);

// POST /api/auth/login - User Login
router.post('/login', validateRequest(LoginSchema), authController.login);

// POST /api/auth/refresh - Refresh Access Token
router.post('/refresh', validateRequest(RefreshTokenSchema), authController.refreshToken);

// POST /api/auth/logout - User Logout (Requires sending refresh token to invalidate)
router.post('/logout', validateRequest(RefreshTokenSchema), authController.logout); // Doesn't strictly need authenticateToken, but good practice if server stores session info

// GET /api/auth/me - Get current user profile (Requires authentication)
router.get('/me', authenticateToken, authController.getMe);

export default router;
