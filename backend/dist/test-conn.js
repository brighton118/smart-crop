"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load env from backend/.env
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
const connectionString = process.env.DATABASE_URL ? process.env.DATABASE_URL.split('?')[0] : '';
const pool = new pg_1.Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false,
    },
});
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({
    adapter,
    log: ['query', 'info', 'warn', 'error'],
});
async function main() {
    console.log("DATABASE_URL:", process.env.DATABASE_URL);
    try {
        console.log("Trying to query User table...");
        const users = await prisma.user.findMany();
        console.log("Users found:", users);
    }
    catch (error) {
        console.error("Connection failed:", error);
    }
    finally {
        await prisma.$disconnect();
        await pool.end();
    }
}
main();
