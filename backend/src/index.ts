import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { onRequest } from 'firebase-functions/v2/https';
import aiRouter from './ai/ai.routes';
import { db } from './firebase';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true }));
app.use(express.json());

// AI Chat Router
app.use('/api/ai', aiRouter);

// Health Check Endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    platform: 'Firebase Cloud Functions & Firestore',
    message: 'KindBuds Ltd. Cultivation API is running on Firebase',
  });
});

// Get all sensors
app.get('/api/sensors', async (_req, res) => {
  try {
    const snapshot = await db.collection('Sensor').get();
    const sensors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(sensors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sensors from Firestore' });
  }
});

// IoT ESP32 Telemetry Ingestion Endpoint (stores readings directly in Firestore)
app.post('/api/telemetry', async (req, res) => {
  try {
    const { sensorId, temperature, humidity, moisture, value } = req.body;
    if (!sensorId) {
      res.status(400).json({ error: 'sensorId is required' });
      return;
    }

    const now = new Date().toISOString();
    const readingId = db.collection('SensorReading').doc().id;
    const readingData = {
      id: readingId,
      sensorId,
      value: value ?? temperature ?? humidity ?? moisture ?? 0,
      temperature: temperature ?? null,
      humidity: humidity ?? null,
      moisture: moisture ?? null,
      timestamp: now,
    };

    await db.collection('SensorReading').doc(readingId).set(readingData);
    await db.collection('Sensor').doc(sensorId).set(
      {
        currentTemp: temperature ?? null,
        currentHum: humidity ?? null,
        currentMoist: moisture ?? null,
        lastSeen: now,
        status: 'ONLINE',
        updatedAt: now,
      },
      { merge: true }
    );

    res.status(201).json({ status: 'ok', reading: readingData });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to ingest telemetry' });
  }
});

// Generic Firestore Farm Data Lifecycle REST endpoints
const ALLOWED_RECORD_COLLECTIONS = new Set([
  'SeedRecord',
  'CloningRecord',
  'TransplantingRecord',
  'VegetativeRecord',
  'DiscardedRecord',
  'PreHarvestRecord',
  'PostHarvestRecord',
  'StoragePackagingRecord',
  'SprayingRecord',
  'HarvestRecord',
]);

app.get('/api/records/:collection', async (req, res) => {
  try {
    const { collection } = req.params;
    if (!ALLOWED_RECORD_COLLECTIONS.has(collection)) {
      res.status(400).json({ error: `Unsupported record collection: ${collection}` });
      return;
    }
    const snapshot = await db.collection(collection).get();
    const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch records' });
  }
});

app.post('/api/records/:collection', async (req, res) => {
  try {
    const { collection } = req.params;
    if (!ALLOWED_RECORD_COLLECTIONS.has(collection)) {
      res.status(400).json({ error: `Unsupported record collection: ${collection}` });
      return;
    }
    const now = new Date().toISOString();
    const docRef = req.body.id ? db.collection(collection).doc(req.body.id) : db.collection(collection).doc();
    const payload = {
      ...req.body,
      id: docRef.id,
      createdAt: req.body.createdAt || now,
      updatedAt: now,
    };
    await docRef.set(payload, { merge: true });
    res.status(201).json(payload);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to save record' });
  }
});

// Only listen on a local port when running outside Firebase Cloud Functions
const isCloudFunctionRuntime = Boolean(
  process.env.FUNCTION_TARGET || process.env.K_SERVICE || process.env.FUNCTIONS_EMULATOR
);

if (!isCloudFunctionRuntime && process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Firebase local dev server running on http://localhost:${PORT}`);
  });
}

// Export the Express app as a Firebase Cloud Function (v2)
export const api = onRequest({ region: 'us-central1', cors: true }, app);
