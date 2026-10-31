import { Router, Request, Response } from 'express';
import { dbService } from '../db/index.js';

const router = Router();

const AVATAR_COLORS = [
  '#06c755', // LINE green
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#6366f1', // indigo
];

function getRandomColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

router.get('/', (_req: Request, res: Response): void => {
  const users = dbService.getAllUsers().map((u) => ({
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    avatarColor: u.avatar_color,
    bio: u.bio || 'Building cool stuff 💻',
    status: u.status || 'Online',
    isBot: Boolean(u.is_bot),
    createdAt: u.created_at,
  }));
  res.json({ users });
});

router.put('/:id/status', (req: Request, res: Response): void => {
  const { id } = req.params;
  const { status, bio } = req.body;
  const updated = dbService.updateUserStatus(id, status, bio);
  if (!updated) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({
    user: {
      id: updated.id,
      username: updated.username,
      displayName: updated.display_name,
      avatarColor: updated.avatar_color,
      bio: updated.bio || 'Building cool stuff 💻',
      status: updated.status || 'Online',
      isBot: Boolean(updated.is_bot),
      createdAt: updated.created_at,
    },
  });
});

router.post('/start-dm', (req: Request, res: Response): void => {
  const { username } = req.body;
  if (!username) {
    res.status(400).json({ error: 'Username is required' });
    return;
  }
  const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
  let user = dbService.getUserByUsername(cleanUsername);

  if (!user) {
    const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const avatarColor = getRandomColor(cleanUsername);
    user = dbService.createUser(id, cleanUsername, null, username.trim(), avatarColor);
  }

  res.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatarColor: user.avatar_color,
      bio: user.bio || 'Building cool stuff 💻',
      status: user.status || 'Online',
      isBot: Boolean(user.is_bot),
      createdAt: user.created_at,
    },
  });
});

export default router;
