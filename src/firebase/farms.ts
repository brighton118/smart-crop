import { getDocuments, setDocument, getDocument } from './firestore';
import { query, where } from 'firebase/firestore';
import { DbFarm, DbZone } from '../lib/supabase';
import { createUserProfile } from './users';
import { auth } from './auth';

export const getFarmsByUser = async (userId: string) => {
    return await getDocuments<DbFarm>('Farm', [where('userId', '==', userId)]);
};

export const getZonesByFarm = async (farmId: string) => {
    return await getDocuments<DbZone>('Zone', [where('farmId', '==', farmId)]);
};

export async function getOrCreateDefaultFarm(userId: string, farmName: string = "KindBuds Facility 1"): Promise<{ farm: DbFarm, zone: DbZone, zones: DbZone[] } | null> {
    try {
        const farms = await getFarmsByUser(userId);
        let farm = farms[0];

        if (!farm) {
            // Ensure user profile exists
            let email = `user_${userId}@kindbudsltd.com`;
            let name = "Farmer";
            if (auth.currentUser?.uid === userId) {
                email = auth.currentUser.email || email;
                name = auth.currentUser.displayName || name;
            }

            await createUserProfile(userId, {
                id: userId,
                email,
                name,
                password: "MANAGED_BY_FIREBASE_AUTH",
                updatedAt: new Date().toISOString()
            });

            // Create new farm
            const newFarmId = crypto.randomUUID();
            farm = { id: newFarmId, name: farmName, userId: userId, location: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
            await setDocument('Farm', newFarmId, farm);
        }

        let existingZones = await getZonesByFarm(farm.id);
        const requiredZoneNames = ["Zone 1", "Zone 2", "Greenhouse"];
        const existingZoneNames = existingZones.map(z => z.name);
        const missingZones = requiredZoneNames.filter(name => !existingZoneNames.includes(name));

        if (missingZones.length > 0) {
            const now = new Date().toISOString();
            for (const name of missingZones) {
                const newZoneId = crypto.randomUUID();
                const newZ = { id: newZoneId, name, farmId: farm.id, createdAt: now, updatedAt: now };
                await setDocument('Zone', newZoneId, newZ);
                existingZones.push(newZ);
            }
        }

        return { farm, zone: existingZones[0], zones: existingZones };
    } catch (error) {
        console.error("Error setting up default farm/zone:", error);
        return null;
    }
}
