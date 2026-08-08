// ─── Shared Database TypeScript Interfaces ─────────────────────────────────────
// Migrated from Supabase models. Reused for Firebase Firestore schema typings.

import { collection, getDocs, doc, setDoc, query, where, orderBy, limit as limitConstraint, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { auth } from '../firebase/auth';

class FirestoreQueryAdapter {
  constructor(public tableName: string) { }

  select(fields: string = '*'): any {
    let constraints: any[] = [];

    // Some complex joins like `*, Fan(...)` we just ignore in simple NoSQL
    if (fields && fields.includes('(')) {
      // Ignored in Firebase simple adapter
    }

    const executor = async () => {
      try {
        const colRef = collection(db, this.tableName);
        const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;
        const snaps = await getDocs(q);

        let data = snaps.docs.map(d => ({ id: d.id, ...d.data() }));

        // Handle client side 'exact' counting if head is true (used by seedData)
        if (fields === 'count' || fields.includes('count')) {
          return { data: null, count: data.length, error: null };
        }

        return { data, error: null };
      } catch (err: any) {
        console.error("Firestore Select Error:", err);
        return { data: null, error: err };
      }
    };

    const builder = {
      eq: (field: string, val: any) => {
        constraints.push(where(field, '==', val));
        return builder;
      },
      neq: (field: string, val: any) => {
        constraints.push(where(field, '!=', val));
        return builder;
      },
      gte: (field: string, val: any) => {
        constraints.push(where(field, '>=', val));
        return builder;
      },
      lte: (field: string, val: any) => {
        constraints.push(where(field, '<=', val));
        return builder;
      },
      in: (field: string, vals: any[]) => {
        if (vals && vals.length > 0) constraints.push(where(field, 'in', vals));
        return builder;
      },
      order: (field: string, opts: { ascending?: boolean } = {}) => {
        constraints.push(orderBy(field, opts.ascending ? 'asc' : 'desc'));
        return builder;
      },
      limit: (n: number) => {
        constraints.push(limitConstraint(n));
        return builder;
      },
      then: (resolve: any, reject: any) => {
        executor().then(resolve).catch(reject);
      }
    };
    return builder as any;
  }

  insert(data: any | any[]): any {
    const arr = Array.isArray(data) ? data : [data];
    const executor = async () => {
      try {
        const results = [];
        for (const item of arr) {
          const id = item.id || crypto.randomUUID();
          const docRef = doc(db, this.tableName, id);
          await setDoc(docRef, { ...item, id }, { merge: true });
          results.push({ id, ...item });
        }
        return { data: results.length === 1 ? results[0] : results, error: null };
      } catch (err: any) {
        console.error("Firestore Insert Error:", err);
        return { data: null, error: err };
      }
    };

    const builder = {
      select: () => {
        const selBuilder = {
          single: () => ({
            then: (res: any, rej: any) => executor().then(({ data, error }) => res({ data: Array.isArray(data) ? data[0] : data, error })).catch(rej)
          }),
          then: (res: any, rej: any) => executor().then(res).catch(rej)
        };
        return selBuilder;
      },
      then: (res: any, rej: any) => executor().then(res).catch(rej)
    }
    return builder;
  }

  update(data: any): any {
    let conditions: { field: string, val: any }[] = [];
    const executor = async () => {
      try {
        if (conditions.length === 1 && conditions[0].field === 'id') {
          const docRef = doc(db, this.tableName, conditions[0].val);
          await updateDoc(docRef, data);
        } else {
          console.warn("Complex update without ID not fully supported in simple adapter");
        }
        return { data: null, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    };

    const builder = {
      eq: (field: string, val: any) => {
        conditions.push({ field, val });
        return builder;
      },
      then: (res: any, rej: any) => executor().then(res).catch(rej)
    };
    return builder;
  }

  upsert(data: any): any {
    return this.insert(data);
  }

  delete(): any {
    let conditions: { field: string, val: any }[] = [];
    const executor = async () => {
      try {
        if (conditions.length === 1 && conditions[0].field === 'id') {
          const docRef = doc(db, this.tableName, conditions[0].val);
          await deleteDoc(docRef);
        } else {
          console.warn("Complex delete without ID not fully supported in simple adapter");
        }
        return { data: null, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    };

    const builder = {
      eq: (field: string, val: any) => {
        conditions.push({ field, val });
        return builder;
      },
      then: (res: any, rej: any) => executor().then(res).catch(rej)
    };
    return builder;
  }
}

export const supabase = {
  from: (table: string) => new FirestoreQueryAdapter(table),
  auth: {
    getUser: async () => {
      const user = auth.currentUser;
      if (user) {
        return { data: { user: { email: user.email, user_metadata: { name: user.displayName } } }, error: null };
      }
      return { data: { user: null }, error: null };
    },
    signOut: async () => {
      await auth.signOut();
    }
  },
  channel: (_name: string) => {
    const chainable = {
      on: () => chainable,
      subscribe: () => { },
      removeChannel: () => { }
    };
    return chainable;
  },
  removeChannel: () => { }
};


// ─── Type-safe database helpers ──────────────────────────────────────────────

export type SensorType = 'SOIL_MOISTURE' | 'TEMPERATURE' | 'HUMIDITY' | 'LIGHT' | 'WIND_SPEED' | 'RAINFALL';
export type SensorStatus = 'ONLINE' | 'OFFLINE' | 'WARNING';
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'WARNING';
export type AlertType = 'WARNING' | 'CRITICAL' | 'INFO';
export type AlertStatus = 'UNREAD' | 'READ' | 'RESOLVED';
export type UserRole = 'ADMIN' | 'FARMER' | 'WORKER';

export type EquipmentStatus = 'ON' | 'OFF';
export type ControlMode = 'MANUAL' | 'AUTOMATIC';

export interface DbSensor {
  id: string;
  name: string;
  type: SensorType;
  zoneId: string;
  deviceId: string;
  esp32Id: string | null;
  gpioPin: string | null;
  samplingRate: number;
  minThreshold: number;
  maxThreshold: number;
  enabled: boolean;
  status: SensorStatus;
  unit: string;
  createdAt: string;
  updatedAt: string;
  lastSeen: string;
}

export interface DbSensorReading {
  id: string;
  sensorId: string;
  value: number;
  temperature: number | null;
  humidity: number | null;
  moisture: number | null;
  timestamp: string;
}

export interface DbAlert {
  id: string;
  sensorId: string;
  type: AlertType;
  message: string;
  status: AlertStatus;
  createdAt: string;
}

export interface DbZone {
  id: string;
  name: string;
  farmId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbDevice {
  id: string;
  name: string;
  deviceId: string;
  macAddress: string | null;
  zoneId: string;
  firmware: string | null;
  ipAddress: string | null;
  status: DeviceStatus;
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbFarm {
  id: string;
  name: string;
  location: string | null;
  userId: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface DbFan {
  id: string;
  name: string;
  zoneId: string;
  esp32Id: string | null;
  relayChannel: number | null;
  gpioPin: string | null;
  status: EquipmentStatus;
  mode: ControlMode;
  speed: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbCooler {
  id: string;
  name: string;
  zoneId: string;
  esp32Id: string | null;
  relayChannel: number | null;
  gpioPin: string | null;
  status: EquipmentStatus;
  mode: ControlMode;
  createdAt: string;
  updatedAt: string;
}

export interface DbEquipmentEvent {
  id: string;
  fanId: string | null;
  coolerId: string | null;
  triggerReason: string;
  previousState: string;
  newState: string;
  timestamp: string;
  sensorReadingId: string | null;
}

export interface DbEnvironmentalThreshold {
  id: string;
  zoneId: string;
  tempMin: number;
  tempTarget: number;
  tempMax: number;
  humidityMin: number;
  humidityTarget: number;
  humidityMax: number;
  moistureMin: number;
  moistureTarget: number;
  moistureMax: number;
  fanAutoRules: string | null;
  coolerAutoRules: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BatchStatus = 'PLANNING' | 'ACTIVE' | 'HARVESTED' | 'COMPLETED' | 'CANCELLED';

export interface DbCropBatch {
  id: string;
  batchName: string;
  zoneId: string;
  status: BatchStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DbPlantingRecord {
  id: string;
  batchId: string;
  strain: string;
  plantedDate: string;
  seedCount: number | null;
  cloneCount: number | null;
  plantCount: number | null;
  plantingMethod: string | null;
  responsiblePerson: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbCloningRecord {
  id: string;
  batchId: string;
  date: string;
  variety: string;
  number_of_clones: number;
  planted_quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface DbSprayingRecord {
  id: string;
  batchId: string;
  date: string;
  field: string;
  chemicalUsed: string;
  time: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbTransplantingRecord {
  id: string;
  date: string;
  field: string;
  variety: string;
  number_of_plants: number;
  createdAt: string;
  updatedAt: string;
}

export interface DbCultivationRecord {
  id: string;
  batchId: string;
  recordDate: string;
  growthStage: string;
  plantCount: number | null;
  healthStatus: string | null;
  irrigationStatus: string | null;
  nutrientInfo: string | null;
  envConditions: string | null;
  notes: string | null;
  responsiblePerson: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbHarvestRecord {
  id: string;
  batchId: string;
  harvestDate: string;
  plantsHarvested: number | null;
  freshWeight: number | null;
  dryWeight: number | null;
  qualityGrade: string | null;
  notes: string | null;
  responsiblePerson: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbPostHarvestRecord {
  id: string;
  harvestId: string;
  dryingStartDate: string | null;
  dryingEndDate: string | null;
  curingStartDate: string | null;
  curingEndDate: string | null;
  finalWeight: number | null;
  storageLocation: string | null;
  storageConditions: string | null;
  productStatus: string | null;
  notes: string | null;
  responsiblePerson: string | null;
  createdAt: string;
  updatedAt: string;
}
