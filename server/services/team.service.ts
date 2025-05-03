import { prisma } from '@/lib/prisma';
import { Team, Prisma } from '@prisma/client';
import { CreateTeamInput, UpdateTeamInput } from '../validation/schemas';

/**
 * Creates a new team.
 * @param data - Team creation data.
 * @returns The newly created team object.
 * @throws Error if name or shortName is already taken.
 */
export const createTeam = async (data: CreateTeamInput): Promise<Team> => {
    // Check for uniqueness is handled by Prisma schema (@unique)
    // Prisma will throw P2002 error if constraints are violated
    return prisma.team.create({
        data: {
            name: data.name,
            shortName: data.shortName,
            logoUrl: data.logoUrl,
            primaryColor: data.primaryColor,
            secondaryColor: data.secondaryColor,
            colorAccent: data.colorAccent,
        },
    });
};

/**
 * Finds all teams.
 * @param options - Optional query options (e.g., sorting).
 * @returns An array of team objects.
 */
export const findAllTeams = async (options?: { orderBy?: Prisma.TeamOrderByWithRelationInput }): Promise<Team[]> => {
    return prisma.team.findMany({
        orderBy: options?.orderBy || { name: 'asc' }, // Default sort by name
    });
};

/**
 * Finds a single team by its ID.
 * @param id - The ID of the team to find.
 * @returns The team object if found, otherwise null.
 */
export const findTeamById = async (id: string): Promise<Team | null> => {
    return prisma.team.findUnique({
        where: { id },
        // include: { events: true } // Optionally include related events
    });
};

/**
 * Updates an existing team.
 * @param id - The ID of the team to update.
 * @param data - The data to update the team with.
 * @returns The updated team object.
 * @throws Error if the team is not found or unique constraints are violated.
 */
export const updateTeam = async (id: string, data: UpdateTeamInput): Promise<Team> => {
    // Check if team exists first (Prisma update throws P2025 if not found)
    const teamExists = await findTeamById(id);
    if (!teamExists) {
        throw new Error('Team not found');
    }
    // Uniqueness checks handled by Prisma schema
    return prisma.team.update({
        where: { id },
        data: {
            name: data.name,
            shortName: data.shortName,
            logoUrl: data.logoUrl,
            primaryColor: data.primaryColor,
            secondaryColor: data.secondaryColor,
            colorAccent: data.colorAccent,
        },
    });
};

/**
 * Deletes a team.
 * @param id - The ID of the team to delete.
 * @returns The deleted team object.
 * @throws Error if the team is not found or if associated events exist.
 */
export const deleteTeam = async (id: string): Promise<Team> => {
    // Check if team exists
    const team = await findTeamById(id);
    if (!team) {
        throw new Error('Team not found');
    }

    // Check if team is associated with any events
    const eventCount = await prisma.event.count({
        where: { teamId: id },
    });

    if (eventCount > 0) {
        throw new Error(`Cannot delete team. It is associated with ${eventCount} event(s). Please remove team association from events first.`);
    }

    // Proceed with deletion
    return prisma.team.delete({
        where: { id },
    });
};
