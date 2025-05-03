import { prisma } from '@/lib/prisma';
import { User, UserRole } from '@prisma/client';
import { hashPassword } from './auth.service';

/**
 * Creates a new user in the database.
 * @param data - User data including email, password, name, and role.
 * @returns The newly created user object.
 * @throws Error if email is already taken.
 */
export const createUser = async (data: Pick<User, 'email' | 'password' | 'name'> & { role?: UserRole }): Promise<User> => {
  const existingUser = await findUserByEmail(data.email);
  if (existingUser) {
    throw new Error('Email already in use');
  }

  const hashedPassword = await hashPassword(data.password);
  return prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: data.role || UserRole.USER, // Default to USER role
    },
  });
};

/**
 * Finds a user by their email address.
 * @param email - The email address to search for.
 * @returns The user object if found, otherwise null.
 */
export const findUserByEmail = async (email: string): Promise<User | null> => {
  return prisma.user.findUnique({
    where: { email },
  });
};

/**
 * Finds a user by their ID.
 * @param id - The ID of the user to search for.
 * @returns The user object if found, otherwise null.
 */
export const findUserById = async (id: string): Promise<User | null> => {
    return prisma.user.findUnique({
        where: { id },
    });
};
