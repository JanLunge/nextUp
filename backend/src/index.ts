import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';

import roomsRouter from './routes/rooms.js';
import profilesRouter from './routes/profiles.js';
import participantsRouter from './routes/participants.js';
import wavesRouter from './routes/waves.js';
import uploadRouter from './routes/upload.js';
import { WebSocketManager } from './websocket/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
const uploadPath = process.env.UPLOAD_PATH || path.join(__dirname, '../tmp/uploads');
app.use('/uploads', express.static(uploadPath));

// Initialize WebSocket manager
const wsManager = new WebSocketManager(httpServer);
app.set('wsManager', wsManager);

// API routes
app.use('/api/rooms', roomsRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/rooms', participantsRouter);
app.use('/api/rooms', wavesRouter);
app.use('/api/upload', uploadRouter);

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
interface ErrorWithStatus extends Error {
  status?: number;
}

app.use((err: ErrorWithStatus, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  wsManager.close();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
