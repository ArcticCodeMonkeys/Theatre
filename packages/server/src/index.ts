import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import imagesRouter from './images.js';
import sheetsRouter from './sheets.js';
import chatRouter from './chat.js';
import authRouter from './auth.js';
import { getDb, persist } from './db.js';

const app = express();
const httpServer = createServer(app);

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET','POST','PATCH','PUT','DELETE','OPTIONS'],
}));
app.use(express.json());

// ── Sessions + Passport ──────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET ?? 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));
app.use(passport.initialize());
app.use(passport.session());

app.use('/auth',       authRouter);
app.use('/api/images', imagesRouter);
app.use('/api/sheets', sheetsRouter);
app.use('/api/chat',   chatRouter);

// ── Map state REST ────────────────────────────────────────────────────────
app.get('/api/map', async (_req, res) => {
  const db = await getDb();
  const result = db.exec('SELECT data FROM map_state WHERE id = 1');
  if (!result.length || !result[0].values.length) return res.json({ mapLayer: [], tokenLayer: [] });
  try { res.json(JSON.parse(result[0].values[0][0] as string)); }
  catch { res.json({ mapLayer: [], tokenLayer: [] }); }
});

app.put('/api/map', async (req, res) => {
  const db = await getDb();
  const data = JSON.stringify(req.body);
  db.run('UPDATE map_state SET data = ? WHERE id = 1', [data]);
  persist();
  res.json({ ok: true });
});

// ── Users list ────────────────────────────────────────────────────────────────
app.get('/api/users', async (_req, res) => {
  const db = await getDb();
  const result = db.exec('SELECT id, username, avatar_url FROM users ORDER BY username');
  if (!result.length) return res.json([]);
  const { columns, values } = result[0];
  res.json(values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]]))));
});

// ── Socket.io ─────────────────────────────────────────────────────────────────

const io = new Server(httpServer, {
  cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'], credentials: true },
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

interface PresenceUser {
  id: number;
  username: string;
  avatar_url: string | null;
}

// socketId → user info
const onlineUsers = new Map<string, PresenceUser>();

function broadcastUsers() {
  io.emit('users:update', Array.from(onlineUsers.values()));
}

io.on('connection', (socket) => {
  console.log(`[Theatre] Client connected: ${socket.id}`);

  // ── User presence ──────────────────────────────────────────────────────
  socket.on('user:join', (user: PresenceUser) => {
    onlineUsers.set(socket.id, user);
    broadcastUsers();
  });

  // ── Map sync ───────────────────────────────────────────────────────────
  // A client pushed a new map state; save it and relay to everyone else.
  socket.on('map:push', async (data: unknown) => {
    try {
      const db = await getDb();
      db.run('UPDATE map_state SET data = ? WHERE id = 1', [JSON.stringify(data)]);
      persist();
      socket.broadcast.emit('map:update', data);
    } catch (err) {
      console.error('[map:push] failed:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Theatre] Client disconnected: ${socket.id}`);
    onlineUsers.delete(socket.id);
    broadcastUsers();
  });
});

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => {
  console.log(`[Theatre] Server running on http://localhost:${PORT}`);
});
