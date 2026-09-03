import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection, initDatabase, getSession } from './db/neo4j.js';
import conceptRoutes from './routes/concepts.js';
import masteryRoutes from './routes/mastery.js';
import gapRoutes from './routes/gaps.js';
import courseRoutes from './routes/courses.js';
import analyticsRoutes from './routes/analytics.js';
import authRoutes from './routes/auth.js';

dotenv.config();

// Fail fast if JWT_SECRET is missing
if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set');
}

const app = express();
const PORT = process.env.PORT || 4000;

// Dynamic CORS origins from FRONTEND_URL env var
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(s => s.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());

// Public health endpoints (no auth required)
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/health/db', async (req, res) => {
  const session = getSession();
  try {
    await session.run('RETURN 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: err.message });
  } finally {
    await session.close();
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/concepts', conceptRoutes);
app.use('/api/mastery', masteryRoutes);
app.use('/api/gaps', gapRoutes);
app.use('/api/analytics', analyticsRoutes);

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await testConnection();
  try {
    await initDatabase();
  } catch (err) {
    console.warn('⚠ Could not initialize indexes:', err.message);
  }
});
