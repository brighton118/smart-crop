import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './db';
import aiRouter from './ai/ai.routes';

// Load environment variables from backend/.env
dotenv.config({ path: '.env' });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/ai', aiRouter);

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
