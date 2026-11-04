import { Message, Channel, ActiveChat } from '../types';

/**
 * Derives a 2-letter fallback uppercase initial string from a display name or username.
 * e.g. "Alice Lovelace" -> "AL", "alice_dev" -> "AL", "bob" -> "BO"
 */
export function getInitials(displayName?: string, username?: string): string {
  const source = (displayName || username || '').trim();
  if (!source) return '??';

  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  const clean = source.replace(/[^a-zA-Z0-9]/g, '');
  if (clean.length >= 2) {
    return clean.slice(0, 2).toUpperCase();
  }
  return source.slice(0, 1).toUpperCase();
}

/**
 * Derives user role badge: "Core", "Bot", or "Member".
 */
export function getRoleBadge(message: Message, channel?: Channel | null): 'Core' | 'Bot' | 'Member' {
  if (message.sender_is_bot || message.sender_id === 'devbot') {
    return 'Bot';
  }
  if (message.sender_role) {
    return message.sender_role;
  }
  if (
    message.sender_username.toLowerCase() === 'admin' ||
    message.sender_username.toLowerCase() === 'system' ||
    (channel && channel.created_by === message.sender_id)
  ) {
    return 'Core';
  }
  return 'Member';
}

/**
 * Formats timestamp to 12-hour relative time, e.g. "10:42 AM".
 */
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats conversation row timestamp (Telegram/WhatsApp style):
 * - If today: "10:42 AM"
 * - If yesterday: "Yesterday"
 * - If this week: "Wednesday"
 * - Older: "10/28/26"
 */
export function formatConversationTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return formatTime(timestamp);
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return 'Yesterday';
  }

  const dayDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (dayDiff < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }

  return date.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' });
}

/**
 * Generates centered date pill divider labels (e.g. "Today", "Yesterday", "October 30, 2026").
 */
export function getDateDividerLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Checks if consecutive messages from the same user were sent within 5 minutes.
 */
export function shouldGroupMessage(curr: Message, prev: Message | null): boolean {
  if (!prev) return false;
  if (prev.sender_id !== curr.sender_id) return false;
  // If either message is deleted, don't group
  if (curr.deleted_at || prev.deleted_at) return false;
  const fiveMinutesInMs = 5 * 60 * 1000;
  return Math.abs(curr.created_at - prev.created_at) <= fiveMinutesInMs;
}

/**
 * Turns a channel from the server into the ActiveChat shape used by tabs,
 * the sidebar and the command palette.
 */
export function channelToChat(channel: Channel): ActiveChat {
  return {
    type: 'channel',
    id: channel.id,
    name: channel.name,
    displayName: channel.name,
    fileIcon: 'folder',
    description: channel.description || undefined,
  };
}
