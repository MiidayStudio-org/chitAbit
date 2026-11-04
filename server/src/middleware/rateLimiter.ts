// In-memory sliding window rate limiter
// 10 messages per 10 seconds per user
const WINDOW_MS = 10 * 1000;
const MAX_MESSAGES = 10;

const userMessageTimestamps = new Map<string, number[]>();

export function checkRateLimit(userId: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const timestamps = userMessageTimestamps.get(userId) || [];

  // Filter timestamps within the current window
  const recent = timestamps.filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_MESSAGES) {
    const oldest = recent[0];
    const retryAfterMs = WINDOW_MS - (now - oldest);
    userMessageTimestamps.set(userId, recent);
    return { allowed: false, retryAfterMs };
  }

  recent.push(now);
  userMessageTimestamps.set(userId, recent);
  return { allowed: true };
}

export function resetRateLimit(userId: string) {
  userMessageTimestamps.delete(userId);
  userDraftTimestamps.delete(userId);
  userBotTimestamps.delete(userId);
}

// In-memory rate limiter for draft updates (max 25 per 1 second window)
const DRAFT_WINDOW_MS = 1000;
const MAX_DRAFTS_PER_WINDOW = 25;
const userDraftTimestamps = new Map<string, number[]>();

export function checkDraftRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = userDraftTimestamps.get(userId) || [];
  const recent = timestamps.filter((t) => now - t < DRAFT_WINDOW_MS);
  if (recent.length >= MAX_DRAFTS_PER_WINDOW) {
    userDraftTimestamps.set(userId, recent);
    return false;
  }
  recent.push(now);
  userDraftTimestamps.set(userId, recent);
  return true;
}


// Per-IP limiter for REST routes such as login/register (stops password guessing).
export function createIpRateLimiter(options: { windowMs: number; max: number; message?: string }) {
  const hits = new Map<string, number[]>();
  return (req: { ip?: string; socket?: { remoteAddress?: string } }, res: any, next: () => void) => {
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((t) => now - t < options.windowMs);
    if (recent.length >= options.max) {
      hits.set(key, recent);
      const retryAfterSec = Math.ceil((options.windowMs - (now - recent[0])) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({ error: options.message || `Too many requests. Try again in ${retryAfterSec}s.` });
      return;
    }
    recent.push(now);
    hits.set(key, recent);
    next();
  };
}

// DevBot limit (Gemini calls cost quota). Default: 5 questions per minute per user.
// Change with DEVBOT_MAX_PER_MINUTE in .env.
const BOT_WINDOW_MS = 60 * 1000;
const userBotTimestamps = new Map<string, number[]>();

function getBotLimit(): number {
  const n = Number(process.env.DEVBOT_MAX_PER_MINUTE);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

export function checkBotRateLimit(userId: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const recent = (userBotTimestamps.get(userId) || []).filter((t) => now - t < BOT_WINDOW_MS);
  if (recent.length >= getBotLimit()) {
    userBotTimestamps.set(userId, recent);
    return { allowed: false, retryAfterMs: BOT_WINDOW_MS - (now - recent[0]) };
  }
  recent.push(now);
  userBotTimestamps.set(userId, recent);
  return { allowed: true };
}
