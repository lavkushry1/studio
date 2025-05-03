import { Request, Response } from 'express';
import * as userService from '../services/user.service';
import * as authService from '../services/auth.service';
import { RegisterInput, LoginInput, RefreshTokenInput } from '../validation/schemas';

/**
 * Handles user registration.
 * POST /api/auth/register
 */
export const register = async (req: Request<object, object, RegisterInput>, res: Response) => {
  try {
    const { email, password, name, role } = req.body;
    const user = await userService.createUser({ email, password, name, role });

    // Exclude password from the response
    const { password: _, ...userWithoutPassword } = user;

    // Optionally: Log the user in immediately after registration
     const tokens = await authService.generateTokens(user);
     res.status(201).json({ user: userWithoutPassword, ...tokens });

    // Or just return the user data
    // res.status(201).json(userWithoutPassword);

  } catch (error: any) {
    if (error.message === 'Email already in use') {
      return res.status(409).json({ message: error.message });
    }
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * Handles user login.
 * POST /api/auth/login
 */
export const login = async (req: Request<object, object, LoginInput>, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await userService.findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await authService.comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const tokens = await authService.generateTokens(user);

    // Exclude password from the response user object
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({ user: userWithoutPassword, ...tokens });

  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * Handles refreshing the access token.
 * POST /api/auth/refresh
 */
export const refreshToken = async (req: Request<object, object, RefreshTokenInput>, res: Response) => {
    try {
        const { refreshToken } = req.body;
        const newAccessToken = await authService.refreshAccessToken(refreshToken);

        if (!newAccessToken) {
            // This case might be handled by errors thrown within refreshAccessToken
            return res.status(401).json({ message: 'Invalid or expired refresh token' });
        }

        res.status(200).json({ accessToken: newAccessToken });

    } catch (error: any) {
         console.error('Token refresh error:', error);
         // Send specific error messages based on the caught error
         if (error.message === 'Invalid refresh token' || error.message === 'Refresh token not found or mismatch') {
             return res.status(401).json({ message: error.message });
         }
         if (error.message === 'Refresh token expired') {
            return res.status(401).json({ message: error.message });
         }
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


/**
 * Handles user logout by invalidating the refresh token.
 * POST /api/auth/logout
 * Requires authentication to identify the token to invalidate.
 */
export const logout = async (req: Request<object, object, RefreshTokenInput>, res: Response) => {
     try {
        const { refreshToken } = req.body; // Client needs to send the refresh token to invalidate

        // 1. Verify the refresh token to get its payload (including tokenId)
        const decodedPayload = authService.verifyRefreshToken(refreshToken);
        if (!decodedPayload || !decodedPayload.tokenId) {
            return res.status(400).json({ message: 'Invalid refresh token provided' });
        }

        // 2. Invalidate the specific refresh token record in the database
        await authService.invalidateRefreshToken(decodedPayload.tokenId);

        // Optionally: Invalidate all tokens for the user if needed for stricter logout
        // await authService.invalidateAllUserRefreshTokens(decodedPayload.userId);

        res.status(200).json({ message: 'Logout successful' });

    } catch (error: any) {
        console.error('Logout error:', error);
        // Don't expose too much detail in case of errors during logout
        res.status(500).json({ message: 'Logout failed' });
    }
};

/**
 * Gets the current authenticated user's profile.
 * GET /api/auth/me
 * Requires authentication.
 */
export const getMe = async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
        const user = await userService.findUserById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Exclude password
        const { password: _, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
    } catch (error) {
        console.error('Get Me error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
