"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiTools = exports.getEquipmentHistoryTool = exports.getHarvestRecordsTool = exports.getOfflineDevicesTool = exports.getSensorHistoryTool = exports.getOfflineSensorsTool = exports.getCultivationBatchTool = exports.getActiveAlertsTool = exports.getEquipmentStatusTool = exports.getSensorReadingsTool = void 0;
const tools_1 = require("@langchain/core/tools");
const zod_1 = require("zod");
const firebase_1 = require("../firebase");
exports.getSensorReadingsTool = new tools_1.DynamicStructuredTool({
    name: 'get_current_sensor_readings',
    description: 'Retrieves the latest readings from all active sensors, grouped by zone. Use this to understand current environmental conditions (temperature, humidity, moisture).',
    schema: zod_1.z.object({
        zoneName: zod_1.z.string().optional().describe('Optional zone name to filter by. Leave empty for all zones.'),
    }),
    func: async ({ zoneName }) => {
        try {
            const sensorsSnap = await firebase_1.db.collection('Sensor').where('status', '==', 'ONLINE').get();
            if (sensorsSnap.empty)
                return 'No active sensors found.';
            const zonesSnap = await firebase_1.db.collection('Zone').get();
            const zonesMap = new Map(zonesSnap.docs.map(d => [d.id, d.data().name]));
            let output = [];
            for (const doc of sensorsSnap.docs) {
                const s = doc.data();
                const zName = zonesMap.get(s.zoneId) || 'Unknown Zone';
                if (zoneName && !zName.toLowerCase().includes(zoneName.toLowerCase()))
                    continue;
                // For Firebase schema, we might not have 'readings' linked, so we just use current state if cached, 
                // or say reading is assumed from latest payload.
                // Assuming physical sensors write their latest reading to their own document (e.g. currentTemp)
                const val = s.currentTemp ? `Temp: ${s.currentTemp}°C, Hum: ${s.currentHum}%, Moist: ${s.currentMoist}%` : 'Readings processing';
                output.push(`Sensor: ${s.name} [${s.type}] in Zone: ${zName} -> ${val} (Status: ${s.status})`);
            }
            return output.length > 0 ? output.join('\n') : 'No matching sensors found.';
        }
        catch (e) {
            return `Error fetching sensor readings: ${e.message}`;
        }
    },
});
exports.getEquipmentStatusTool = new tools_1.DynamicStructuredTool({
    name: 'get_equipment_status',
    description: 'Retrieves the current operational status of all fans and coolers (ON/OFF).',
    schema: zod_1.z.object({
        zoneName: zod_1.z.string().optional().describe('Optional zone name to filter by.'),
    }),
    func: async ({ zoneName }) => {
        try {
            const fansSnap = await firebase_1.db.collection('Fan').get();
            const coolersSnap = await firebase_1.db.collection('Cooler').get();
            const zonesSnap = await firebase_1.db.collection('Zone').get();
            const zonesMap = new Map(zonesSnap.docs.map(d => [d.id, d.data().name]));
            let output = [];
            fansSnap.docs.forEach(doc => {
                const f = doc.data();
                const zName = zonesMap.get(f.zoneId) || 'Unknown';
                if (!zoneName || zName.toLowerCase().includes(zoneName.toLowerCase())) {
                    output.push(`Fan: ${f.name} in Zone: ${zName} is ${f.status} (Mode: ${f.mode})`);
                }
            });
            coolersSnap.docs.forEach(doc => {
                const c = doc.data();
                const zName = zonesMap.get(c.zoneId) || 'Unknown';
                if (!zoneName || zName.toLowerCase().includes(zoneName.toLowerCase())) {
                    output.push(`Cooler: ${c.name} in Zone: ${zName} is ${c.status} (Mode: ${c.mode})`);
                }
            });
            return output.length > 0 ? output.join('\n') : 'No equipment found.';
        }
        catch (e) {
            return `Error fetching equipment status: ${e.message}`;
        }
    },
});
exports.getActiveAlertsTool = new tools_1.DynamicStructuredTool({
    name: 'get_active_alerts',
    description: 'Retrieves all unread or active environmental alerts across the farm.',
    schema: zod_1.z.object({}),
    func: async () => {
        try {
            const alertsSnap = await firebase_1.db.collection('Alert').where('status', '==', 'UNREAD').get();
            if (alertsSnap.empty)
                return 'No active alerts. The system is healthy.';
            const zonesSnap = await firebase_1.db.collection('Zone').get();
            const zonesMap = new Map(zonesSnap.docs.map(d => [d.id, d.data().name]));
            return alertsSnap.docs.map(doc => {
                const a = doc.data();
                const zName = zonesMap.get(a.zoneId) || 'Unknown Zone';
                return `[${a.type}] Alert in ${zName}: ${a.message} (Created: ${a.createdAt})`;
            }).join('\n');
        }
        catch (e) {
            return `Error fetching alerts: ${e.message}`;
        }
    },
});
exports.getCultivationBatchTool = new tools_1.DynamicStructuredTool({
    name: 'get_cultivation_batch',
    description: 'Retrieves the current active crop batches, including growth stage and planting details.',
    schema: zod_1.z.object({}),
    func: async () => {
        try {
            const batchesSnap = await firebase_1.db.collection('CropBatch').where('status', '==', 'ACTIVE').get();
            if (batchesSnap.empty)
                return 'No active cultivation batches currently.';
            const zonesSnap = await firebase_1.db.collection('Zone').get();
            const zonesMap = new Map(zonesSnap.docs.map(d => [d.id, d.data().name]));
            return batchesSnap.docs.map(doc => {
                const b = doc.data();
                const zName = zonesMap.get(b.zoneId) || 'Unknown';
                return `Batch ${b.batchName} in ${zName}: Status is ${b.status}, Updated: ${b.updatedAt || 'N/A'}.`;
            }).join('\n');
        }
        catch (e) {
            return `Error fetching batches: ${e.message}`;
        }
    },
});
exports.getOfflineSensorsTool = new tools_1.DynamicStructuredTool({
    name: 'get_offline_sensors',
    description: 'Retrieves a list of all offline or disconnected sensors across the farm. A sensor is offline if its status is OFFLINE or it has missed 5 consecutive heartbeats based on its sampling rate.',
    schema: zod_1.z.object({}),
    func: async () => {
        try {
            const sensorsSnap = await firebase_1.db.collection('Sensor').get();
            if (sensorsSnap.empty)
                return 'No sensors found in the system.';
            const zonesSnap = await firebase_1.db.collection('Zone').get();
            const zonesMap = new Map(zonesSnap.docs.map(d => [d.id, d.data().name]));
            const now = new Date().getTime();
            let offline = [];
            sensorsSnap.docs.forEach(doc => {
                const s = doc.data();
                if (s.status === 'OFFLINE') {
                    offline.push(s);
                }
                else if (s.lastSeen) {
                    const last = new Date(s.lastSeen).getTime();
                    if ((now - last) > ((s.samplingRate || 10) * 5 * 1000))
                        offline.push(s);
                }
            });
            if (offline.length === 0)
                return 'All sensors are currently online and reporting normally.';
            return offline.map((s) => {
                const zName = zonesMap.get(s.zoneId) || 'Unknown';
                return `[OFFLINE] Sensor: ${s.name} (Type: ${s.type}) in Zone: ${zName}.`;
            }).join('\n');
        }
        catch (e) {
            return `Error fetching offline sensors: ${e.message}`;
        }
    },
});
exports.getSensorHistoryTool = new tools_1.DynamicStructuredTool({
    name: 'get_sensor_history',
    description: 'Retrieves historical readings for a specific sensor over a given time period.',
    schema: zod_1.z.object({
        sensorId: zod_1.z.string().describe('The UUID of the sensor.'),
        limit: zod_1.z.number().optional().default(10).describe('Number of historical records to fetch.'),
    }),
    func: async ({ sensorId, limit }) => {
        try {
            const snap = await firebase_1.db.collection('SensorReading').where('sensorId', '==', sensorId).orderBy('timestamp', 'desc').limit(limit).get();
            if (snap.empty)
                return 'No historical data found for this sensor.';
            return snap.docs.map(d => {
                const r = d.data();
                return `Time: ${new Date(r.timestamp).toISOString()} -> Value: ${r.value}`;
            }).join('\n');
        }
        catch (e) {
            return `Error fetching history: ${e.message}`;
        }
    },
});
exports.getOfflineDevicesTool = new tools_1.DynamicStructuredTool({
    name: 'get_offline_devices',
    description: 'Retrieves a list of all offline ESP32 microcontrollers/devices (hardware controllers).',
    schema: zod_1.z.object({}),
    func: async () => {
        try {
            const devicesSnap = await firebase_1.db.collection('Device').get();
            if (devicesSnap.empty)
                return 'No devices configured.';
            const offline = devicesSnap.docs.filter(d => d.data().status === 'OFFLINE');
            if (offline.length === 0)
                return 'All hardware devices are online.';
            return offline.map(d => `[OFFLINE] Device: ${d.data().name}`).join('\n');
        }
        catch (e) {
            return `Error fetching offline devices: ${e.message}`;
        }
    },
});
exports.getHarvestRecordsTool = new tools_1.DynamicStructuredTool({
    name: 'get_harvest_records',
    description: 'Retrieves recent crop harvest records and yields.',
    schema: zod_1.z.object({
        limit: zod_1.z.number().optional().default(5).describe('Number of records to fetch.')
    }),
    func: async ({ limit }) => {
        try {
            const harvestsSnap = await firebase_1.db.collection('HarvestRecord').orderBy('harvestDate', 'desc').limit(limit).get();
            if (harvestsSnap.empty)
                return 'No harvest records found.';
            return harvestsSnap.docs.map(d => {
                const h = d.data();
                return `Harvest on ${new Date(h.harvestDate).toDateString()}: Yielded ${h.freshWeight}g fresh, ${h.dryWeight || 'Pending'}g dry. Grade: ${h.qualityGrade || 'N/A'}.`;
            }).join('\n');
        }
        catch (e) {
            return `Error fetching harvests: ${e.message}`;
        }
    },
});
exports.getEquipmentHistoryTool = new tools_1.DynamicStructuredTool({
    name: 'get_equipment_history',
    description: 'Retrieves a log of recent equipment state changes (e.g. when fans or coolers turned ON/OFF).',
    schema: zod_1.z.object({
        limit: zod_1.z.number().optional().default(10).describe('Number of events to retrieve.')
    }),
    func: async ({ limit }) => {
        try {
            const eventsSnap = await firebase_1.db.collection('EquipmentEvent').orderBy('timestamp', 'desc').limit(limit).get();
            if (eventsSnap.empty)
                return 'No equipment events found.';
            return eventsSnap.docs.map(d => {
                const e = d.data();
                return `[${new Date(e.timestamp).toISOString()}] Equipment changed from ${e.previousState} to ${e.newState}. Reason: ${e.triggerReason}`;
            }).join('\n');
        }
        catch (e) {
            return `Error fetching events: ${e.message}`;
        }
    },
});
exports.aiTools = [
    exports.getSensorReadingsTool,
    exports.getEquipmentStatusTool,
    exports.getActiveAlertsTool,
    exports.getCultivationBatchTool,
    exports.getOfflineSensorsTool,
    exports.getSensorHistoryTool,
    exports.getOfflineDevicesTool,
    exports.getHarvestRecordsTool,
    exports.getEquipmentHistoryTool
];
