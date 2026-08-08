"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const ai_routes_1 = __importDefault(require("./ai/ai.routes"));
const firebase_1 = require("./firebase");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/ai', ai_routes_1.default);
// Health Check Endpoint
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', message: 'KindBuds Ltd. Cultivation API is running on Firebase' });
});
const https_1 = require("firebase-functions/v2/https");
// Get all sensors
app.get('/api/sensors', async (_req, res) => {
    try {
        const snapshot = await firebase_1.db.collection('Sensor').get();
        const sensors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(sensors);
    }
    catch (error) {
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
exports.api = (0, https_1.onRequest)({ region: 'us-central1' }, app);
