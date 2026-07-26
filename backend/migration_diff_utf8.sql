-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('PLANNING', 'ACTIVE', 'HARVESTED', 'COMPLETED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "CropRecord" DROP CONSTRAINT "CropRecord_zoneId_fkey";

-- DropTable
DROP TABLE "CropRecord";

-- DropEnum
DROP TYPE "CropStatus";

-- CreateTable
CREATE TABLE "CropBatch" (
    "id" TEXT NOT NULL,
    "batchName" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CropBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantingRecord" (
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
CREATE TABLE "CultivationRecord" (
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
CREATE TABLE "HarvestRecord" (
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
CREATE TABLE "PostHarvestRecord" (
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

-- CreateIndex
CREATE UNIQUE INDEX "PlantingRecord_batchId_key" ON "PlantingRecord"("batchId");

-- AddForeignKey
ALTER TABLE "CropBatch" ADD CONSTRAINT "CropBatch_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantingRecord" ADD CONSTRAINT "PlantingRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "CropBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CultivationRecord" ADD CONSTRAINT "CultivationRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "CropBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HarvestRecord" ADD CONSTRAINT "HarvestRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "CropBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostHarvestRecord" ADD CONSTRAINT "PostHarvestRecord_harvestId_fkey" FOREIGN KEY ("harvestId") REFERENCES "HarvestRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

