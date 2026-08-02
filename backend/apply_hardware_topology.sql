-- =========================================================================
-- Phase 7: Real Physical Hardware Connection Topology
-- Creates RelayModule and HardwareConnection tables to enforce traceability.
-- Run this in your Supabase SQL Editor.
-- =========================================================================

-- Create Enum Types
CREATE TYPE "ConnectionType" AS ENUM ('SENSOR', 'EQUIPMENT');
CREATE TYPE "ConnectionDirection" AS ENUM ('INPUT', 'OUTPUT');
CREATE TYPE "ConnectionStatus" AS ENUM ('VERIFIED', 'UNVERIFIED', 'ERROR');

-- Create RelayModule Table
CREATE TABLE IF NOT EXISTS "RelayModule" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "gpioPin" TEXT,
    "channelCount" INTEGER NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RelayModule_pkey" PRIMARY KEY ("id")
);

-- Create HardwareConnection Table
CREATE TABLE IF NOT EXISTS "HardwareConnection" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "zoneId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "type" "ConnectionType" NOT NULL,
    "direction" "ConnectionDirection" NOT NULL,
    "gpioPin" TEXT,
    "relayModuleId" TEXT,
    "relayChannel" INTEGER,
    "sensorId" TEXT,
    "fanId" TEXT,
    "coolerId" TEXT,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HardwareConnection_pkey" PRIMARY KEY ("id")
);

-- Add Foreign Keys
ALTER TABLE "RelayModule" ADD CONSTRAINT "RelayModule_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HardwareConnection" ADD CONSTRAINT "HardwareConnection_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HardwareConnection" ADD CONSTRAINT "HardwareConnection_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HardwareConnection" ADD CONSTRAINT "HardwareConnection_relayModuleId_fkey" FOREIGN KEY ("relayModuleId") REFERENCES "RelayModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
