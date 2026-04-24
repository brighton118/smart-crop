import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Type-safe database helpers ──────────────────────────────────────────────

export type SensorType = 'SOIL_MOISTURE' | 'TEMPERATURE' | 'HUMIDITY' | 'LIGHT' | 'WIND_SPEED' | 'RAINFALL';
export type SensorStatus = 'ONLINE' | 'OFFLINE' | 'WARNING';
export type AlertType = 'WARNING' | 'CRITICAL' | 'INFO';
export type AlertStatus = 'UNREAD' | 'READ' | 'RESOLVED';
export type UserRole = 'ADMIN' | 'FARMER' | 'WORKER';

export interface DbSensor {
  id: string;
  name: string;
  type: SensorType;
  zoneId: string;
  deviceId: string;
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

export interface DbFarm {
  id: string;
  name: string;
  location: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}
