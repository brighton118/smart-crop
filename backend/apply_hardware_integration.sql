DO $$ BEGIN
    CREATE TYPE "DeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'MAINTENANCE', 'ERROR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "Device" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "macAddress" TEXT NOT NULL,
    "ipAddress" TEXT,
    "firmwareVersion" TEXT,
    "status" "DeviceStatus" NOT NULL DEFAULT 'ONLINE',
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "zoneId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE "Device" ADD CONSTRAINT "Device_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Sensor" ADD COLUMN IF NOT EXISTS "esp32Id" TEXT;
ALTER TABLE "Sensor" ADD COLUMN IF NOT EXISTS "gpioPin" INTEGER;
DO $$ BEGIN
    ALTER TABLE "Sensor" ADD CONSTRAINT "Sensor_esp32Id_fkey" FOREIGN KEY ("esp32Id") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Fan" ADD COLUMN IF NOT EXISTS "esp32Id" TEXT;
ALTER TABLE "Fan" ADD COLUMN IF NOT EXISTS "relayChannel" INTEGER;
DO $$ BEGIN
    ALTER TABLE "Fan" ADD CONSTRAINT "Fan_esp32Id_fkey" FOREIGN KEY ("esp32Id") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Cooler" ADD COLUMN IF NOT EXISTS "esp32Id" TEXT;
ALTER TABLE "Cooler" ADD COLUMN IF NOT EXISTS "relayChannel" INTEGER;
DO $$ BEGIN
    ALTER TABLE "Cooler" ADD CONSTRAINT "Cooler_esp32Id_fkey" FOREIGN KEY ("esp32Id") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Device" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Enable read access for all users" ON "Device" FOR SELECT USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Enable insert for all users" ON "Device" FOR INSERT WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Enable update for all users" ON "Device" FOR UPDATE USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Enable delete for all users" ON "Device" FOR DELETE USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;