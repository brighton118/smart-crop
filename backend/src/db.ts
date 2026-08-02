import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL ? process.env.DATABASE_URL.split('?')[0] : '';

const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false,
    },
});
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
