import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'your_access_token_secret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your_refresh_token_secret';
const ACCESS_TOKEN_EXPIRATION = process.env.ACCESS_TOKEN_EXPIRATION || '15m'; // e.g., 15 minutes
const REFRESH_TOKEN_EXPIRATION = process.env.REFRESH_TOKEN_EXPIRATION || '7d'; // e.g., 7 days

interface AccessTokenPayload {
  userId: string;
  role: string;
}

interface RefreshTokenPayload {
  userId: string;
  tokenId: string; // Reference to the stored refresh token ID
}

/**
 * Generates a JWT access token.
 * @param user - The user object containing id and role.
 * @returns The generated access token.
 */
export const generateAccessToken = (user: Pick<User, 'id' | 'role'>): string => {
  const payload: AccessTokenPayload = {
    userId: user.id,
    role: user.role,
  };
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRATION });
};

/**
 * Generates a JWT refresh token.
 * @param userId - The ID of the user.
 * @param tokenId - The ID of the stored refresh token record.
 * @returns The generated refresh token.
 */
export const generateRefreshToken = (userId: string, tokenId: string): string => {
    const payload: RefreshTokenPayload = {
        userId,
        tokenId,
    };
    // Note: Refresh token expiration is often handled by the database record's expiry,
    // but setting an expiration here adds another layer.
    return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRATION });
};


/**
 * Verifies a JWT access token.
 * @param token - The access token to verify.
 * @returns The decoded payload if verification is successful, otherwise null.
 */
export const verifyAccessToken = (token: string): AccessTokenPayload | null => {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET) as AccessTokenPayload;
  } catch (error) {
    console.error('Access token verification failed:', error);
    return null;
  }
};

/**
 * Verifies a JWT refresh token.
 * @param token - The refresh token to verify.
 * @returns The decoded payload if verification is successful, otherwise null.
 */
export const verifyRefreshToken = (token: string): RefreshTokenPayload | null => {
    try {
        return jwt.verify(token, REFRESH_TOKEN_SECRET) as RefreshTokenPayload;
    } catch (error) {
        console.error('Refresh token verification failed:', error);
        return null;
    }
};


export const getRefreshTokenExpiration = (): Date => {
    // Simple parsing for '7d' format. Extend if needed.
    const daysMatch = REFRESH_TOKEN_EXPIRATION.match(/^(\d+)d$/);
    const days = daysMatch ? parseInt(daysMatch[1], 10) : 7;
    const expires = new Date();
    expires.setDate(expires.getDate() + days);
    return expires;
}
