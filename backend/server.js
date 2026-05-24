import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import complaintRoutes from './routes/complaints.js';
import userRoutes from './routes/users.js';
import analyticsRoutes from './routes/analytics.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// Keep CORS origin configurable so local and deployed frontends can share the API.
app.use(cors({
  origin(origin, callback) {
    if (!origin || CLIENT_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/complaints', complaintRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

async function connectToMongo() {
  const uri = process.env.MONGODB_URI;
  // Start the API even when Mongo is not configured so health checks and setup
  // errors stay visible instead of crashing the process immediately.
  if (!uri || uri.includes('<user>')) {
    console.warn('WARNING: No valid MONGODB_URI found in .env. Please set it to connect to your database.');
  } else {
    try {
      await mongoose.connect(uri);
      console.log('Connected to MongoDB');
    } catch (err) {
      console.error('MongoDB connection error:', err);
    }
  }
}

connectToMongo().finally(() => {
  app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
});
