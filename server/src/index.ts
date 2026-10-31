import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import channelsRoutes from './routes/channels.js';
import messagesRoutes from './routes/messages.js';
import usersRoutes from './routes/users.js';
import friendsRoutes from './routes/friends.js';
import uploadRoutes from './routes/upload.js';
import { registerChatHandlers } from './sockets/chatHandler.js';
import { dbService } from './db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/upload', uploadRoutes);

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
    console.log(`[Server] chitAbit backend running on http://localhost:${PORT}`);
    console.log(`[Server] DevBot status: ${process.env.GEMINI_API_KEY ? 'Live Gemini AI' : 'Demo Mode (No API key found)'}`);
  });
}

export { server };
