-- Supabase enables Row Level Security (RLS) by default, which blocks frontend access.
-- Run this script in your Supabase SQL Editor to disable RLS for development
-- and ensure the anon/authenticated roles have permission to insert/read data.

ALTER TABLE "public"."User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Farm" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Zone" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CropRecord" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Sensor" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SensorReading" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Alert" DISABLE ROW LEVEL SECURITY;

GRANT ALL ON "public"."User" TO anon, authenticated;
GRANT ALL ON "public"."Farm" TO anon, authenticated;
GRANT ALL ON "public"."Zone" TO anon, authenticated;
GRANT ALL ON "public"."CropRecord" TO anon, authenticated;
GRANT ALL ON "public"."Sensor" TO anon, authenticated;
GRANT ALL ON "public"."SensorReading" TO anon, authenticated;
GRANT ALL ON "public"."Alert" TO anon, authenticated;
