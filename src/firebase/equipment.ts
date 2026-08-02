import { getDocuments, setDocument, deleteDocument, updateDocument } from './firestore';
import { query, where, orderBy, limit as _limit } from 'firebase/firestore';
import { DbSensor, DbFan, DbCooler, DbEnvironmentalThreshold, DbEquipmentEvent } from '../lib/supabase';

// ─── Sensors ─────────────────────────────────────────────────────────────

export const getSensorsByZone = async (zoneId: string) => {
    return await getDocuments<DbSensor>('Sensor', [where('zoneId', '==', zoneId)]);
};

export const getSensorsByZones = async (zoneIds: string[]) => {
    if (zoneIds.length === 0) return [];
    return await getDocuments<DbSensor>('Sensor', [where('zoneId', 'in', zoneIds)]);
};

export const createSensor = async (id: string, data: DbSensor) => {
    await setDocument('Sensor', id, data);
};

export const deleteSensor = async (id: string) => {
    await deleteDocument('Sensor', id);
};

export const getAllSensors = async () => {
    return await getDocuments<DbSensor>('Sensor', []);
};

// ─── Equipment (Fans/Coolers) ─────────────────────────────────────────────

export const getFansByZones = async (zoneIds: string[]) => {
    if (zoneIds.length === 0) return [];
    return await getDocuments<DbFan>('Fan', [where('zoneId', 'in', zoneIds)]);
};

export const getCoolersByZones = async (zoneIds: string[]) => {
    if (zoneIds.length === 0) return [];
    return await getDocuments<DbCooler>('Cooler', [where('zoneId', 'in', zoneIds)]);
};

export const updateFan = async (id: string, updates: Partial<DbFan>) => {
    await updateDocument('Fan', id, updates);
};

export const updateCooler = async (id: string, updates: Partial<DbCooler>) => {
    await updateDocument('Cooler', id, updates);
};

export const createEquipmentEvent = async (data: any) => {
    // In Firestore, if we don't supply an ID, we can just generate one using UUID 
    // but our setDocument requires an ID.
    const id = crypto.randomUUID();
    await setDocument('EquipmentEvent', id, { ...data, timestamp: new Date().toISOString() });
}

export const getRecentEquipmentEvents = async (count: number = 50) => {
    return await getDocuments<DbEquipmentEvent>('EquipmentEvent', [
        orderBy('timestamp', 'desc'),
        _limit(count)
    ]);
};

// ─── Thresholds ─────────────────────────────────────────────────────────

export const getThresholdsByZones = async (zoneIds: string[]) => {
    if (zoneIds.length === 0) return [];
    return await getDocuments<DbEnvironmentalThreshold>('EnvironmentalThreshold', [where('zoneId', 'in', zoneIds)]);
};

export const upsertThreshold = async (id: string, data: DbEnvironmentalThreshold) => {
    await setDocument('EnvironmentalThreshold', id, data); // merge is true by default
};

