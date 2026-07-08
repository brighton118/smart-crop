import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

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

const prisma = new PrismaClient({
    adapter,
    log: ['query', 'info', 'warn', 'error'],
});

async function main() {
    console.log("DATABASE_URL:", process.env.DATABASE_URL);
    try {
        console.log("Trying to query User table...");
        const users = await prisma.user.findMany();
        console.log("Users found:", users);
    } catch (error) {
        console.error("Connection failed:", error);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main();
