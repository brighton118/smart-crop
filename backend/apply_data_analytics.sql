-- ALTER EXISTING TABLE
ALTER TABLE "SensorReading" ADD COLUMN IF NOT EXISTS "temperature" DOUBLE PRECISION;
ALTER TABLE "SensorReading" ADD COLUMN IF NOT EXISTS "humidity" DOUBLE PRECISION;
ALTER TABLE "SensorReading" ADD COLUMN IF NOT EXISTS "moisture" DOUBLE PRECISION; 

-- CREATE ENUMS
DO $$ BEGIN
    CREATE TYPE "EquipmentStatus" AS ENUM ('ON', 'OFF');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ControlMode" AS ENUM ('MANUAL', 'AUTOMATIC');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CREATE NEW TABLES
CREATE TABLE IF NOT EXISTS "Fan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "status" "EquipmentStatus" NOT NULL DEFAULT 'OFF',
    "mode" "ControlMode" NOT NULL DEFAULT 'MANUAL',
    "speed" TEXT NOT NULL DEFAULT 'Low',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Fan_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Cooler" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "status" "EquipmentStatus" NOT NULL DEFAULT 'OFF',
    "mode" "ControlMode" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cooler_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Cooler_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "EquipmentEvent" (
    "id" TEXT NOT NULL,
    "fanId" TEXT,
    "coolerId" TEXT,
    "triggerReason" TEXT NOT NULL,
    "previousState" TEXT NOT NULL,
    "newState" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sensorReadingId" TEXT,

    CONSTRAINT "EquipmentEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EquipmentEvent_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES "Fan"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EquipmentEvent_coolerId_fkey" FOREIGN KEY ("coolerId") REFERENCES "Cooler"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "EnvironmentalThreshold" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "tempMin" DOUBLE PRECISION NOT NULL DEFAULT 18.0,
    "tempTarget" DOUBLE PRECISION NOT NULL DEFAULT 21.0,
    "tempMax" DOUBLE PRECISION NOT NULL DEFAULT 24.0,
    "humidityMin" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "humidityTarget" DOUBLE PRECISION NOT NULL DEFAULT 55.0,
    "humidityMax" DOUBLE PRECISION NOT NULL DEFAULT 65.0,
    "moistureMin" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "moistureTarget" DOUBLE PRECISION NOT NULL DEFAULT 12.0,
    "moistureMax" DOUBLE PRECISION NOT NULL DEFAULT 14.0,
    "fanAutoRules" TEXT,
    "coolerAutoRules" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnvironmentalThreshold_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EnvironmentalThreshold_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "EnvironmentalThreshold_zoneId_key" ON "EnvironmentalThreshold"("zoneId");
