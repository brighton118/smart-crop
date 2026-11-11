// ─── Firebase Firestore, Auth & Storage Client Adapter ────────────────────────
// Provides a unified query builder & real-time listener interface backed 100% by Firebase.

import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  query,
  where,
  orderBy,
  limit as limitConstraint,
  deleteDoc,
  updateDoc,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { auth, updateProfile, updatePassword } from '../firebase/auth';

async function resolveRelationsForRows(tableName: string, rows: any[], fields: string): Promise<any[]> {
  if (!fields || !fields.includes('(') || rows.length === 0) {
    return rows;
  }

  try {
    // Zone relations: devices:Device(*), cropBatches:CropBatch(*), fans:Fan(*), coolers:Cooler(*), sensors:Sensor(*), envThreshold:EnvironmentalThreshold(*)
    if (tableName === 'Zone') {
      const [devicesSnap, batchesSnap, fansSnap, coolersSnap, sensorsSnap, thresholdsSnap] = await Promise.all([
        fields.includes('Device') ? getDocs(collection(db, 'Device')) : Promise.resolve(null),
        fields.includes('CropBatch') ? getDocs(collection(db, 'CropBatch')) : Promise.resolve(null),
        fields.includes('Fan') ? getDocs(collection(db, 'Fan')) : Promise.resolve(null),
        fields.includes('Cooler') ? getDocs(collection(db, 'Cooler')) : Promise.resolve(null),
        fields.includes('Sensor') ? getDocs(collection(db, 'Sensor')) : Promise.resolve(null),
        fields.includes('EnvironmentalThreshold') ? getDocs(collection(db, 'EnvironmentalThreshold')) : Promise.resolve(null),
      ]);

      const devices = devicesSnap?.docs.map(d => ({ id: d.id, ...d.data() })) || [];
      const batches = batchesSnap?.docs.map(d => ({ id: d.id, ...d.data() })) || [];
      const fans = fansSnap?.docs.map(d => ({ id: d.id, ...d.data() })) || [];
      const coolers = coolersSnap?.docs.map(d => ({ id: d.id, ...d.data() })) || [];
      const sensors = sensorsSnap?.docs.map(d => ({ id: d.id, ...d.data() })) || [];
      const thresholds = thresholdsSnap?.docs.map(d => ({ id: d.id, ...d.data() })) || [];

      return rows.map(zone => ({
        ...zone,
        devices: devices.filter((d: any) => d.zoneId === zone.id),
        cropBatches: batches.filter((b: any) => b.zoneId === zone.id),
        fans: fans.filter((f: any) => f.zoneId === zone.id),
        coolers: coolers.filter((c: any) => c.zoneId === zone.id),
        sensors: sensors.filter((s: any) => s.zoneId === zone.id),
        envThreshold: thresholds.filter((t: any) => t.zoneId === zone.id),
      }));
    }

    // Alert relations: sensor:Sensor(*)
    if (tableName === 'Alert' && fields.includes('Sensor')) {
      const sensorsSnap = await getDocs(collection(db, 'Sensor'));
      const sensorMap = new Map(sensorsSnap.docs.map(d => [d.id, { id: d.id, ...d.data() }]));
      return rows.map(alert => ({
        ...alert,
        sensor: sensorMap.get(alert.sensorId) || null,
      }));
    }

    // EquipmentEvent relations: Fan(...), Cooler(...)
    if (tableName === 'EquipmentEvent' && (fields.includes('Fan') || fields.includes('Cooler'))) {
      const [fansSnap, coolersSnap] = await Promise.all([
        fields.includes('Fan') ? getDocs(collection(db, 'Fan')) : Promise.resolve(null),
        fields.includes('Cooler') ? getDocs(collection(db, 'Cooler')) : Promise.resolve(null),
      ]);
      const fanMap = new Map(fansSnap?.docs.map(d => [d.id, { id: d.id, ...d.data() }]) || []);
      const coolerMap = new Map(coolersSnap?.docs.map(d => [d.id, { id: d.id, ...d.data() }]) || []);

      return rows.map(evt => ({
        ...evt,
        Fan: evt.fanId ? fanMap.get(evt.fanId) || null : null,
        Cooler: evt.coolerId ? coolerMap.get(evt.coolerId) || null : null,
      }));
    }

    // HardwareConnection relations: relayModule:RelayModule(*), sensor:Sensor(*), fan:Fan(*), cooler:Cooler(*)
    if (tableName === 'HardwareConnection') {
      const [relaysSnap, sensorsSnap, fansSnap, coolersSnap] = await Promise.all([
        fields.includes('RelayModule') ? getDocs(collection(db, 'RelayModule')) : Promise.resolve(null),
        fields.includes('Sensor') ? getDocs(collection(db, 'Sensor')) : Promise.resolve(null),
        fields.includes('Fan') ? getDocs(collection(db, 'Fan')) : Promise.resolve(null),
        fields.includes('Cooler') ? getDocs(collection(db, 'Cooler')) : Promise.resolve(null),
      ]);
      const relayMap = new Map(relaysSnap?.docs.map(d => [d.id, { id: d.id, ...d.data() }]) || []);
      const sensorMap = new Map(sensorsSnap?.docs.map(d => [d.id, { id: d.id, ...d.data() }]) || []);
      const fanMap = new Map(fansSnap?.docs.map(d => [d.id, { id: d.id, ...d.data() }]) || []);
      const coolerMap = new Map(coolersSnap?.docs.map(d => [d.id, { id: d.id, ...d.data() }]) || []);

      return rows.map(conn => {
        const sensorId = conn.sensorId || (conn.targetModel === 'Sensor' ? conn.targetId : null);
        const fanId = conn.fanId || (conn.targetModel === 'Fan' ? conn.targetId : null);
        const coolerId = conn.coolerId || (conn.targetModel === 'Cooler' ? conn.targetId : null);
        return {
          ...conn,
          relayModule: conn.relayModuleId ? relayMap.get(conn.relayModuleId) || null : null,
          sensor: sensorId ? sensorMap.get(sensorId) || null : null,
          fan: fanId ? fanMap.get(fanId) || null : null,
          cooler: coolerId ? coolerMap.get(coolerId) || null : null,
        };
      });
    }
  } catch (err) {
    console.warn('Relation resolution warning:', err);
  }

  return rows;
}

class FirestoreQueryAdapter {
  constructor(public tableName: string) { }

  select(fields: string = '*', options?: { count?: string; head?: boolean }): any {
    let constraints: any[] = [];
    let eqIdFilter: string | null = null;
    let isSingle = false;

    const executor = async () => {
      try {
        let data: any[] = [];

        if (eqIdFilter && constraints.length === 0) {
          const docRef = doc(db, this.tableName, eqIdFilter);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            data = [{ id: snap.id, ...snap.data() }];
          }
        } else {
          const colRef = collection(db, this.tableName);
          const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;
          const snaps = await getDocs(q);
          data = snaps.docs.map(d => ({ id: d.id, ...d.data() }));
        }

        if (options?.count || fields === 'count' || fields.includes('count')) {
          return { data: options?.head ? null : data, count: data.length, error: null };
        }

        data = await resolveRelationsForRows(this.tableName, data, fields);

        if (isSingle) {
          return { data: data[0] || null, error: null };
        }

        return { data, error: null };
      } catch (err: any) {
        console.error(`Firestore Select Error [${this.tableName}]:`, err);
        return { data: isSingle ? null : [], error: err };
      }
    };

    const builder = {
      eq: (field: string, val: any) => {
        if (field === 'id') {
          eqIdFilter = val;
        }
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
        if (vals && vals.length > 0) {
          constraints.push(where(field, 'in', vals.slice(0, 30)));
        }
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
      single: () => {
        isSingle = true;
        return builder;
      },
      maybeSingle: () => {
        isSingle = true;
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
          const now = new Date().toISOString();
          const record = {
            createdAt: item.createdAt || now,
            updatedAt: item.updatedAt || now,
            ...item,
            id,
          };
          await setDoc(docRef, record, { merge: true });
          results.push(record);
        }
        return { data: results.length === 1 ? results[0] : results, error: null };
      } catch (err: any) {
        console.error(`Firestore Insert Error [${this.tableName}]:`, err);
        return { data: null, error: err };
      }
    };

    const builder = {
      select: () => {
        const selBuilder = {
          single: () => ({
            then: (res: any, rej: any) =>
              executor()
                .then(({ data, error }) => res({ data: Array.isArray(data) ? data[0] : data, error }))
                .catch(rej),
          }),
          then: (res: any, rej: any) => executor().then(res).catch(rej),
        };
        return selBuilder;
      },
      then: (res: any, rej: any) => executor().then(res).catch(rej),
    };
    return builder;
  }

  update(data: any): any {
    let conditions: { field: string; val: any }[] = [];
    const executor = async () => {
      try {
        if (conditions.length === 1 && conditions[0].field === 'id') {
          const docRef = doc(db, this.tableName, conditions[0].val);
          await updateDoc(docRef, { ...data, updatedAt: new Date().toISOString() });
        } else if (conditions.length > 0) {
          const colRef = collection(db, this.tableName);
          const q = query(colRef, ...conditions.map(c => where(c.field, '==', c.val)));
          const snaps = await getDocs(q);
          for (const d of snaps.docs) {
            await updateDoc(doc(db, this.tableName, d.id), { ...data, updatedAt: new Date().toISOString() });
          }
        }
        return { data: null, error: null };
      } catch (err: any) {
        console.error(`Firestore Update Error [${this.tableName}]:`, err);
        return { data: null, error: err };
      }
    };

    const builder = {
      eq: (field: string, val: any) => {
        conditions.push({ field, val });
        return builder;
      },
      then: (res: any, rej: any) => executor().then(res).catch(rej),
    };
    return builder;
  }

  upsert(data: any): any {
    return this.insert(data);
  }

  delete(): any {
    let conditions: { field: string; val: any }[] = [];
    const executor = async () => {
      try {
        if (conditions.length === 1 && conditions[0].field === 'id') {
          const docRef = doc(db, this.tableName, conditions[0].val);
          await deleteDoc(docRef);
        } else if (conditions.length > 0) {
          const colRef = collection(db, this.tableName);
          const q = query(colRef, ...conditions.map(c => where(c.field, '==', c.val)));
          const snaps = await getDocs(q);
          for (const d of snaps.docs) {
            await deleteDoc(doc(db, this.tableName, d.id));
          }
        }
        return { data: null, error: null };
      } catch (err: any) {
        console.error(`Firestore Delete Error [${this.tableName}]:`, err);
        return { data: null, error: err };
      }
    };

    const builder = {
      eq: (field: string, val: any) => {
        conditions.push({ field, val });
        return builder;
      },
      then: (res: any, rej: any) => executor().then(res).catch(rej),
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
        return {
          data: {
            user: {
              id: user.uid,
              uid: user.uid,
              email: user.email,
              user_metadata: {
                name: user.displayName || user.email?.split('@')[0] || 'Farmer',
                avatar_url: user.photoURL || '',
              },
            },
          },
          error: null,
        };
      }
      return { data: { user: null }, error: null };
    },
    updateUser: async (attributes: { password?: string; data?: { name?: string; avatar_url?: string; phone?: string; location?: string } }) => {
      try {
        const user = auth.currentUser;
        if (!user) throw new Error('Not authenticated');

        if (attributes.password) {
          await updatePassword(user, attributes.password);
        }

        if (attributes.data) {
          await updateProfile(user, {
            displayName: attributes.data.name ?? user.displayName,
            photoURL: attributes.data.avatar_url ?? user.photoURL,
          });

          const userDocRef = doc(db, 'User', user.uid);
          await setDoc(
            userDocRef,
            {
              id: user.uid,
              email: user.email || '',
              name: attributes.data.name ?? user.displayName ?? 'Farmer',
              phone: attributes.data.phone ?? '',
              location: attributes.data.location ?? '',
              avatarUrl: attributes.data.avatar_url ?? user.photoURL ?? '',
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }

        return { data: { user }, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },
    signOut: async () => {
      await auth.signOut();
    },
  },
  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: File) => {
        try {
          const storageRef = ref(storage, `${bucket}/${path}`);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          // Cache public download URL for synchronous getPublicUrl calls
          (window as any).__fbStorageUrls = (window as any).__fbStorageUrls || {};
          (window as any).__fbStorageUrls[`${bucket}/${path}`] = url;
          return { data: { path, publicUrl: url }, error: null };
        } catch (err: any) {
          return { data: null, error: err };
        }
      },
      getPublicUrl: (path: string) => {
        const cached = (window as any).__fbStorageUrls?.[`${bucket}/${path}`];
        return { data: { publicUrl: cached || `https://storage.googleapis.com/${import.meta.env.VITE_FIREBASE_STORAGE_BUCKET}/${bucket}/${path}` } };
      },
    }),
  },
  channel: (_name: string) => {
    const listeners: Array<{ table: string; callback: (payload: any) => void }> = [];
    const unsubscribes: Unsubscribe[] = [];

    const chainable = {
      on: (_type: string, filter: { table?: string; event?: string }, callback: (payload: any) => void) => {
        if (filter?.table) {
          listeners.push({ table: filter.table, callback });
        }
        return chainable;
      },
      subscribe: () => {
        listeners.forEach(({ table, callback }) => {
          let initialLoad = true;
          const unsub = onSnapshot(
            collection(db, table),
            snapshot => {
              if (initialLoad) {
                initialLoad = false;
                return;
              }
              snapshot.docChanges().forEach(change => {
                callback({
                  eventType: change.type.toUpperCase(),
                  new: { id: change.doc.id, ...change.doc.data() },
                  old: { id: change.doc.id, ...change.doc.data() },
                });
              });
            },
            err => {
              console.warn(`Firestore realtime listener error [${table}]:`, err);
            }
          );
          unsubscribes.push(unsub);
        });
        return chainable;
      },
      unsubscribe: () => {
        unsubscribes.forEach(u => u());
        unsubscribes.length = 0;
      },
    };
    return chainable;
  },
  removeChannel: (channelObj: any) => {
    if (channelObj && typeof channelObj.unsubscribe === 'function') {
      channelObj.unsubscribe();
    }
  },
};

// ─── Direct Firebase Aliases ─────────────────────────────────────────────────
export const firebaseDb = supabase;
export const firebaseClient = supabase;



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
  location?: string;
  chamber?: string;
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
  controlMode?: ControlMode;
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
  controlMode?: ControlMode;
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

export type BatchStatus = 'PLANNING' | 'ACTIVE' | 'FLOWERING' | 'VEGETATIVE' | 'SEEDLING' | 'HARVESTED' | 'COMPLETED' | 'CANCELLED';

export interface DbCropBatch {
  id: string;
  batchName: string;
  zoneId: string;
  status: BatchStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DbCropRecord {
  id: string;
  batchName: string;
  strain: string;
  plantedDate: string;
  status: string;
  yield?: number;
  createdAt: string;
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

export interface DbSeedRecord {
  id: string;
  batchId?: string;
  date: string;
  variety: string;
  number_of_seeds: number;
  planted_quantity: number;
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
  sourceType?: 'SEEDS' | 'CLONES';
  createdAt: string;
  updatedAt: string;
}

export interface DbVegetativeRecord {
  id: string;
  toppingDate: string;
  pruningDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbDiscardedRecord {
  id: string;
  date: string;
  variety: string;
  field: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbPreHarvestRecord {
  id: string;
  date: string;
  batch: string;
  strain: string;
  freshWeight: number;
  field: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbPostHarvestStageRecord {
  id: string;
  date: string;
  batch: string;
  strain: string;
  dryWeightBeforeTrimming: number;
  dryWeightAfterTrimming: number;
  createdAt: string;
  updatedAt: string;
}

export interface DbStoragePackagingRecord {
  id: string;
  date: string;
  variety: string;
  quantity: number;
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

export type PlantType = 'MOTHER' | 'CLONE' | 'SEEDLING';
export type PlantStage = 'PLANTING' | 'VEGETATIVE' | 'PRE_HARVEST' | 'POST_HARVEST' | 'STORAGE_PACKAGING' | 'DISCARDED';

export interface PlantHistoryEntry {
  timestamp: string;
  event: string;
  details?: string;
  performedBy?: string;
}

export interface DbPlant {
  id: string;
  tag: string; // Fixed, permanent Tag e.g. KB-MOM-OGK-01 or KB-MOM-OGK-01-C04
  qrCode: string; // Fixed QR payload e.g. KB-MOM-OGK-01
  type: PlantType;
  variety: string;
  motherPlantId?: string | null; // Id of parent mother plant
  motherTag?: string | null; // Human-readable tag of mother
  cloneIndex?: number | null; // e.g. 1, 2, 3...
  field: string; // Current location / grow room / field
  stage: PlantStage;
  plantingDate: string;
  toppingDate?: string | null;
  pruningDate?: string | null;
  harvestDate?: string | null;
  freshWeight?: number | null;
  dryWeightBeforeTrimming?: number | null;
  dryWeightAfterTrimming?: number | null;
  quantity?: number | null;
  discardedDate?: string | null;
  discardedReason?: string | null;
  notes?: string | null;
  history?: PlantHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

