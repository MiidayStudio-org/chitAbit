import { Router, Request, Response } from 'express';
import { dbService } from '../db/index.js';
import { validateChannelName, sanitizeText, parseLimit, parseBefore } from '../middleware/sanitize.js';
import { requireAuth, authUserId } from '../middleware/auth.js';
import { io } from '../index.js';

const router = Router();
router.use(requireAuth);

router.get('/', (_req: Request, res: Response): void => {
  try {
    const channels = dbService.getChannels();
    res.json({ channels });
  } catch (err) {
    console.error('[GET /api/channels error]:', err);
    res.status(500).json({ error: 'Failed to load channels' });
  }
});

router.post('/', (req: Request, res: Response): void => {
  const { name, description } = req.body ?? {};
  const validation = validateChannelName(name);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error });
    return;
  }

  const cleanName = name.trim().toLowerCase().replace(/^#/, '');
  if (dbService.getChannelByName(cleanName)) {
    res.status(409).json({ error: `Channel #${cleanName} already exists` });
    return;
  }

  const cleanDescription =
    typeof description === 'string' && description.trim() ? sanitizeText(description).slice(0, 200) : null;
  // createdBy always comes from the token, not the request body
  const channel = dbService.createChannel(cleanName, cleanName, cleanDescription, authUserId(req));
  // Everyone online joins the new room and sees the channel right away
  io.socketsJoin(`channel:${channel.id}`);
  io.emit('channel:created', channel);
  res.status(201).json({ channel });
});

router.get('/:channelId/messages', (req: Request, res: Response): void => {
  const { channelId } = req.params;
  if (!dbService.getChannelById(channelId)) {
    res.status(404).json({ error: 'Channel not found' });
    return;
  }
  const messages = dbService.getChannelMessages(channelId, parseLimit(req.query.limit), parseBefore(req.query.before));
  res.json({ messages });
});

export default router;
