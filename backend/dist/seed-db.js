"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = __importDefault(require("pg"));
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const { Pool } = pg_1.default;
// Load env from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const connectionString = process.env.DATABASE_URL ? process.env.DATABASE_URL.split('?')[0] : '';
const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false,
    },
});
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
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
