-- ============================================================
-- KindBuds Ltd. — Full Database Schema for Supabase
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. ENUMS ────────────────────────────────────────────────


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

CREATE TYPE "CropStatus" AS ENUM (
  'SEEDLING',
  'VEGETATIVE',
  'FLOWERING',
  'GROWING',
  'HARVESTED'
);


-- ── 2. USERS ────────────────────────────────────────────────

CREATE TABLE "User" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "email"     TEXT NOT NULL,
  "name"      TEXT,
  "password"  TEXT NOT NULL,
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


-- ── 8. CROP RECORDS ─────────────────────────────────────────
-- Tracks seed batches, clone batches, and harvest records.
-- recordType: 'SEED' | 'CLONE' | 'HARVEST'

CREATE TABLE "CropRecord" (
  "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "batchName"     TEXT NOT NULL,
  "strain"        TEXT NOT NULL,
  "plantedDate"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "harvestDate"   TIMESTAMPTZ,
  "status"        "CropStatus" NOT NULL DEFAULT 'GROWING',
  "yield"         DOUBLE PRECISION,            -- total yield in grams/kg
  "seedCount"     INTEGER,                     -- number of seeds (SEED records)
  "cloneCount"    INTEGER,                     -- number of clones (CLONE records)
  "harvestWeight" DOUBLE PRECISION,            -- weight in kg (HARVEST records)
  "recordType"    TEXT NOT NULL DEFAULT 'SEED',-- 'SEED' | 'CLONE' | 'HARVEST'
  "zoneId"        TEXT NOT NULL,
  "notes"         TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "CropRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CropRecord_zoneId_fkey"
    FOREIGN KEY ("zoneId") REFERENCES "Zone"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "CropRecord_zoneId_idx" ON "CropRecord"("zoneId");
CREATE INDEX "CropRecord_status_idx" ON "CropRecord"("status");
CREATE INDEX "CropRecord_recordType_idx" ON "CropRecord"("recordType");


-- ── 9. AUTO-UPDATE updatedAt TRIGGER ────────────────────────

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

CREATE TRIGGER "CropRecord_updatedAt"
  BEFORE UPDATE ON "CropRecord"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── 10. ROW LEVEL SECURITY (RLS) ────────────────────────────
-- Enable RLS so Supabase auth policies can be applied later.

ALTER TABLE "User"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Farm"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Zone"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Sensor"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SensorReading" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Alert"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CropRecord"    ENABLE ROW LEVEL SECURITY;

-- Permissive policies (open access for development — tighten for production)
CREATE POLICY "allow_all_users"          ON "User"          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_farms"          ON "Farm"          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_zones"          ON "Zone"          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_sensors"        ON "Sensor"        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_readings"       ON "SensorReading" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_alerts"         ON "Alert"         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_crop_records"   ON "CropRecord"    FOR ALL USING (true) WITH CHECK (true);


-- ── 11. ENABLE REAL-TIME ─────────────────────────────────────
-- Enables live subscriptions from the frontend

ALTER PUBLICATION supabase_realtime ADD TABLE "Sensor";
ALTER PUBLICATION supabase_realtime ADD TABLE "SensorReading";
ALTER PUBLICATION supabase_realtime ADD TABLE "Alert";
ALTER PUBLICATION supabase_realtime ADD TABLE "CropRecord";


-- ============================================================
-- Done! KindBuds Ltd. database is ready.
-- ============================================================
