import { Router, Request, Response } from 'express';
import { dbService } from '../db/index.js';
import { sanitizeText, parseLimit, parseBefore } from '../middleware/sanitize.js';
import { requireAuth, authUserId } from '../middleware/auth.js';
import { io } from '../index.js';
import { emitToMessageAudience } from '../sockets/chatHandler.js';

const router = Router();
router.use(requireAuth);

const MAX_MESSAGE_LENGTH = 8000;

// 1. Get DM history between two users (you must be one of them)
router.get('/dm/:user1Id/:user2Id', (req: Request, res: Response): void => {
  const { user1Id, user2Id } = req.params;
  const me = authUserId(req);
  if (me !== user1Id && me !== user2Id) {
    res.status(403).json({ error: 'You can only read your own conversations' });
    return;
  }

  const messages = dbService.getDMMessages(user1Id, user2Id, parseLimit(req.query.limit), parseBefore(req.query.before));
  res.json({ messages });
});

// 2a. Unread counts for every chat: { unreadCounts: { general: 3, user_123: 1 } }
//     Key = channel id for channels, the other user's id for DMs.
router.get('/unread', (req: Request, res: Response): void => {
  res.json({ unreadCounts: dbService.getUnreadCounts(authUserId(req)) });
});

// 2b. Mark a chat as read.
//     Channel: { channelId }   DM: { senderId } (the other person in the DM)
router.post('/read', (req: Request, res: Response): void => {
  const { senderId, channelId } = req.body ?? {};
  const me = authUserId(req);

  if (typeof channelId === 'string' && channelId) {
    if (!dbService.getChannelById(channelId)) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }
    dbService.markChannelRead(me, channelId);
    res.json({ success: true });
    return;
  }

  if (typeof senderId !== 'string' || !senderId) {
    res.status(400).json({ error: 'channelId or senderId is required' });
    return;
  }

  const updatedCount = dbService.markDMMessagesAsRead(senderId, me);
  if (updatedCount > 0) {
    io.to(`user:${senderId}`).emit('message:read_receipt', {
      readerId: me,
      readAt: Date.now(),
    });
  }

  res.json({ success: true, updatedCount });
});

// 3. Search messages you are allowed to see
router.get('/search', (req: Request, res: Response): void => {
  const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 200) : '';
  const channelId = typeof req.query.channelId === 'string' ? req.query.channelId : undefined;
  const user1Id = typeof req.query.user1Id === 'string' ? req.query.user1Id : undefined;
  const user2Id = typeof req.query.user2Id === 'string' ? req.query.user2Id : undefined;

  if (!q.trim()) {
    res.json({ messages: [] });
    return;
  }

  const messages = dbService.searchMessages(q, authUserId(req), channelId, user1Id, user2Id);
  res.json({ messages });
});

// 4. Edit your own message
router.put('/:id', (req: Request, res: Response): void => {
  const { content } = req.body ?? {};
  if (typeof content !== 'string' || !content.trim()) {
    res.status(400).json({ error: 'content is required' });
    return;
  }
  if (content.length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({ error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)` });
    return;
  }

  const updated = dbService.updateMessage(req.params.id, authUserId(req), sanitizeText(content));
  if (!updated) {
    res.status(404).json({ error: 'Message not found or not authorized to edit' });
    return;
  }

  // Live update for everyone in the chat, same as the socket edit
  emitToMessageAudience(io, updated, 'message:edited', updated);
  res.json({ message: updated });
});

// 5. Delete your own message
router.delete('/:id', (req: Request, res: Response): void => {
  // Read it first: after deleting we still need to know which chat to notify
  const msg = dbService.getMessageById(req.params.id);
  const success = msg ? dbService.deleteMessage(req.params.id, authUserId(req)) : false;
  if (!msg || !success) {
    res.status(404).json({ error: 'Message not found or not authorized to delete' });
    return;
  }

  emitToMessageAudience(io, msg, 'message:deleted', { id: msg.id });
  res.json({ success: true, id: req.params.id });
});

export default router;
