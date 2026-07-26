-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE public."Role" AS ENUM ('ADMIN', 'FARMER', 'WORKER');

-- CreateEnum
CREATE TYPE public."SensorType" AS ENUM ('SOIL_MOISTURE', 'TEMPERATURE', 'HUMIDITY', 'LIGHT', 'WIND_SPEED', 'RAINFALL');

-- CreateEnum
CREATE TYPE public."SensorStatus" AS ENUM ('ONLINE', 'OFFLINE', 'WARNING');

-- CreateEnum
CREATE TYPE public."AlertType" AS ENUM ('WARNING', 'CRITICAL', 'INFO');

-- CreateEnum
CREATE TYPE public."AlertStatus" AS ENUM ('UNREAD', 'READ', 'RESOLVED');

-- CreateEnum
CREATE TYPE public."CropStatus" AS ENUM ('SEEDLING', 'VEGETATIVE', 'FLOWERING', 'GROWING', 'HARVESTED');

-- CreateTable
CREATE TABLE public."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" public."Role" NOT NULL DEFAULT 'FARMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."Farm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Farm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."Zone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."Sensor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" public."SensorType" NOT NULL,
    "zoneId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "samplingRate" INTEGER NOT NULL DEFAULT 10,
    "minThreshold" DOUBLE PRECISION NOT NULL,
    "maxThreshold" DOUBLE PRECISION NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "status" public."SensorStatus" NOT NULL DEFAULT 'ONLINE',
    "unit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sensor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."SensorReading" (
    "id" TEXT NOT NULL,
    "sensorId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SensorReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."Alert" (
    "id" TEXT NOT NULL,
    "sensorId" TEXT NOT NULL,
    "type" public."AlertType" NOT NULL,
    "message" TEXT NOT NULL,
    "status" public."AlertStatus" NOT NULL DEFAULT 'UNREAD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."CropRecord" (
    "id" TEXT NOT NULL,
    "batchName" TEXT NOT NULL,
    "strain" TEXT NOT NULL,
    "plantedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "harvestDate" TIMESTAMP(3),
    "status" public."CropStatus" NOT NULL DEFAULT 'GROWING',
    "yield" DOUBLE PRECISION,
    "seedCount" INTEGER,
    "cloneCount" INTEGER,
    "harvestWeight" DOUBLE PRECISION,
    "recordType" TEXT NOT NULL DEFAULT 'SEED',
    "zoneId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CropRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON public."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Sensor_deviceId_key" ON public."Sensor"("deviceId");

-- CreateIndex
CREATE INDEX "SensorReading_sensorId_timestamp_idx" ON public."SensorReading"("sensorId", "timestamp");

-- AddForeignKey
ALTER TABLE public."Farm" ADD CONSTRAINT "Farm_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."Zone" ADD CONSTRAINT "Zone_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES public."Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."Sensor" ADD CONSTRAINT "Sensor_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES public."Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."SensorReading" ADD CONSTRAINT "SensorReading_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES public."Sensor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."Alert" ADD CONSTRAINT "Alert_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES public."Sensor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."CropRecord" ADD CONSTRAINT "CropRecord_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES public."Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;