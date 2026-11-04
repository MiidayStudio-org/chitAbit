import { Router, Request, Response } from 'express';
import { dbService } from '../db/index.js';
import { toPublicUser } from '../utils/userDto.js';
import { sanitizeText } from '../middleware/sanitize.js';
import { requireAuth, authUserId } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', (_req: Request, res: Response): void => {
  res.json({ users: dbService.getAllUsers().map(toPublicUser) });
});

// Only your own status/bio can be changed
router.put('/:id/status', (req: Request, res: Response): void => {
  const { id } = req.params;
  if (id !== authUserId(req)) {
    res.status(403).json({ error: 'You can only update your own status' });
    return;
  }

  const { status, bio } = req.body ?? {};
  const cleanStatus = typeof status === 'string' ? sanitizeText(status).slice(0, 50) : undefined;
  const cleanBio = typeof bio === 'string' ? sanitizeText(bio).slice(0, 200) : undefined;

  const updated = dbService.updateUserStatus(id, cleanStatus, cleanBio);
  if (!updated) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user: toPublicUser(updated) });
});

// Look up an existing user to DM. It no longer creates accounts:
// that let anyone create (and then log into) accounts with no password.
router.post('/start-dm', (req: Request, res: Response): void => {
  const { username } = req.body ?? {};
  if (typeof username !== 'string' || !username.trim()) {
    res.status(400).json({ error: 'Username is required' });
    return;
  }
  const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
  const user = dbService.getUserByUsername(cleanUsername);

  if (!user) {
    res.status(404).json({ error: `User @${cleanUsername} does not exist` });
    return;
  }

  res.json({ user: toPublicUser(user) });
});

export default router;
