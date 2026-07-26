-- CREATE ENUMS
CREATE TYPE public."EquipmentStatus" AS ENUM ('ON', 'OFF');
CREATE TYPE public."ControlMode" AS ENUM ('MANUAL', 'AUTOMATIC');

-- ALTER SensorReading TABLE
ALTER TABLE public."SensorReading" ADD COLUMN "temperature" double precision;
ALTER TABLE public."SensorReading" ADD COLUMN "humidity" double precision;
ALTER TABLE public."SensorReading" ADD COLUMN "moisture" double precision;

-- CREATE Fan TABLE
CREATE TABLE public."Fan" (
    "id" text NOT NULL,
    "name" text NOT NULL,
    "zoneId" text NOT NULL,
    "status" public."EquipmentStatus" NOT NULL DEFAULT 'OFF'::public."EquipmentStatus",
    "mode" public."ControlMode" NOT NULL DEFAULT 'MANUAL'::public."ControlMode",
    "speed" text NOT NULL DEFAULT 'Low'::text,
    "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT "Fan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Fan_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES public."Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CREATE Cooler TABLE
CREATE TABLE public."Cooler" (
    "id" text NOT NULL,
    "name" text NOT NULL,
    "zoneId" text NOT NULL,
    "status" public."EquipmentStatus" NOT NULL DEFAULT 'OFF'::public."EquipmentStatus",
    "mode" public."ControlMode" NOT NULL DEFAULT 'MANUAL'::public."ControlMode",
    "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT "Cooler_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Cooler_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES public."Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CREATE EquipmentEvent TABLE
CREATE TABLE public."EquipmentEvent" (
    "id" text NOT NULL,
    "fanId" text,
    "coolerId" text,
    "triggerReason" text NOT NULL,
    "previousState" text NOT NULL,
    "newState" text NOT NULL,
    "timestamp" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sensorReadingId" text,
    CONSTRAINT "EquipmentEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EquipmentEvent_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES public."Fan"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EquipmentEvent_coolerId_fkey" FOREIGN KEY ("coolerId") REFERENCES public."Cooler"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CREATE EnvironmentalThreshold TABLE
CREATE TABLE public."EnvironmentalThreshold" (
    "id" text NOT NULL,
    "zoneId" text NOT NULL,
    "tempMin" double precision NOT NULL DEFAULT 18.0,
    "tempTarget" double precision NOT NULL DEFAULT 21.0,
    "tempMax" double precision NOT NULL DEFAULT 24.0,
    "humidityMin" double precision NOT NULL DEFAULT 50.0,
    "humidityTarget" double precision NOT NULL DEFAULT 55.0,
    "humidityMax" double precision NOT NULL DEFAULT 65.0,
    "moistureMin" double precision NOT NULL DEFAULT 10.0,
    "moistureTarget" double precision NOT NULL DEFAULT 12.0,
    "moistureMax" double precision NOT NULL DEFAULT 14.0,
    "fanAutoRules" text,
    "coolerAutoRules" text,
    "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT "EnvironmentalThreshold_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EnvironmentalThreshold_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES public."Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "EnvironmentalThreshold_zoneId_key" ON public."EnvironmentalThreshold"("zoneId");

-- ADD RLS POLICIES FOR NEW TABLES (so frontend works without auth hurdles if needed)
-- (Disabling RLS on these mostly for smooth manual local operations, mimicking disable_rls.sql)
ALTER TABLE public."Fan" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."Cooler" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."EquipmentEvent" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."EnvironmentalThreshold" DISABLE ROW LEVEL SECURITY;
