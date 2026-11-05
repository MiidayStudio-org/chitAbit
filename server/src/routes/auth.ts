import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { dbService } from '../db/index.js';
import { toUserDTO, toPublicUser } from '../utils/userDto.js';
import { validateUsername, sanitizeText } from '../middleware/sanitize.js';
import { requireAuth, authUserId, signToken } from '../middleware/auth.js';
import { createIpRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Stops password guessing: 20 login/register attempts per IP per 15 minutes
const authLimiter = createIpRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts. Please try again later.',
});

const PASSWORD_MIN = 6;
const PASSWORD_MAX = 72; // bcrypt only uses the first 72 bytes

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const SAFE_TOKEN = /^[\w.+#-]{1,40}$/;
const UPLOAD_URL = /^(\/uploads\/[\w.-]+|https:\/\/[a-zA-Z0-9_\-\.\/]+|data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+)$/;

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

function isValidPassword(password: unknown): password is string {
  return typeof password === 'string' && password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX;
}

// 1. Register with username, password, and optional displayName
router.post('/register', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const { username, password, displayName } = req.body ?? {};

  const validation = validateUsername(username);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error });
    return;
  }

  if (!isValidPassword(password)) {
    res.status(400).json({ error: `Password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters long` });
    return;
  }

  const cleanUsername = username.trim().toLowerCase();
  if (dbService.getUserByUsername(cleanUsername)) {
    res.status(409).json({ error: 'Username is already taken' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const cleanDisplayName =
    typeof displayName === 'string' ? sanitizeText(displayName).slice(0, 50) : '';
  const finalDisplayName = cleanDisplayName || username.trim();

  const user = dbService.createUser(id, cleanUsername, passwordHash, finalDisplayName, getRandomColor(cleanUsername));

  res.status(201).json({
    token: signToken({ userId: user.id, username: user.username }),
    user: toUserDTO(user),
  });
});

// 2. Login with username & password
router.post('/login', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body ?? {};

  if (typeof username !== 'string' || !username.trim()) {
    res.status(400).json({ error: 'Username is required' });
    return;
  }
  if (typeof password !== 'string' || !password) {
    res.status(400).json({ error: 'Password is required' });
    return;
  }

  const user = dbService.getUserByUsername(username.trim());
  if (!user || user.is_bot) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  if (user.password_hash) {
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }
  } else {
    // Old account made before passwords existed: the first login sets its password.
    if (!isValidPassword(password)) {
      res.status(400).json({ error: `Set a password of ${PASSWORD_MIN}-${PASSWORD_MAX} characters for this account` });
      return;
    }
    dbService.setPasswordHash(user.id, await bcrypt.hash(password, 10));
  }

  res.json({
    token: signToken({ userId: user.id, username: user.username }),
    user: toUserDTO(user),
  });
});

// 3. Get currently authenticated user profile
router.get('/me', requireAuth, (req: Request, res: Response): void => {
  const user = dbService.getUserById(authUserId(req));
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user: toUserDTO(user) });
});

// Returns the cleaned value, undefined (= leave unchanged), or throws on invalid input
function textField(value: unknown, name: string, max: number, allowEmpty = true): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error(`${name} must be text`);
  const clean = sanitizeText(value);
  if (!allowEmpty && !clean) throw new Error(`${name} cannot be empty`);
  if (clean.length > max) throw new Error(`${name} must be at most ${max} characters`);
  return clean;
}

function patternField(value: unknown, name: string, pattern: RegExp): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !pattern.test(value.trim())) throw new Error(`Invalid ${name}`);
  return value.trim();
}

// 4. Update own profile
router.put('/profile', requireAuth, (req: Request, res: Response): void => {
  const body = req.body ?? {};

  let updates;
  try {
    updates = {
      displayName: textField(body.displayName, 'Display name', 50, false),
      bio: textField(body.bio, 'Bio', 200),
      status: textField(body.status, 'Status', 50),
      avatarColor: patternField(body.avatarColor, 'avatar color', HEX_COLOR),
      // Avatar must be a file uploaded to this server (blocks javascript: / tracking URLs)
      avatarUrl:
        body.avatarUrl === null || body.avatarUrl === ''
          ? null
          : patternField(body.avatarUrl, 'avatar URL', UPLOAD_URL),
      fileIcon: patternField(body.fileIcon, 'file icon', SAFE_TOKEN),
      messageLanguage: patternField(body.messageLanguage, 'message language', SAFE_TOKEN),
      colorTheme: patternField(body.colorTheme, 'color theme', SAFE_TOKEN),
      customAccentColor:
        body.customAccentColor === null ? null : patternField(body.customAccentColor, 'accent color', HEX_COLOR),
      highlightAllMessages: typeof body.highlightAllMessages === 'boolean' ? body.highlightAllMessages : undefined,
      shareLiveTyping: typeof body.shareLiveTyping === 'boolean' ? body.shareLiveTyping : undefined,
    };
  } catch (err: any) {
    res.status(400).json({ error: err.message });
    return;
  }

  const updated = dbService.updateUserProfile(authUserId(req), updates);
  if (!updated) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user: toUserDTO(updated) });
});

// Public profile of any user (no private settings)
router.get('/me/:id', (req: Request, res: Response): void => {
  const user = dbService.getUserById(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const { id, username, displayName, avatarColor, avatarUrl, bio, status, isBot, createdAt } = toPublicUser(user);
  res.json({ user: { id, username, displayName, avatarColor, avatarUrl, bio, status, isBot, createdAt } });
});

export default router;
