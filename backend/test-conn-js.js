process.env.DEBUG = 'prisma*';
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL ? process.env.DATABASE_URL.split('?')[0] : '';

const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("DATABASE_URL:", process.env.DATABASE_URL);
    try {
        console.log("Calling $connect...");
        await prisma.$connect();
        console.log("$connect succeeded!");
        console.log("Checking record counts...");
        const counts = {};
        counts.users = await prisma.user.count();
        counts.farms = await prisma.farm.count();
        counts.zones = await prisma.zone.count();
        counts.sensors = await prisma.sensor.count();
        counts.cropRecords = await prisma.cropRecord.count();
        console.log("Record counts:", counts);
    } catch (error) {
        console.error("Connection failed:", error);
    } finally {
        console.log("Calling disconnect...");
        await prisma.$disconnect();
        console.log("disconnect succeeded!");
        await pool.end();
        console.log("Pool ended!");
    }
}
main();
