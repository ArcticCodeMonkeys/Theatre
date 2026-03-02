import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import imagesRouter from './images.js';
import sheetsRouter from './sheets.js';

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use('/api/images', imagesRouter);
app.use('/api/sheets', sheetsRouter);

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
