import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

const { Pool } = pg;

// Load env from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL ? process.env.DATABASE_URL.split('?')[0] : '';

const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false,
    },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("Seeding database via Prisma driver adapter...");

    // Check zones
    const zones = await prisma.zone.findMany();
    if (zones.length === 0) {
        console.log("No zones found. Cannot seed crop records.");
        return;
    }

    const zoneId = zones[0].id;
    console.log(`Found zone ID: ${zoneId}. Checking CropRecord count...`);

    const cropRecordCount = await prisma.cropRecord.count();
    if (cropRecordCount > 0) {
        console.log(`Database already has ${cropRecordCount} crop records. Skipping seed.`);
        return;
    }

    console.log("Inserting seed crop records...");
    const now = new Date();
    await prisma.cropRecord.createMany({
        data: [
            {
                batchName: "Batch A1",
                strain: "OG Kush",
                zoneId: zoneId,
                plantedDate: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
                harvestDate: null,
                status: "FLOWERING",
                yield: null,
                notes: "Healthy growth, transition to flower successful.",
                recordType: "SEED"
            },
            {
                batchName: "Batch B2",
                strain: "Sour Diesel",
                zoneId: zoneId,
                plantedDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
                harvestDate: null,
                status: "VEGETATIVE",
                yield: null,
                notes: "Rapid vegetative growth observed.",
                recordType: "SEED"
            }
        ]
    });
    console.log("Crop records seeded successfully!");
}

main()
    .catch(err => {
        console.error("Seeding failed:", err);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
