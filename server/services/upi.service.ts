import { prisma } from '@/lib/prisma';
import { UpiSetting } from '@prisma/client';

/**
 * Finds the currently active UPI setting.
 * @returns The active UpiSetting object, or null if none is active or found.
 */
export const getActiveUpiSetting = async (): Promise<UpiSetting | null> => {
    return prisma.upiSetting.findFirst({
        where: { isActive: true },
    });
};

/**
 * Updates the active UPI setting.
 * Deactivates any currently active setting and creates/activates the new one.
 * @param newUpiId - The new UPI ID (VPA) to activate.
 * @returns The newly created and activated UpiSetting object.
 */
export const updateActiveUpiSetting = async (newUpiId: string): Promise<UpiSetting> => {
    // Basic validation (could be enhanced)
    if (!newUpiId || !/^[a-zA-Z0-9.\-_]+@[a-zA-Z0-9]+$/.test(newUpiId)) {
        throw new Error('Invalid UPI ID format provided.');
    }

    return prisma.$transaction(async (tx) => {
        // 1. Deactivate all existing settings
        await tx.upiSetting.updateMany({
            where: { isActive: true },
            data: { isActive: false },
        });

        // 2. Check if this UPI ID already exists (but is inactive)
        let existingSetting = await tx.upiSetting.findUnique({
            where: { upiId: newUpiId },
        });

        if (existingSetting) {
            // 3a. If exists, reactivate it
            const updatedSetting = await tx.upiSetting.update({
                where: { id: existingSetting.id },
                data: { isActive: true },
            });
            console.log(`Reactivated existing UPI setting: ${updatedSetting.upiId}`);
            return updatedSetting;
        } else {
            // 3b. If not exists, create a new active setting
            const newSetting = await tx.upiSetting.create({
                data: {
                    upiId: newUpiId,
                    isActive: true,
                    // updatedByAdminId: adminId // Optional: Track who updated
                },
            });
            console.log(`Created and activated new UPI setting: ${newSetting.upiId}`);
            return newSetting;
        }
    });
};

/**
 * Creates the initial default UPI setting if none exists.
 * Used for bootstrapping or as a fallback mechanism.
 * @param defaultUpiId - The default UPI ID to set.
 */
export const createDefaultUpiSetting = async (defaultUpiId: string): Promise<UpiSetting | null> => {
    const existingSetting = await prisma.upiSetting.findFirst();
    if (!existingSetting) {
         console.log(`No UPI setting found. Creating default: ${defaultUpiId}`);
        return prisma.upiSetting.create({
            data: {
                upiId: defaultUpiId,
                isActive: true,
            },
        });
    }
    return null; // Return null if a setting already exists
};

