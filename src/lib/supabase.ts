import { createClient } from '@supabase/supabase-js';

declare global {
  interface ImportMetaEnv {
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
