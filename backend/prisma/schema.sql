-- ============================================================
-- Smart AgroConnect — Full Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. ENUMS ────────────────────────────────────────────────

CREATE TYPE "Role" AS ENUM ('ADMIN', 'FARMER', 'WORKER');

CREATE TYPE "SensorType" AS ENUM (
  'SOIL_MOISTURE',
  'TEMPERATURE',
  'HUMIDITY',
  'LIGHT',
  'WIND_SPEED',
  'RAINFALL'
);

CREATE TYPE "SensorStatus" AS ENUM ('ONLINE', 'OFFLINE', 'WARNING');

CREATE TYPE "AlertType" AS ENUM ('WARNING', 'CRITICAL', 'INFO');

CREATE TYPE "AlertStatus" AS ENUM ('UNREAD', 'READ', 'RESOLVED');


-- ── 2. USERS ────────────────────────────────────────────────

CREATE TABLE "User" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "email"     TEXT NOT NULL,
  "name"      TEXT,
  "password"  TEXT NOT NULL,
  "role"      "Role" NOT NULL DEFAULT 'FARMER',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");


-- ── 3. FARMS ────────────────────────────────────────────────

CREATE TABLE "Farm" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "name"      TEXT NOT NULL,
  "location"  TEXT,
  "userId"    TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Farm_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Farm_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);


-- ── 4. ZONES ────────────────────────────────────────────────

CREATE TABLE "Zone" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "name"      TEXT NOT NULL,
  "farmId"    TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Zone_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Zone_farmId_fkey"
    FOREIGN KEY ("farmId") REFERENCES "Farm"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);


-- ── 5. SENSORS ──────────────────────────────────────────────

CREATE TABLE "Sensor" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "name"         TEXT NOT NULL,
  "type"         "SensorType" NOT NULL,
  "zoneId"       TEXT NOT NULL,
  "deviceId"     TEXT NOT NULL,
  "samplingRate" INTEGER NOT NULL DEFAULT 10,
  "minThreshold" DOUBLE PRECISION NOT NULL,
  "maxThreshold" DOUBLE PRECISION NOT NULL,
  "enabled"      BOOLEAN NOT NULL DEFAULT TRUE,
  "status"       "SensorStatus" NOT NULL DEFAULT 'ONLINE',
  "unit"         TEXT NOT NULL,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastSeen"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Sensor_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Sensor_zoneId_fkey"
    FOREIGN KEY ("zoneId") REFERENCES "Zone"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Sensor_deviceId_key" ON "Sensor"("deviceId");


-- ── 6. SENSOR READINGS ──────────────────────────────────────

CREATE TABLE "SensorReading" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "sensorId"  TEXT NOT NULL,
  "value"     DOUBLE PRECISION NOT NULL,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "SensorReading_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SensorReading_sensorId_fkey"
    FOREIGN KEY ("sensorId") REFERENCES "Sensor"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "SensorReading_sensorId_timestamp_idx"
  ON "SensorReading"("sensorId", "timestamp");


-- ── 7. ALERTS ───────────────────────────────────────────────

CREATE TABLE "Alert" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "sensorId"  TEXT NOT NULL,
  "type"      "AlertType" NOT NULL,
  "message"   TEXT NOT NULL,
  "status"    "AlertStatus" NOT NULL DEFAULT 'UNREAD',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Alert_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Alert_sensorId_fkey"
    FOREIGN KEY ("sensorId") REFERENCES "Sensor"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);


-- ── 8. AUTO-UPDATE updatedAt TRIGGER ────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "User_updatedAt"
  BEFORE UPDATE ON "User"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER "Farm_updatedAt"
  BEFORE UPDATE ON "Farm"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER "Zone_updatedAt"
  BEFORE UPDATE ON "Zone"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER "Sensor_updatedAt"
  BEFORE UPDATE ON "Sensor"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── 9. ENABLE REAL-TIME ──────────────────────────────────────
-- Enables live subscriptions from the frontend

ALTER PUBLICATION supabase_realtime ADD TABLE "Sensor";
ALTER PUBLICATION supabase_realtime ADD TABLE "SensorReading";
ALTER PUBLICATION supabase_realtime ADD TABLE "Alert";


-- ============================================================
-- Done! Your Smart AgroConnect database is ready.
-- ============================================================
