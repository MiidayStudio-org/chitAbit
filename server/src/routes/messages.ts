import { asyncRoute } from '../middleware/asyncRoute.js';
import { Router, Request, Response } from 'express';
import { dbService } from '../db/index.js';
import { sanitizeText, parseLimit, parseBefore } from '../middleware/sanitize.js';
import { requireAuth, authUserId } from '../middleware/auth.js';
import { io } from '../index.js';
import { emitToMessageAudience, sendChatMessage } from '../sockets/chatHandler.js';

const router = Router();
router.use(requireAuth);

const MAX_MESSAGE_LENGTH = 8000;

// 1. Get DM history between two users (you must be one of them)
router.get('/dm/:user1Id/:user2Id', asyncRoute(async (req: Request, res: Response) => {
  const { user1Id, user2Id } = req.params;
  const me = authUserId(req);
  if (me !== user1Id && me !== user2Id) {
    res.status(403).json({ error: 'You can only read your own conversations' });
    return;
  }

  const messages = await dbService.getDMMessages(user1Id, user2Id, parseLimit(req.query.limit), parseBefore(req.query.before));
  res.json({ messages });
}));

// 2a. Unread counts for every chat: { unreadCounts: { general: 3, user_123: 1 } }
//     Key = channel id for channels, the other user's id for DMs.
router.get('/unread', asyncRoute(async (req: Request, res: Response) => {
  res.json({ unreadCounts: await dbService.getUnreadCounts(authUserId(req)) });
}));

// 2b. Mark a chat as read.
//     Channel: { channelId }   DM: { senderId } (the other person in the DM)
router.post('/read', asyncRoute(async (req: Request, res: Response) => {
  const { senderId, channelId } = req.body ?? {};
  const me = authUserId(req);

  if (typeof channelId === 'string' && channelId) {
    if (!(await dbService.getChannelById(channelId))) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }
    await dbService.markChannelRead(me, channelId);
    res.json({ success: true });
    return;
  }

  if (typeof senderId !== 'string' || !senderId) {
    res.status(400).json({ error: 'channelId or senderId is required' });
    return;
  }

  const updatedCount = await dbService.markDMMessagesAsRead(senderId, me);
  if (updatedCount > 0) {
    io.to(`user:${senderId}`).emit('message:read_receipt', {
      readerId: me,
      readAt: Date.now(),
    });
  }

  res.json({ success: true, updatedCount });
}));

// 3. Search messages you are allowed to see
router.get('/search', asyncRoute(async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 200) : '';
  const channelId = typeof req.query.channelId === 'string' ? req.query.channelId : undefined;
  const user1Id = typeof req.query.user1Id === 'string' ? req.query.user1Id : undefined;
  const user2Id = typeof req.query.user2Id === 'string' ? req.query.user2Id : undefined;

  if (!q.trim()) {
    res.json({ messages: [] });
    return;
  }

  const messages = await dbService.searchMessages(q, authUserId(req), channelId, user1Id, user2Id);
  res.json({ messages });
}));

// 3b. Catchup synchronization after reconnect
router.get('/sync', asyncRoute(async (req: Request, res: Response) => {
  const timestamp = Number(req.query.since);
  const since = Number.isFinite(timestamp)
    ? Math.max(-Number.MAX_SAFE_INTEGER, Math.min(Math.floor(timestamp), Number.MAX_SAFE_INTEGER))
    : 0;
  const channelId = typeof req.query.channelId === 'string' ? req.query.channelId : undefined;
  const dmUserId = typeof req.query.dmUserId === 'string' ? req.query.dmUserId : undefined;

  const messages = await dbService.getMessagesSince(authUserId(req), since, channelId, dmUserId);
  res.json({ messages });
}));

// The composer uses this route while its socket is disconnected.
router.post('/send', asyncRoute(async (req: Request, res: Response) => {
  let failure: { status: number; message: string } | undefined;
  let cleared = false;
  const message = await sendChatMessage(io, req.auth!, req.body ?? {}, (event, text) => {
    if (event === 'chat:clear') cleared = true;
    if (!text) return;
    failure = { status: event === 'message:rate_limit' ? 429 : 400, message: text };
  });
  if (cleared) {
    res.json({ success: true, cleared: true });
    return;
  }
  if (!message) {
    res.status(failure?.status ?? 400).json({ error: failure?.message ?? 'Message content required' });
    return;
  }
  res.status(201).json({ success: true, message });
}));

// 4. Edit your own message
router.put('/:id', asyncRoute(async (req: Request, res: Response) => {
  const { content } = req.body ?? {};
  if (typeof content !== 'string' || !content.trim()) {
    res.status(400).json({ error: 'content is required' });
    return;
  }
  if (content.length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({ error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)` });
    return;
  }

  const updated = await dbService.updateMessage(req.params.id, authUserId(req), sanitizeText(content));
  if (!updated) {
    res.status(404).json({ error: 'Message not found or not authorized to edit' });
    return;
  }

  // Live update for everyone in the chat, same as the socket edit
  emitToMessageAudience(io, updated, 'message:edited', updated);
  res.json({ message: updated });
}));

// 5. Delete your own message
router.delete('/:id', asyncRoute(async (req: Request, res: Response) => {
  // Read it first: after deleting we still need to know which chat to notify
  const msg = await dbService.getMessageById(req.params.id);
  const success = msg ? await dbService.deleteMessage(req.params.id, authUserId(req)) : false;
  if (!msg || !success) {
    res.status(404).json({ error: 'Message not found or not authorized to delete' });
    return;
  }

  emitToMessageAudience(io, msg, 'message:deleted', { id: msg.id });
  res.json({ success: true, id: req.params.id });
}));

export default router;
