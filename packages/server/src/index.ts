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
    secure: false,       // set true when serving over HTTPS
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
  },
}));
app.use(passport.initialize());
app.use(passport.session());

app.use('/auth',       authRouter);
app.use('/api/images', imagesRouter);
app.use('/api/sheets', sheetsRouter);
app.use('/api/chat',   chatRouter);

const io = new Server(httpServer, {
  cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'] },
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

io.on('connection', (socket) => {
  console.log(`[Theatre] Client connected: ${socket.id}`);

  socket.on('session:join', (sessionId: string) => {
    socket.join(sessionId);
    console.log(`[Theatre] ${socket.id} joined session ${sessionId}`);
    socket.emit('session:joined', { sessionId });
  });

  socket.on('disconnect', () => {
    console.log(`[Theatre] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => {
  console.log(`[Theatre] Server running on http://localhost:${PORT}`);
});
