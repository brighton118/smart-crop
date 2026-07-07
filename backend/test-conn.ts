import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient({
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
    }
}

main();
