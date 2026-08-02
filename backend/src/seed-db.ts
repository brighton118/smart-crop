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

    const cropBatchCount = await prisma.cropBatch.count();
    if (cropBatchCount > 0) {
        console.log(`Database already has ${cropBatchCount} crop batches. Skipping seed.`);
        return;
    }

    console.log("Inserting seed crop records...");
    const now = new Date();

    const batchA1 = await prisma.cropBatch.create({
        data: {
            batchName: "Batch A1",
            zoneId: zoneId,
            status: "ACTIVE",
        }
    });
    await prisma.plantingRecord.create({
        data: {
            batchId: batchA1.id,
            strain: "OG Kush",
            plantedDate: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
            notes: "Healthy growth, transition to flower successful."
        }
    });

    const batchB2 = await prisma.cropBatch.create({
        data: {
            batchName: "Batch B2",
            zoneId: zoneId,
            status: "ACTIVE",
        }
    });
    await prisma.plantingRecord.create({
        data: {
            batchId: batchB2.id,
            strain: "Sour Diesel",
            plantedDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
            notes: "Rapid vegetative growth observed."
        }
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
