const { Client } = require('pg');

async function runSQL() {
    const connectionString = "postgresql://postgres:Kato0788945330@db.bwdvbbmjcmouogqdwshi.supabase.co:5432/postgres";
    const client = new Client({ connectionString });

    try {
        console.log("Connecting to Supabase...");
        await client.connect();

        console.log("Disabling RLS on tables...");
        const queries = [
            'ALTER TABLE "public"."User" DISABLE ROW LEVEL SECURITY;',
            'ALTER TABLE "public"."Farm" DISABLE ROW LEVEL SECURITY;',
            'ALTER TABLE "public"."Zone" DISABLE ROW LEVEL SECURITY;',
            'ALTER TABLE "public"."CropRecord" DISABLE ROW LEVEL SECURITY;',
            'ALTER TABLE "public"."Sensor" DISABLE ROW LEVEL SECURITY;',
            'ALTER TABLE "public"."SensorReading" DISABLE ROW LEVEL SECURITY;',
            'ALTER TABLE "public"."Alert" DISABLE ROW LEVEL SECURITY;',
            'GRANT ALL ON "public"."User" TO anon, authenticated;',
            'GRANT ALL ON "public"."Farm" TO anon, authenticated;',
            'GRANT ALL ON "public"."Zone" TO anon, authenticated;',
            'GRANT ALL ON "public"."CropRecord" TO anon, authenticated;',
            'GRANT ALL ON "public"."Sensor" TO anon, authenticated;',
            'GRANT ALL ON "public"."SensorReading" TO anon, authenticated;',
            'GRANT ALL ON "public"."Alert" TO anon, authenticated;'
        ];

        for (const q of queries) {
            await client.query(q);
        }

        console.log("RLS disabled and permissions granted successfully!");

        // Also let's just make sure there's at least one Farm for testing if empty
        // But since farm is needed, we'll let frontend handle it since it has anon access now.

        console.log("Database patch completed.");
    } catch (err) {
        console.error("Error executing SQL:", err);
    } finally {
        await client.end();
    }
}

runSQL();
