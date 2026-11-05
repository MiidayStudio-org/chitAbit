import './config/env.js'; // must stay first: loads .env before other modules read it
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import channelsRoutes from './routes/channels.js';
import messagesRoutes from './routes/messages.js';
import usersRoutes from './routes/users.js';
import friendsRoutes from './routes/friends.js';
import uploadRoutes from './routes/upload.js';
import mediaRoutes from './routes/media.js';
import { registerChatHandlers } from './sockets/chatHandler.js';
import { getJwtSecret } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Which websites may call this API from the browser.
// CLIENT_ORIGIN in .env: comma-separated list, e.g. "https://chitabit.app".
// Not set: any origin in development, same-origin only in production.
function resolveCorsOrigin(): string[] | string | false {
  const list = (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length > 0) return list;
  return process.env.NODE_ENV === 'production' ? false : '*';
}
const corsOrigin = resolveCorsOrigin();

export const app = express();
const server = http.createServer(app);

// Uploads directory static serving
const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Socket.io configuration
export const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Fail fast if JWT_SECRET is missing in production
getJwtSecret();

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '100kb' }));

// Uploaded files are user content: never let the browser run them as a page.
const INLINE_IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
app.use(
  '/uploads',
  express.static(uploadsDir, {
    dotfiles: 'deny',
    index: false,
    setHeaders: (res, filePath) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");
      if (!INLINE_IMAGE_EXT.has(path.extname(filePath).toLowerCase())) {
        res.setHeader('Content-Disposition', 'attachment');
      }
    },
  })
);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/media', mediaRoutes);

// Status / Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here'),
  });
});

// Register Socket.io events
registerChatHandlers(io);

const PORT = process.env.PORT || 3001;

// Only listen if not imported by tests
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`[Server] ChatAbit backend running on http://localhost:${PORT}`);
    console.log(`[Server] DevBot status: ${process.env.GEMINI_API_KEY ? 'Live Gemini AI' : 'Demo Mode (No API key found)'}`);
  });
}

export { server };
