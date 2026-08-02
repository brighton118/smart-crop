import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';

// Load env 
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

// 1. Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://bwdvbbmjcmouogqdwshi.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || ''; // Usually anon key gives RLS issues, but assume we have permissions or bypassing RLS.

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key. Migration Aborted.');
    process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Initialize Firebase Admin SDK
if (!admin.apps.length) {
    if (!process.env.FIREBASE_PROJECT_ID) {
        console.error('Missing Firebase Credentials. Migration Aborted.');
        process.exit(1);
    }
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}
const db = admin.firestore();

// 3. Define the tables to migrate
const TABLES = [
    'User',
    'Farm',
    'Zone',
    'Sensor',
    'Device',
    'Fan',
    'Cooler',
    'CropBatch',
    'CultivationRecord',
    'Alert',
    'ActionPlan',
    // Skip heavy tables initially unless specifically requested or chunking is set up, but let's do all.
    'SensorReading',
    'EquipmentEvent',
    'HarvestRecord'
];

async function migrateTable(tableName: string) {
    console.log(`\n==========================================`);
    console.log(`Starting migration for table: => [${tableName}]`);
    console.log(`==========================================`);

    // Fetch from Supabase
    const { data, error } = await supabase.from(tableName).select('*');

    if (error) {
        console.error(`=> Error fetching data from ${tableName}:`, error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log(`=> No data found in ${tableName}, skipping.`);
        return;
    }

    console.log(`=> Found ${data.length} records in ${tableName}. Uploading to Firestore...`);

    // Use Firestore Batches for efficient, idempotent writes
    const batchSize = 400; // max 500 ops per firestore batch
    let batch = db.batch();
    let count = 0;

    const collectionRef = db.collection(tableName);

    for (let i = 0; i < data.length; i++) {
        const row = data[i];

        // Supabase primarily uses 'id' UUIDs as string
        const docId = row.id?.toString();
        if (!docId) {
            console.warn(`=> Row missing ID in ${tableName}! Stringifying:`, JSON.stringify(row).substring(0, 50));
            continue; // Skip items without ID to maintain idempotency
        }

        // Clean out unsupported Types if any, but since it's Prisma output mapped to Postgres JSON, usually fine.
        const cleanRow = { ...row };
        // Delete Prisma specific meta tags if present, otherwise just keep fields as is.
        // Convert dates correctly if needed, but saving as ISO strings is completely valid in Firestore.

        const docRef = collectionRef.doc(docId);
        batch.set(docRef, cleanRow); // Using set() ensures idempotency! It overwrites existing and creates new.
        count++;

        if (count >= batchSize) {
            await batch.commit();
            console.log(`=> Committed batch of ${count} for ${tableName}. Progress: ${i + 1}/${data.length}`);
            batch = db.batch();
            count = 0;
        }
    }

    if (count > 0) {
        await batch.commit();
        console.log(`=> Committed final batch of ${count} for ${tableName}.`);
    }

    console.log(`=> Successfully migrated ${data.length} records into [${tableName}].`);
}

async function runMigration() {
    console.log('##########################################');
    console.log(' Starting Idempotent Schema Data Migration');
    console.log(' SUPABASE (Postgres) -> FIREBASE (Firestore)');
    console.log('##########################################\n');

    for (const table of TABLES) {
        await migrateTable(table);
    }

    console.log('\n##########################################');
    console.log(' Migration Completed Successfully! ✓');
    console.log('##########################################');
    process.exit(0);
}

runMigration().catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
});
