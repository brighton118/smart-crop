-- SQL Migration: Unified Dryers Module
-- Add location and chamber to the Zone table to represent complete Dryers

ALTER TABLE "Zone"
ADD COLUMN "location" TEXT DEFAULT NULL,
ADD COLUMN "chamber" TEXT DEFAULT NULL;

-- Automatically set some default mock data for existing zones just so the UI has nice visuals initially
UPDATE "Zone"
SET location = 'Drying Room 01', chamber = 'Chamber A'
WHERE location IS NULL;
