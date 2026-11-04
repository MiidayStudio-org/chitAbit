import { Router, Request, Response } from 'express';
import { dbService } from '../db/index.js';
import { requireAuth, authUserId } from '../middleware/auth.js';
import { io } from '../index.js';
import { toPublicUser } from '../utils/userDto.js';

const router = Router();

// Every friends route needs a valid token. The user is ALWAYS taken from the token,
// never from ?userId= or the body (that let anyone act as anyone).
router.use(requireAuth);
const getUserId = (req: Request): string => authUserId(req);

// 1. Get confirmed friends list for current user
router.get('/', (req: Request, res: Response): void => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized: No user identified' });
    return;
  }

  const friends = dbService.getFriends(userId).map(toPublicUser);

  res.json({ friends });
});

// 2. Search users to add as friends
router.get('/search', (req: Request, res: Response): void => {
  const query = typeof req.query.q === 'string' ? req.query.q.slice(0, 50) : '';
  const currentUserId = getUserId(req);

  if (!query.trim()) {
    res.json({ users: [] });
    return;
  }

  const matches = dbService.searchUsers(query, currentUserId).map((u) => ({
    ...toPublicUser(u),
    isFriend: dbService.isFriend(currentUserId, u.id),
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
  const { targetUsername, targetUserId } = req.body ?? {};

  if (!senderId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  let receiver = typeof targetUserId === 'string' ? dbService.getUserById(targetUserId) : undefined;
  if (!receiver && typeof targetUsername === 'string') {
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

  // Live notification so the other person doesn't have to refresh
  if (result.autoAccepted) {
    io.to(`user:${receiver.id}`).emit('friend_request:accepted', { userId: senderId });
    io.to(`user:${senderId}`).emit('friend_request:accepted', { userId: receiver.id });
  } else {
    io.to(`user:${receiver.id}`).emit('friend_request:received', { fromUserId: senderId });
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
  const { requestId, action } = req.body ?? {}; // action: 'accept' | 'decline'

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (typeof requestId !== 'string' || !requestId || !['accept', 'decline'].includes(action)) {
    res.status(400).json({ error: 'Invalid requestId or action' });
    return;
  }

  const result = dbService.respondToFriendRequest(requestId, userId, action);
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  // Tell the person who sent the request (their friends list updates live)
  if (action === 'accept' && result.senderId) {
    io.to(`user:${result.senderId}`).emit('friend_request:accepted', { userId });
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
