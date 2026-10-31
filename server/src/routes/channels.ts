import { Router, Request, Response } from 'express';
import { dbService } from '../db/index.js';
import { validateChannelName, sanitizeText } from '../middleware/sanitize.js';

const router = Router();

router.get('/', (_req: Request, res: Response): void => {
  try {
    const channels = dbService.getChannels();
    res.json({ channels });
  } catch (err) {
    console.error('[GET /api/channels error]:', err);
    res.status(500).json({ error: String(err) });
  }
});

router.post('/', (req: Request, res: Response): void => {
  const { name, description, createdBy } = req.body;
  const validation = validateChannelName(name);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error });
    return;
  }

  const cleanName = name.trim().toLowerCase().replace(/^#/, '');
  const existing = dbService.getChannelByName(cleanName);
  if (existing) {
    res.status(409).json({ error: `Channel #${cleanName} already exists` });
    return;
  }

  const id = cleanName;
  const cleanDescription = description ? sanitizeText(description) : null;
  const channel = dbService.createChannel(id, cleanName, cleanDescription, createdBy || 'anonymous');
  res.status(201).json({ channel });
});

router.get('/:channelId/messages', (req: Request, res: Response): void => {
  const { channelId } = req.params;
  const channel = dbService.getChannelById(channelId);
  if (!channel) {
    res.status(404).json({ error: 'Channel not found' });
    return;
  }
  const before = req.query.before ? Number(req.query.before) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 40;
  const messages = dbService.getChannelMessages(channelId, limit, before);
  res.json({ messages });
});

export default router;
