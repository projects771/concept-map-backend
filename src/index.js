import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './db/neo4j.js';
import conceptRoutes from './routes/concepts.js';
import masteryRoutes from './routes/mastery.js';
import gapRoutes from './routes/gaps.js';
import courseRoutes from './routes/courses.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://projects771.github.io'
  ]
}));

app.use('/api/courses', courseRoutes);
app.use('/api/concepts', conceptRoutes);
app.use('/api/mastery', masteryRoutes);
app.use('/api/gaps', gapRoutes);

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await testConnection();
});
