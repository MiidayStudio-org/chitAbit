import { Router, Request, Response } from 'express';
import { dbService } from '../db/index.js';
import { sanitizeText } from '../middleware/sanitize.js';
import { io } from '../index.js';

const router = Router();

// 1. Get DM message history between two users (supports pagination with before & limit)
router.get('/dm/:user1Id/:user2Id', (req: Request, res: Response): void => {
  const { user1Id, user2Id } = req.params;
  const before = req.query.before ? Number(req.query.before) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 40;

  const messages = dbService.getDMMessages(user1Id, user2Id, limit, before);
  res.json({ messages });
});

// 2. Mark DM messages as read
router.post('/read', (req: Request, res: Response): void => {
  const { senderId, recipientId } = req.body;
  if (!senderId || !recipientId) {
    res.status(400).json({ error: 'senderId and recipientId are required' });
    return;
  }

  const updatedCount = dbService.markDMMessagesAsRead(senderId, recipientId);

  if (updatedCount > 0) {
    // Notify sender that recipient read their messages (updates "Read" label live)
    io.to(`user:${senderId}`).emit('message:read_receipt', {
      readerId: recipientId,
      readAt: Date.now(),
    });
  }

  res.json({ success: true, updatedCount });
});

// 3. Search messages in chat
router.get('/search', (req: Request, res: Response): void => {
  const q = req.query.q as string;
  const channelId = req.query.channelId as string | undefined;
  const user1Id = req.query.user1Id as string | undefined;
  const user2Id = req.query.user2Id as string | undefined;

  if (!q || !q.trim()) {
    res.json({ messages: [] });
    return;
  }

  const messages = dbService.searchMessages(q, channelId, user1Id, user2Id);
  res.json({ messages });
});

// 4. Edit message
router.put('/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const { senderId, content } = req.body;
  if (!senderId || !content) {
    res.status(400).json({ error: 'senderId and content are required' });
    return;
  }

  const cleanContent = sanitizeText(content);
  const updated = dbService.updateMessage(id, senderId, cleanContent);
  if (!updated) {
    res.status(404).json({ error: 'Message not found or not authorized to edit' });
    return;
  }

  res.json({ message: updated });
});

// 5. Delete message
router.delete('/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const { senderId } = req.body;
  if (!senderId) {
    res.status(400).json({ error: 'senderId is required' });
    return;
  }

  const success = dbService.deleteMessage(id, senderId);
  if (!success) {
    res.status(404).json({ error: 'Message not found or not authorized to delete' });
    return;
  }

  res.json({ success: true, id });
});

export default router;
