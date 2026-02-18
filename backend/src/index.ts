import cors from 'cors';
import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

import participantsRouter from './routes/participants.js';
import profilesRouter from './routes/profiles.js';
import roomsRouter from './routes/rooms.js';
import uploadRouter from './routes/upload.js';
import wavesRouter from './routes/waves.js';
import { WebSocketManager } from './websocket/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
import fs from 'fs';
const uploadPath = process.env.UPLOAD_PATH || path.join(__dirname, '../tmp/uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}
app.use('/uploads', express.static(uploadPath));

// Initialize WebSocket manager
const wsManager = new WebSocketManager(httpServer);
app.set('wsManager', wsManager);

// API routes
roomsRouter.use('/', participantsRouter);
roomsRouter.use('/', wavesRouter);

app.use('/api/rooms', roomsRouter);
app.use('/api/profiles', profilesRouter);
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
    error: err.message || 'Internal server error',
  });
});

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const publicPath = path.join(__dirname, '../public');
  app.use(express.static(publicPath));

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
} else {
  // 404 handler for development (API only)
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });
}

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server active at /ws`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down...');
  wsManager.close();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
