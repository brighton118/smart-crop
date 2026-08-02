const { createClient } = require('@supabase/supabase-js');
const { getApps, initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const dotenv = require('dotenv');
const path = require('path');

// Load env 
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

// 1. Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://bwdvbbmjcmouogqdwshi.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key. Migration Aborted.');
    process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Initialize Firebase Admin SDK
if (!getApps().length) {
    if (!process.env.FIREBASE_PROJECT_ID) {
        console.error('Missing Firebase Credentials. Migration Aborted.');
        process.exit(1);
    }
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}
const db = getFirestore();

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
    'SensorReading',
    'EquipmentEvent',
    'HarvestRecord'
];

async function migrateTable(tableName) {
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

    const batchSize = 400; // max 500 ops per firestore batch
    let batch = db.batch();
    let count = 0;

    const collectionRef = db.collection(tableName);

    for (let i = 0; i < data.length; i++) {
        const row = data[i];

        const docId = row.id?.toString();
        if (!docId) {
            console.warn(`=> Row missing ID in ${tableName}! Stringifying:`, JSON.stringify(row).substring(0, 50));
            continue;
        }

        const cleanRow = { ...row };
        const docRef = collectionRef.doc(docId);
        batch.set(docRef, cleanRow);
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
