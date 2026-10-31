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

