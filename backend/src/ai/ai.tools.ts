import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { db } from '../firebase';

export const getSensorReadingsTool = new DynamicStructuredTool({
    name: 'get_current_sensor_readings',
    description: 'Retrieves the latest readings from all active sensors, grouped by zone. Use this to understand current environmental conditions (temperature, humidity, moisture).',
    schema: z.object({
        zoneName: z.string().optional().describe('Optional zone name to filter by. Leave empty for all zones.'),
    }),
    func: async ({ zoneName }) => {
        try {
            const sensorsSnap = await db.collection('Sensor').where('status', '==', 'ONLINE').get();
            if (sensorsSnap.empty) return 'No active sensors found.';

            const zonesSnap = await db.collection('Zone').get();
            const zonesMap = new Map(zonesSnap.docs.map(d => [d.id, d.data().name]));

            const output = [];
            for (const doc of sensorsSnap.docs) {
                const s = doc.data();
                const zName = zonesMap.get(s.zoneId) || 'Unknown Zone';

                if (zoneName && !zName.toLowerCase().includes(zoneName.toLowerCase())) continue;

                const val = s.currentTemp ? `Temp: ${s.currentTemp}°C, Hum: ${s.currentHum}%, Moist: ${s.currentMoist}%` : 'Readings processing';
                output.push(`Sensor: ${s.name} [${s.type}] in Zone: ${zName} -> ${val} (Status: ${s.status})`);
            }
            return output.length > 0 ? output.join('\n') : 'No matching sensors found.';
        } catch (e: any) {
            return `Error fetching sensor readings: ${e.message}`;
        }
    },
});

export const getEquipmentStatusTool = new DynamicStructuredTool({
    name: 'get_equipment_status',
    description: 'Retrieves the current operational status of all fans and coolers (ON/OFF).',
    schema: z.object({
        zoneName: z.string().optional().describe('Optional zone name to filter by.'),
    }),
    func: async ({ zoneName }) => {
        try {
            const fansSnap = await db.collection('Fan').get();
            const coolersSnap = await db.collection('Cooler').get();
            const zonesSnap = await db.collection('Zone').get();
            const zonesMap = new Map(zonesSnap.docs.map(d => [d.id, d.data().name]));

            const output: string[] = [];
            fansSnap.docs.forEach(doc => {
                const f = doc.data();
                const zName = zonesMap.get(f.zoneId) || 'Unknown';
                if (!zoneName || zName.toLowerCase().includes(zoneName.toLowerCase())) {
                    output.push(`Fan: ${f.name} in Zone: ${zName} is ${f.status} (Mode: ${f.mode || f.controlMode || 'AUTOMATIC'})`);
                }
            });
            coolersSnap.docs.forEach(doc => {
                const c = doc.data();
                const zName = zonesMap.get(c.zoneId) || 'Unknown';
                if (!zoneName || zName.toLowerCase().includes(zoneName.toLowerCase())) {
                    output.push(`Cooler: ${c.name} in Zone: ${zName} is ${c.status} (Mode: ${c.mode || c.controlMode || 'AUTOMATIC'})`);
                }
            });

            return output.length > 0 ? output.join('\n') : 'No equipment found.';
        } catch (e: any) {
            return `Error fetching equipment status: ${e.message}`;
        }
    },
});

export const getActiveAlertsTool = new DynamicStructuredTool({
    name: 'get_active_alerts',
    description: 'Retrieves all unread or active environmental alerts across the farm.',
    schema: z.object({}),
    func: async () => {
        try {
            const alertsSnap = await db.collection('Alert').where('status', '==', 'UNREAD').get();
            if (alertsSnap.empty) return 'No active alerts. The system is healthy.';

            const zonesSnap = await db.collection('Zone').get();
            const zonesMap = new Map(zonesSnap.docs.map(d => [d.id, d.data().name]));

            return alertsSnap.docs.map(doc => {
                const a = doc.data();
                const zName = zonesMap.get(a.zoneId) || 'Unknown Zone';
                return `[${a.type}] Alert in ${zName}: ${a.message} (Created: ${a.createdAt})`;
            }).join('\n');
        } catch (e: any) {
            return `Error fetching alerts: ${e.message}`;
        }
    },
});

export const getCultivationBatchTool = new DynamicStructuredTool({
    name: 'get_cultivation_batch',
    description: 'Retrieves the current active crop batches, including growth stage and planting details.',
    schema: z.object({}),
    func: async () => {
        try {
            const batchesSnap = await db.collection('CropBatch').get();
            if (batchesSnap.empty) return 'No cultivation batches currently.';
            const zonesSnap = await db.collection('Zone').get();
            const zonesMap = new Map(zonesSnap.docs.map(d => [d.id, d.data().name]));

            return batchesSnap.docs.map(doc => {
                const b = doc.data();
                const zName = zonesMap.get(b.zoneId) || 'Unknown';
                return `Batch ${b.batchName} in ${zName}: Status is ${b.status}, Updated: ${b.updatedAt || 'N/A'}.`;
            }).join('\n');
        } catch (e: any) {
            return `Error fetching batches: ${e.message}`;
        }
    },
});

export const getFarmLifecycleRecordsTool = new DynamicStructuredTool({
    name: 'get_farm_lifecycle_records',
    description: 'Retrieves Farm Data lifecycle records from Firebase Firestore across Planting (Seeds, Clones, Transplanting), Vegetative (Topping/Pruning, Discarded), Pre_Harvest, Post_Harvest, and Storage & Packaging stages.',
    schema: z.object({
        stage: z.enum([
            'ALL',
            'SEEDS',
            'CLONES',
            'TRANSPLANTING',
            'VEGETATIVE',
            'DISCARDED',
            'PRE_HARVEST',
            'POST_HARVEST',
            'STORAGE_PACKAGING'
        ]).optional().default('ALL').describe('The lifecycle stage to query.'),
        limit: z.number().optional().default(10).describe('Max records per stage.')
    }),
    func: async ({ stage, limit }) => {
        try {
            const sections: string[] = [];

            if (stage === 'ALL' || stage === 'SEEDS') {
                const snap = await db.collection('SeedRecord').limit(limit).get();
                if (!snap.empty) {
                    sections.push('--- Planting: 1. Seeds ---\n' + snap.docs.map(d => {
                        const r = d.data();
                        return `Date: ${r.date}, Variety: ${r.variety}, No. of Seeds: ${r.number_of_seeds}, Planted: ${r.planted_quantity}`;
                    }).join('\n'));
                }
            }

            if (stage === 'ALL' || stage === 'CLONES') {
                const snap = await db.collection('CloningRecord').limit(limit).get();
                if (!snap.empty) {
                    sections.push('--- Planting: 2. Clones ---\n' + snap.docs.map(d => {
                        const r = d.data();
                        return `Date: ${r.date}, Variety: ${r.variety}, No. of Clones: ${r.number_of_clones}, Planted: ${r.planted_quantity}`;
                    }).join('\n'));
                }
            }

            if (stage === 'ALL' || stage === 'TRANSPLANTING') {
                const snap = await db.collection('TransplantingRecord').limit(limit).get();
                if (!snap.empty) {
                    sections.push('--- Transplanting ---\n' + snap.docs.map(d => {
                        const r = d.data();
                        return `Date: ${r.date}, Variety: ${r.variety}, No. of Plants: ${r.number_of_plants}, Field: ${r.field}`;
                    }).join('\n'));
                }
            }

            if (stage === 'ALL' || stage === 'VEGETATIVE') {
                const snap = await db.collection('VegetativeRecord').limit(limit).get();
                if (!snap.empty) {
                    sections.push('--- Vegetative (Topping & Pruning) ---\n' + snap.docs.map(d => {
                        const r = d.data();
                        return `Topping Date: ${r.toppingDate}, Pruning Date: ${r.pruningDate}`;
                    }).join('\n'));
                }
            }

            if (stage === 'ALL' || stage === 'DISCARDED') {
                const snap = await db.collection('DiscardedRecord').limit(limit).get();
                if (!snap.empty) {
                    sections.push('--- Vegetative (Discarded) ---\n' + snap.docs.map(d => {
                        const r = d.data();
                        return `Date: ${r.date}, Variety: ${r.variety}, Field: ${r.field}, Reason: ${r.reason}`;
                    }).join('\n'));
                }
            }

            if (stage === 'ALL' || stage === 'PRE_HARVEST') {
                const snap = await db.collection('PreHarvestRecord').limit(limit).get();
                if (!snap.empty) {
                    sections.push('--- Pre_Harvest ---\n' + snap.docs.map(d => {
                        const r = d.data();
                        return `Date: ${r.date}, Batch: ${r.batch}, Strain: ${r.strain}, Fresh Weight: ${r.freshWeight}kg, Field: ${r.field}`;
                    }).join('\n'));
                }
            }

            if (stage === 'ALL' || stage === 'POST_HARVEST') {
                const snap = await db.collection('PostHarvestRecord').limit(limit).get();
                if (!snap.empty) {
                    sections.push('--- Post_Harvest ---\n' + snap.docs.map(d => {
                        const r = d.data();
                        return `Date: ${r.date}, Batch: ${r.batch}, Strain: ${r.strain}, Dry Wt Before Trimming: ${r.dryWeightBeforeTrimming}kg, Dry Wt After Trimming: ${r.dryWeightAfterTrimming}kg`;
                    }).join('\n'));
                }
            }

            if (stage === 'ALL' || stage === 'STORAGE_PACKAGING') {
                const snap = await db.collection('StoragePackagingRecord').limit(limit).get();
                if (!snap.empty) {
                    sections.push('--- Storage & Packaging ---\n' + snap.docs.map(d => {
                        const r = d.data();
                        return `Date: ${r.date}, Variety: ${r.variety}, Quantity: ${r.quantity}`;
                    }).join('\n'));
                }
            }

            return sections.length > 0 ? sections.join('\n\n') : 'No farm lifecycle records found for the requested stage.';
        } catch (e: any) {
            return `Error fetching farm lifecycle records: ${e.message}`;
        }
    },
});

export const getOfflineSensorsTool = new DynamicStructuredTool({
    name: 'get_offline_sensors',
    description: 'Retrieves a list of all offline or disconnected sensors across the farm.',
    schema: z.object({}),
    func: async () => {
        try {
            const sensorsSnap = await db.collection('Sensor').get();
            if (sensorsSnap.empty) return 'No sensors found in the system.';

            const zonesSnap = await db.collection('Zone').get();
            const zonesMap = new Map(zonesSnap.docs.map(d => [d.id, d.data().name]));

            const now = new Date().getTime();
            const offline: any[] = [];
            sensorsSnap.docs.forEach(doc => {
                const s = doc.data();
                if (s.status === 'OFFLINE') {
                    offline.push(s);
                } else if (s.lastSeen) {
                    const last = new Date(s.lastSeen).getTime();
                    if ((now - last) > ((s.samplingRate || 10) * 5 * 1000)) offline.push(s);
                }
            });

            if (offline.length === 0) return 'All sensors are currently online and reporting normally.';

            return offline.map((s: any) => {
                const zName = zonesMap.get(s.zoneId) || 'Unknown';
                return `[OFFLINE] Sensor: ${s.name} (Type: ${s.type}) in Zone: ${zName}.`;
            }).join('\n');
        } catch (e: any) {
            return `Error fetching offline sensors: ${e.message}`;
        }
    },
});

export const getSensorHistoryTool = new DynamicStructuredTool({
    name: 'get_sensor_history',
    description: 'Retrieves historical readings for a specific sensor over a given time period.',
    schema: z.object({
        sensorId: z.string().describe('The UUID of the sensor.'),
        limit: z.number().optional().default(10).describe('Number of historical records to fetch.'),
    }),
    func: async ({ sensorId, limit }) => {
        try {
            const snap = await db.collection('SensorReading').where('sensorId', '==', sensorId).orderBy('timestamp', 'desc').limit(limit).get();
            if (snap.empty) return 'No historical data found for this sensor.';
            return snap.docs.map(d => {
                const r = d.data();
                return `Time: ${new Date(r.timestamp).toISOString()} -> Value: ${r.value}`;
            }).join('\n');
        } catch (e: any) {
            return `Error fetching history: ${e.message}`;
        }
    },
});

export const getOfflineDevicesTool = new DynamicStructuredTool({
    name: 'get_offline_devices',
    description: 'Retrieves a list of all offline ESP32 microcontrollers/devices (hardware controllers).',
    schema: z.object({}),
    func: async () => {
        try {
            const devicesSnap = await db.collection('Device').get();
            if (devicesSnap.empty) return 'No devices configured.';

            const offline = devicesSnap.docs.filter(d => d.data().status === 'OFFLINE');
            if (offline.length === 0) return 'All hardware devices are online.';

            return offline.map(d => `[OFFLINE] Device: ${d.data().name}`).join('\n');
        } catch (e: any) {
            return `Error fetching offline devices: ${e.message}`;
        }
    },
});

export const getHarvestRecordsTool = new DynamicStructuredTool({
    name: 'get_harvest_records',
    description: 'Retrieves recent crop harvest records and yields.',
    schema: z.object({
        limit: z.number().optional().default(5).describe('Number of records to fetch.')
    }),
    func: async ({ limit }) => {
        try {
            const harvestsSnap = await db.collection('HarvestRecord').orderBy('harvestDate', 'desc').limit(limit).get();
            if (harvestsSnap.empty) return 'No harvest records found.';
            return harvestsSnap.docs.map(d => {
                const h = d.data();
                return `Harvest on ${new Date(h.harvestDate).toDateString()}: Yielded ${h.freshWeight}g fresh, ${h.dryWeight || 'Pending'}g dry. Grade: ${h.qualityGrade || 'N/A'}.`;
            }).join('\n');
        } catch (e: any) {
            return `Error fetching harvests: ${e.message}`;
        }
    },
});

export const getEquipmentHistoryTool = new DynamicStructuredTool({
    name: 'get_equipment_history',
    description: 'Retrieves a log of recent equipment state changes (e.g. when fans or coolers turned ON/OFF).',
    schema: z.object({
        limit: z.number().optional().default(10).describe('Number of events to retrieve.')
    }),
    func: async ({ limit }) => {
        try {
            const eventsSnap = await db.collection('EquipmentEvent').orderBy('timestamp', 'desc').limit(limit).get();
            if (eventsSnap.empty) return 'No equipment events found.';
            return eventsSnap.docs.map(d => {
                const e = d.data();
                return `[${new Date(e.timestamp).toISOString()}] Equipment changed from ${e.previousState} to ${e.newState}. Reason: ${e.triggerReason}`;
            }).join('\n');
        } catch (e: any) {
            return `Error fetching events: ${e.message}`;
        }
    },
});

export const aiTools = [
    getSensorReadingsTool,
    getEquipmentStatusTool,
    getActiveAlertsTool,
    getCultivationBatchTool,
    getFarmLifecycleRecordsTool,
    getOfflineSensorsTool,
    getSensorHistoryTool,
    getOfflineDevicesTool,
    getHarvestRecordsTool,
    getEquipmentHistoryTool
];
