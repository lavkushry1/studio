import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { User, RefreshToken } from '@prisma/client';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, getRefreshTokenExpiration } from '../utils/jwt.utils';

const SALT_ROUNDS = 10;

/**
 * Hashes a password using bcrypt.
 * @param password - The plain text password.
 * @returns The hashed password.
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compares a plain text password with a hashed password.
 * @param password - The plain text password.
 * @param hash - The hashed password.
 * @returns True if the passwords match, false otherwise.
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Creates a new refresh token record in the database.
 * @param userId - The ID of the user.
 * @returns The newly created refresh token record.
 */
export const createRefreshToken = async (userId: string): Promise<RefreshToken> => {
    const expiresAt = getRefreshTokenExpiration();
    return prisma.refreshToken.create({
        data: {
            userId,
            expiresAt,
            token: '', // Placeholder, actual token generated and returned separately
        },
    });
};

/**
 * Generates access and refresh tokens for a user.
 * Stores the refresh token ID in the database.
 * @param user - The user object.
 * @returns An object containing the accessToken and refreshToken.
 */
export const generateTokens = async (user: Pick<User, 'id' | 'role'>): Promise<{ accessToken: string; refreshToken: string }> => {
    const refreshTokenRecord = await createRefreshToken(user.id);
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user.id, refreshTokenRecord.id);

    // Update the record with the generated (but not stored directly) token's ID for reference
    // We don't store the raw refresh token for security. Verification relies on the JWT itself and the DB record.
    await prisma.refreshToken.update({
        where: { id: refreshTokenRecord.id },
        data: { token: refreshTokenRecord.id }, // Storing the ID as a reference marker, NOT the JWT token
    });

    return { accessToken, refreshToken };
};


/**
 * Refreshes the access token using a valid refresh token.
 * @param refreshTokenString - The refresh token string provided by the client.
 * @returns A new access token if refresh is successful, otherwise null.
 * @throws Error if refresh token is invalid, expired, or not found.
 */
export const refreshAccessToken = async (refreshTokenString: string): Promise<string | null> => {
    const decodedPayload = verifyRefreshToken(refreshTokenString);

    if (!decodedPayload) {
        throw new Error('Invalid refresh token');
    }

    const { userId, tokenId } = decodedPayload;

    const storedToken = await prisma.refreshToken.findUnique({
        where: { id: tokenId },
        include: { user: true },
    });

    if (!storedToken || storedToken.userId !== userId) {
        throw new Error('Refresh token not found or mismatch');
    }

    if (new Date() > storedToken.expiresAt) {
         await prisma.refreshToken.delete({ where: { id: tokenId } }); // Clean up expired token
        throw new Error('Refresh token expired');
    }

    // Optionally: Implement token rotation (invalidate old, issue new refresh token)
    // For simplicity, we're just issuing a new access token here.

    if (!storedToken.user) {
         throw new Error('User associated with token not found');
    }

    const newAccessToken = generateAccessToken(storedToken.user);
    return newAccessToken;
};


/**
 * Invalidates a specific refresh token (e.g., on logout).
 * @param tokenId - The ID of the refresh token record to invalidate.
 * @returns The deleted refresh token record, or null if not found.
 */
export const invalidateRefreshToken = async (tokenId: string): Promise<RefreshToken | null> => {
    try {
        return await prisma.refreshToken.delete({
            where: { id: tokenId },
        });
    } catch (error) {
        // Handle case where token might already be deleted or doesn't exist
        console.warn(`Failed to invalidate refresh token ${tokenId}:`, error);
        return null;
    }
};

/**
 * Invalidates all refresh tokens for a user (e.g., on password change).
 * @param userId - The ID of the user whose tokens should be invalidated.
 * @returns The result of the deletion operation.
 */
export const invalidateAllUserRefreshTokens = async (userId: string) => {
    return prisma.refreshToken.deleteMany({
        where: { userId },
    });
};
