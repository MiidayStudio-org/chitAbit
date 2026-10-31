import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { dbService } from '../db/index.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'chitabit_secret_jwt_key_2026';

// Helper to extract userId from Auth Header or query
function getUserId(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      return decoded.userId;
    } catch {
      // ignore
    }
  }
  if (req.query.userId && typeof req.query.userId === 'string') {
    return req.query.userId;
  }
  if (req.body.userId && typeof req.body.userId === 'string') {
    return req.body.userId;
  }
  return null;
}

// 1. Get confirmed friends list for current user
router.get('/', (req: Request, res: Response): void => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized: No user identified' });
    return;
  }

  const friends = dbService.getFriends(userId).map((u) => ({
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    avatarColor: u.avatar_color,
    avatarUrl: u.avatar_url || null,
    fileIcon: u.file_icon || 'ts',
    bio: u.bio || 'Hey there! I am using chitAbit.',
    status: u.status || 'Online',
    isBot: Boolean(u.is_bot),
    createdAt: u.created_at,
  }));

  res.json({ friends });
});

// 2. Search users to add as friends
router.get('/search', (req: Request, res: Response): void => {
  const query = (req.query.q as string) || '';
  const currentUserId = getUserId(req) || undefined;

  if (!query.trim()) {
    res.json({ users: [] });
    return;
  }

  const matches = dbService.searchUsers(query, currentUserId).map((u) => ({
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    avatarColor: u.avatar_color,
    avatarUrl: u.avatar_url || null,
    fileIcon: u.file_icon || 'ts',
    bio: u.bio || 'Hey there! I am using chitAbit.',
    status: u.status || 'Online',
    isBot: false,
    isFriend: currentUserId ? dbService.isFriend(currentUserId, u.id) : false,
  }));

  res.json({ users: matches });
});

// 3. Get pending friend requests (incoming & outgoing)
router.get('/requests', (req: Request, res: Response): void => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const requests = dbService.getFriendRequests(userId);
  res.json(requests);
});

// 4. Send friend request (or add directly)
router.post('/request', (req: Request, res: Response): void => {
  const senderId = getUserId(req);
  const { targetUsername, targetUserId } = req.body;

  if (!senderId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  let receiver = targetUserId ? dbService.getUserById(targetUserId) : null;
  if (!receiver && targetUsername) {
    const clean = targetUsername.trim().toLowerCase().replace(/^@/, '');
    receiver = dbService.getUserByUsername(clean);
  }

  if (!receiver) {
    res.status(404).json({ error: 'Target user does not exist' });
    return;
  }

  if (receiver.id === senderId) {
    res.status(400).json({ error: 'Cannot add yourself as a friend' });
    return;
  }

  if (receiver.id === 'devbot') {
    // DevBot is always accessible, auto-add as friend
    dbService.addFriend(senderId, 'devbot');
    res.json({ success: true, message: 'DevBot added to your contacts!' });
    return;
  }

  const result = dbService.createFriendRequest(senderId, receiver.id);
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json({
    success: true,
    autoAccepted: Boolean(result.autoAccepted),
    message: result.autoAccepted ? 'You are now friends!' : 'Friend request sent',
  });
});

// 5. Accept or decline friend request
router.post('/respond', (req: Request, res: Response): void => {
  const userId = getUserId(req);
  const { requestId, action } = req.body; // action: 'accept' | 'decline'

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!requestId || !['accept', 'decline'].includes(action)) {
    res.status(400).json({ error: 'Invalid requestId or action' });
    return;
  }

  const result = dbService.respondToFriendRequest(requestId, userId, action);
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json({ success: true, action });
});

// 6. Remove friend
router.delete('/:friendId', (req: Request, res: Response): void => {
  const userId = getUserId(req);
  const { friendId } = req.params;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  dbService.removeFriend(userId, friendId);
  res.json({ success: true });
});

export default router;
