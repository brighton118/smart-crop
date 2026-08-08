import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import aiRouter from './ai/ai.routes';
import { db } from './firebase';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/ai', aiRouter);

// Health Check Endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'KindBuds Ltd. Cultivation API is running on Firebase' });
});

import { onRequest } from 'firebase-functions/v2/https';

// Get all sensors
app.get('/api/sensors', async (_req, res) => {
  try {
    const snapshot = await db.collection('Sensor').get();
    const sensors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(sensors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sensors' });
  }
});

// Run normally in local dev
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

// Export the API for Firebase Cloud Functions
export const api = onRequest({ region: 'us-central1' }, app);
