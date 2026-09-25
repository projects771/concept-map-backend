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

// Public health & keep-alive endpoints (no auth required)
app.get('/health', async (req, res) => {
  const session = getSession();
  try {
    await session.run('RETURN 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(200).json({ status: 'ok', db_status: 'reconnecting', error: err.message, timestamp: new Date().toISOString() });
  } finally {
    await session.close();
  }
});

app.get('/health/db', async (req, res) => {
  const session = getSession();
  try {
    await session.run('RETURN 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
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

  // 1. Keep-alive heartbeat: ping Neo4j every 5 minutes to prevent idle connection drop & AuraDB pause
  const DB_HEARTBEAT_MS = 5 * 60 * 1000;
  setInterval(async () => {
    try {
      const session = getSession();
      try {
        await session.run('RETURN 1 AS keepalive');
        // console.log('[Neo4j] Keep-alive ping OK');
      } finally {
        await session.close();
      }
    } catch (err) {
      console.warn('⚠ Neo4j background keep-alive error:', err.message);
    }
  }, DB_HEARTBEAT_MS);

  // 2. Self-ping to keep Render free tier awake (Render spins down after 15 min of no incoming requests)
  const selfUrl = process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL || 'https://concept-map-backend.onrender.com';
  const SELF_PING_MS = 10 * 60 * 1000; // Ping every 10 minutes
  setInterval(async () => {
    if (selfUrl && !selfUrl.includes('localhost')) {
      try {
        const response = await fetch(`${selfUrl}/health/db`);
        if (response.ok) {
          console.log(`[KeepAlive] Self-ping successful: ${selfUrl}/health/db`);
        }
      } catch (err) {
        console.warn('[KeepAlive] Self-ping warning:', err.message);
      }
    }
  }, SELF_PING_MS);
});

