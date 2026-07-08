import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Load environment variables from backend/.env
dotenv.config({ path: '.env' });

const connectionString = process.env.DATABASE_URL ? process.env.DATABASE_URL.split('?')[0] : '';

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});
const adapter = new PrismaPg(pool);

const app = express();
const prisma = new PrismaClient({ adapter });
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'KindBuds Ltd. Cultivation API is running' });
});

// Get all sensors
app.get('/api/sensors', async (_req, res) => {
  try {
    const sensors = await prisma.sensor.findMany();
    res.json(sensors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sensors' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
