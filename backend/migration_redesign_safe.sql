-- 1. CreateEnum
CREATE TYPE public."BatchStatus" AS ENUM ('PLANNING', 'ACTIVE', 'HARVESTED', 'COMPLETED', 'CANCELLED');

-- 2. CreateTable
CREATE TABLE public."CropBatch" (
    "id" TEXT NOT NULL,
    "batchName" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "status" public."BatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CropBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."PlantingRecord" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "strain" TEXT NOT NULL,
    "plantedDate" TIMESTAMP(3) NOT NULL,
    "seedCount" INTEGER,
    "cloneCount" INTEGER,
    "plantCount" INTEGER,
    "plantingMethod" TEXT,
    "responsiblePerson" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."CultivationRecord" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "recordDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "growthStage" TEXT NOT NULL,
    "plantCount" INTEGER,
    "healthStatus" TEXT,
    "irrigationStatus" TEXT,
    "nutrientInfo" TEXT,
    "envConditions" TEXT,
    "notes" TEXT,
    "responsiblePerson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CultivationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."HarvestRecord" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "harvestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "plantsHarvested" INTEGER,
    "freshWeight" DOUBLE PRECISION,
    "dryWeight" DOUBLE PRECISION,
    "qualityGrade" TEXT,
    "notes" TEXT,
    "responsiblePerson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HarvestRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."PostHarvestRecord" (
    "id" TEXT NOT NULL,
    "harvestId" TEXT NOT NULL,
    "dryingStartDate" TIMESTAMP(3),
    "dryingEndDate" TIMESTAMP(3),
    "curingStartDate" TIMESTAMP(3),
    "curingEndDate" TIMESTAMP(3),
    "finalWeight" DOUBLE PRECISION,
    "storageLocation" TEXT,
    "storageConditions" TEXT,
    "productStatus" TEXT,
    "notes" TEXT,
    "responsiblePerson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostHarvestRecord_pkey" PRIMARY KEY ("id")
);

-- 3. MIGRATE DATA FROM CropRecord BEFORE DROPPING IT!

-- Insert into CropBatch from CropRecord
INSERT INTO public."CropBatch" ("id", "batchName", "zoneId", "status", "createdAt", "updatedAt")
SELECT "id", "batchName", "zoneId", 
  CASE 
    WHEN "status"::text = 'HARVESTED' THEN 'HARVESTED'::public."BatchStatus"
    ELSE 'ACTIVE'::public."BatchStatus"
  END, 
  "createdAt", "updatedAt"
FROM public."CropRecord";

-- Insert into PlantingRecord
INSERT INTO public."PlantingRecord" ("id", "batchId", "strain", "plantedDate", "seedCount", "cloneCount", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", "strain", "plantedDate", "seedCount", "cloneCount", "createdAt", "updatedAt"
FROM public."CropRecord";

-- Insert into HarvestRecord (only if harvesting data existed, e.g. status was harvested or had harvest date)
INSERT INTO public."HarvestRecord" ("id", "batchId", "harvestDate", "freshWeight", "notes", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", COALESCE("harvestDate", "updatedAt"), "harvestWeight", "notes", "createdAt", "updatedAt"
FROM public."CropRecord"
WHERE "harvestDate" IS NOT NULL OR "harvestWeight" IS NOT NULL OR "status"::text = 'HARVESTED';

-- 4. DROP LEGACY TABLES AND ENUMS
ALTER TABLE public."CropRecord" DROP CONSTRAINT "CropRecord_zoneId_fkey";
DROP TABLE public."CropRecord";
DROP TYPE public."CropStatus";

-- 5. APPLY INDEXES AND FOREIGN KEYS ON NEW TABLES
CREATE UNIQUE INDEX "PlantingRecord_batchId_key" ON public."PlantingRecord"("batchId");
ALTER TABLE public."CropBatch" ADD CONSTRAINT "CropBatch_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES public."Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE public."PlantingRecord" ADD CONSTRAINT "PlantingRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."CropBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE public."CultivationRecord" ADD CONSTRAINT "CultivationRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."CropBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE public."HarvestRecord" ADD CONSTRAINT "HarvestRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."CropBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE public."PostHarvestRecord" ADD CONSTRAINT "PostHarvestRecord_harvestId_fkey" FOREIGN KEY ("harvestId") REFERENCES public."HarvestRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. DISABLE RLS (match local development settings)
ALTER TABLE public."CropBatch" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."PlantingRecord" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."CultivationRecord" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."HarvestRecord" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."PostHarvestRecord" DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public."CropBatch" TO anon, authenticated;
GRANT ALL ON public."PlantingRecord" TO anon, authenticated;
GRANT ALL ON public."CultivationRecord" TO anon, authenticated;
GRANT ALL ON public."HarvestRecord" TO anon, authenticated;
GRANT ALL ON public."PostHarvestRecord" TO anon, authenticated;
