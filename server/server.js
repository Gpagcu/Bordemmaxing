// server/server.js
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  getAllQuests,
  addUserQuest,
  spinForQuest,
  completeQuest,
  getHistory,
  deleteUserQuest,
  resetHistory,
  toggleQuestActive,
} from './questsrepo.js';
import pool from './db/pool.js';
import { generateQuestIdea } from './aiService.js';

// Load .env from server/.env regardless of where `node` was run from.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));
app.use(express.json());

// Render sits behind a proxy, so without this every request looks like it
// comes from the same IP and rate limiting would throttle everyone together.
app.set('trust proxy', 1);

// Access gate. The public site lives behind Cloudflare Access; the Cloudflare
// Worker forwards API calls here with a shared secret header. Anything without
// it (someone hitting the raw Render URL directly) is rejected, so the login
// wall can't be bypassed by skipping Cloudflare.
const PROXY_SECRET = process.env.PROXY_SECRET;
if (process.env.NODE_ENV === 'production' && !PROXY_SECRET) {
  // Fail closed: better a loud crash than a silently open API.
  console.error('PROXY_SECRET is not set. Refusing to start in production without it.');
  process.exit(1);
}
app.use((req, res, next) => {
  if (!PROXY_SECRET) return next(); // local development: no gate
  const sent = Buffer.from(String(req.headers['x-proxy-secret'] || ''));
  const expected = Buffer.from(PROXY_SECRET);
  const ok = sent.length === expected.length && crypto.timingSafeEqual(sent, expected);
  if (!ok) return res.status(403).json({ error: 'Forbidden' });
  next();
});

// The AI endpoint calls a metered external API, so it gets a tight limit:
// 5 requests per minute per IP.
const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Please wait a minute and try again.' },
});

// A looser limit across the whole API, mainly to blunt scripted abuse:
// 120 requests per minute per IP.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});
app.use('/api', apiLimiter);

// Do NOT set PORT in .env — the host sets it in production. This fallback is for local dev only.
const PORT = process.env.PORT || 4000;
const isProd = process.env.NODE_ENV === 'production';

// For this course project, a simple query-param or header user id is enough —
// no full auth system needed. Swap for real auth later if you want.
// getUserId still tags who added a quest or completed one, purely as a
// record — it no longer restricts what anyone can see or spin, since this
// project has no real accounts.
function getUserId(req) {
  return req.query.userId || req.headers['x-user-id'] || 'demo-user';
}

// Purely cosmetic — so a visitor (or grader) opening the bare API URL sees
// something informative instead of Express's default "Cannot GET /".
app.get('/', (req, res) => {
  res.json({
    name: 'Bordemmaxing API',
    status: 'running',
    endpoints: ['/healthz', '/api/quests', '/api/quests/spin', '/api/history'],
  });
});

// Used by deployment platforms (and the course template's own docs) to check
// the API is up and can actually reach the database, not just that the
// process is running.
app.get('/healthz', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    console.error(err);
    res.status(503).json({ status: 'error', error: 'Database unreachable' });
  }
});

app.get('/api/quests', async (req, res) => {
  try {
    const { rarity, category } = req.query;
    const quests = await getAllQuests({ rarity, category });
    res.json(quests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch quests' });
  }
});

app.get('/api/quests/spin', async (req, res) => {
  try {
    const quest = await spinForQuest();
    if (!quest) return res.status(404).json({ error: 'No quests available' });
    res.json(quest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to spin for a quest' });
  }
});

// Suggests a quest via Gemini. This only generates a suggestion — it does
// NOT save anything. The user still reviews/edits it and hits the normal
// "Add quest" button (POST /api/quests) to actually create it.
app.post('/api/quests/generate', generateLimiter, async (req, res) => {
  try {
    const idea = await generateQuestIdea();
    res.json(idea);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Could not generate a quest idea right now. Try again.' });
  }
});

app.post('/api/quests', async (req, res) => {
  try {
    const { text, category } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Quest text is required' });
    }
    const quest = await addUserQuest({ text, category, userId: getUserId(req) });
    res.status(201).json(quest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add quest' });
  }
});

app.patch('/api/quests/:id/complete', async (req, res) => {
  try {
    const quest = await completeQuest(req.params.id, getUserId(req));
    if (!quest) return res.status(404).json({ error: 'Quest not found' });
    res.json(quest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to complete quest' });
  }
});

app.delete('/api/quests/:id', async (req, res) => {
  try {
    const deleted = await deleteUserQuest(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Quest not found, or it is a preset and cannot be deleted' });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete quest' });
  }
});

// Toggles active/inactive — hides a quest from spins without deleting it.
app.patch('/api/quests/:id/toggle-active', async (req, res) => {
  try {
    const quest = await toggleQuestActive(req.params.id);
    if (!quest) return res.status(404).json({ error: 'Quest not found, or it is a preset' });
    res.json(quest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update quest' });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const history = await getHistory();
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Clears the completion log and resets every quest's completion state —
// a deliberate "start fresh" action, not something that happens by accident
// from the normal spin/complete flow.
app.delete('/api/history', async (req, res) => {
  try {
    await resetHistory();
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reset history' });
  }
});

app.listen(PORT, () => {
  console.log(`Bordemmaxing API running on port ${PORT} (${isProd ? 'production' : 'development'})`);
});