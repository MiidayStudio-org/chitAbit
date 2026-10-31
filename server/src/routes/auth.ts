import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbService } from '../db/index.js';
import { validateUsername } from '../middleware/sanitize.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'chitabit_secret_jwt_key_2026';

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

// 1. Register with username, password, and optional displayName
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { username, password, displayName } = req.body;

  const validation = validateUsername(username);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error });
    return;
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters long' });
    return;
  }

  const cleanUsername = username.trim().toLowerCase();
  const existing = dbService.getUserByUsername(cleanUsername);
  if (existing) {
    res.status(409).json({ error: 'Username is already taken' });
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const finalDisplayName = (displayName && displayName.trim()) || username.trim();
  const avatarColor = getRandomColor(cleanUsername);

  const user = dbService.createUser(id, cleanUsername, passwordHash, finalDisplayName, avatarColor);

  const token = jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.status(201).json({
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatarColor: user.avatar_color,
      avatarUrl: user.avatar_url || null,
      fileIcon: user.file_icon || 'ts',
      messageLanguage: user.message_language || 'typescript',
      colorTheme: user.color_theme || 'dark-plus',
      customAccentColor: user.custom_accent_color || null,
      highlightAllMessages: Boolean(user.highlight_all_messages ?? 1),
      shareLiveTyping: Boolean(user.share_live_typing ?? 1),
      bio: user.bio || 'Hey there! I am using chitAbit.',
      status: user.status || 'Online',
      isBot: Boolean(user.is_bot),
      createdAt: user.created_at,
    },
  });
});

// 2. Login with username & password (supports seamless backwards compatibility)
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;

  if (!username) {
    res.status(400).json({ error: 'Username is required' });
    return;
  }

  const cleanUsername = String(username).trim();
  let user = dbService.getUserByUsername(cleanUsername);

  if (!user) {
    if (password) {
      res.status(401).json({ error: 'User does not exist. Please register first.' });
      return;
    }
    const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const avatarColor = getRandomColor(cleanUsername);
    user = dbService.createUser(id, cleanUsername, null, username.trim(), avatarColor);
  }

  // If user has a password set, verify it
  if (user.password_hash) {
    if (!password) {
      res.status(400).json({ error: 'Password is required' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatarColor: user.avatar_color,
      avatarUrl: user.avatar_url || null,
      fileIcon: user.file_icon || 'ts',
      messageLanguage: user.message_language || 'typescript',
      colorTheme: user.color_theme || 'dark-plus',
      customAccentColor: user.custom_accent_color || null,
      highlightAllMessages: Boolean(user.highlight_all_messages ?? 1),
      shareLiveTyping: Boolean(user.share_live_typing ?? 1),
      bio: user.bio || 'Hey there! I am using chitAbit.',
      status: user.status || 'Online',
      isBot: Boolean(user.is_bot),
      createdAt: user.created_at,
    },
  });
});

// 3. Get currently authenticated user profile
router.get('/me', (req: Request, res: Response): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
    const user = dbService.getUserById(decoded.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarColor: user.avatar_color,
        avatarUrl: user.avatar_url || null,
        fileIcon: user.file_icon || 'ts',
        messageLanguage: user.message_language || 'typescript',
        colorTheme: user.color_theme || 'dark-plus',
        customAccentColor: user.custom_accent_color || null,
        highlightAllMessages: Boolean(user.highlight_all_messages ?? 1),
        shareLiveTyping: Boolean(user.share_live_typing ?? 1),
        bio: user.bio || 'Hey there! I am using chitAbit.',
        status: user.status || 'Online',
        isBot: Boolean(user.is_bot),
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// 4. Update profile (display name, bio, status, avatar color, avatar url, file icon, messageLanguage, colorTheme, customAccentColor, highlightAllMessages, shareLiveTyping)
router.put('/profile', (req: Request, res: Response): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
    const {
      displayName,
      bio,
      status,
      avatarColor,
      avatarUrl,
      fileIcon,
      messageLanguage,
      colorTheme,
      customAccentColor,
      highlightAllMessages,
      shareLiveTyping,
    } = req.body;

    const updated = dbService.updateUserProfile(decoded.userId, {
      displayName: displayName?.trim(),
      bio: bio?.trim(),
      status: status?.trim(),
      avatarColor: avatarColor?.trim(),
      avatarUrl,
      fileIcon: fileIcon?.trim(),
      messageLanguage: messageLanguage?.trim(),
      colorTheme: colorTheme?.trim(),
      customAccentColor: customAccentColor === null ? null : customAccentColor?.trim(),
      highlightAllMessages: typeof highlightAllMessages === 'boolean' ? highlightAllMessages : undefined,
      shareLiveTyping: typeof shareLiveTyping === 'boolean' ? shareLiveTyping : undefined,
    });

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
        avatarUrl: updated.avatar_url || null,
        fileIcon: updated.file_icon || 'ts',
        messageLanguage: updated.message_language || 'typescript',
        colorTheme: updated.color_theme || 'dark-plus',
        customAccentColor: updated.custom_accent_color || null,
        highlightAllMessages: Boolean(updated.highlight_all_messages ?? 1),
        shareLiveTyping: Boolean(updated.share_live_typing ?? 1),
        bio: updated.bio || 'Hey there! I am using chitAbit.',
        status: updated.status || 'Online',
        isBot: Boolean(updated.is_bot),
        createdAt: updated.created_at,
      },
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Backward compatibility for /me/:id
router.get('/me/:id', (req: Request, res: Response): void => {
  const user = dbService.getUserById(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatarColor: user.avatar_color,
      avatarUrl: user.avatar_url || null,
      bio: user.bio || 'Hey there! I am using chitAbit.',
      status: user.status || 'Online',
      isBot: Boolean(user.is_bot),
      createdAt: user.created_at,
    },
  });
});

export default router;
