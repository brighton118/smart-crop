-- ============================================================
-- KindBuds Ltd. — Crop Records Schema for Supabase
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. CROP STATUS ENUM ──────────────────────────────────────

CREATE TYPE "CropStatus" AS ENUM (
  'SEEDLING',
  'VEGETATIVE',
  'FLOWERING',
  'GROWING',
  'HARVESTED'
);


-- ── 2. CROP RECORDS TABLE ────────────────────────────────────
-- recordType: 'SEED' | 'CLONE' | 'HARVEST'

CREATE TABLE "CropRecord" (
  "id"            TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "batchName"     TEXT        NOT NULL,
  "strain"        TEXT        NOT NULL,
  "plantedDate"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "harvestDate"   TIMESTAMPTZ,
  "status"        "CropStatus" NOT NULL DEFAULT 'GROWING',
  "yield"         DOUBLE PRECISION,        -- total yield in grams/kg
  "seedCount"     INTEGER,                 -- number of seeds  (SEED records)
  "cloneCount"    INTEGER,                 -- number of clones (CLONE records)
  "harvestWeight" DOUBLE PRECISION,        -- weight in kg     (HARVEST records)
  "recordType"    TEXT        NOT NULL DEFAULT 'SEED',
  "zoneId"        TEXT        NOT NULL,
  "notes"         TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "CropRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CropRecord_zoneId_fkey"
    FOREIGN KEY ("zoneId") REFERENCES "Zone"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Indexes for fast filtering
CREATE INDEX "CropRecord_zoneId_idx"     ON "CropRecord"("zoneId");
CREATE INDEX "CropRecord_status_idx"     ON "CropRecord"("status");
CREATE INDEX "CropRecord_recordType_idx" ON "CropRecord"("recordType");
CREATE INDEX "CropRecord_createdAt_idx"  ON "CropRecord"("createdAt" DESC);


-- ── 3. AUDIT / CHANGE-HISTORY TABLE ─────────────────────────
-- Logs every INSERT, UPDATE, DELETE on CropRecord automatically.

CREATE TABLE "CropRecordHistory" (
  "id"          TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "recordId"    TEXT        NOT NULL,    -- the CropRecord that changed
  "operation"   TEXT        NOT NULL,    -- 'INSERT' | 'UPDATE' | 'DELETE'
  "changedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "changedBy"   TEXT,                   -- optional: auth.uid() if using Supabase Auth
  "oldData"     JSONB,                  -- previous row   (NULL on INSERT)
  "newData"     JSONB,                  -- new row        (NULL on DELETE)
  CONSTRAINT "CropRecordHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CropRecordHistory_recordId_idx"  ON "CropRecordHistory"("recordId");
CREATE INDEX "CropRecordHistory_changedAt_idx" ON "CropRecordHistory"("changedAt" DESC);


-- ── 4. TRIGGERS ──────────────────────────────────────────────

-- 4a. Auto-update "updatedAt" on every UPDATE
CREATE OR REPLACE FUNCTION crop_record_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "CropRecord_updatedAt"
  BEFORE UPDATE ON "CropRecord"
  FOR EACH ROW EXECUTE FUNCTION crop_record_set_updated_at();


-- 4b. Record every change into CropRecordHistory
CREATE OR REPLACE FUNCTION crop_record_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO "CropRecordHistory"("recordId","operation","newData")
    VALUES (NEW."id", 'INSERT', to_jsonb(NEW));

  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO "CropRecordHistory"("recordId","operation","oldData","newData")
    VALUES (NEW."id", 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));

  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO "CropRecordHistory"("recordId","operation","oldData")
    VALUES (OLD."id", 'DELETE', to_jsonb(OLD));
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "CropRecord_audit"
  AFTER INSERT OR UPDATE OR DELETE ON "CropRecord"
  FOR EACH ROW EXECUTE FUNCTION crop_record_audit();


-- ── 5. ROW LEVEL SECURITY ────────────────────────────────────

ALTER TABLE "CropRecord"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CropRecordHistory" ENABLE ROW LEVEL SECURITY;

-- Open policies for development — tighten before production
CREATE POLICY "crop_records_all"   ON "CropRecord"        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crop_history_read"  ON "CropRecordHistory" FOR SELECT USING (true);


-- ── 6. REAL-TIME ─────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE "CropRecord";
ALTER PUBLICATION supabase_realtime ADD TABLE "CropRecordHistory";


-- ============================================================
-- Done! CropRecord tables + audit history are ready.
-- ============================================================
