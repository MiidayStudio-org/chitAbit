import '../config/env.js'; // load .env before reading DB_PATH
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Where the database lives:
// - tests (NODE_ENV=test): always in memory, so `npm test` never touches real chat history
// - DB_PATH in .env if set
// - otherwise: ./data/chat.db at the project root
function resolveDbPath(): string {
  if (process.env.NODE_ENV === 'test') return ':memory:';
  const fromEnv = process.env.DB_PATH?.trim();
  if (fromEnv) return fromEnv;

  const dataDir = path.join(path.resolve(__dirname, '../../../'), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'chat.db');
}

export const db = new Database(resolveDbPath());

// Enable WAL mode for high concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Read and execute schema
const schemaPath = path.join(__dirname, 'schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');
db.exec(schemaSql);

// Safe column migrations for existing databases
const safeAddColumn = (table: string, columnDef: string) => {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDef};`);
  } catch {
    // Column already exists or table issue
  }
};

safeAddColumn('users', 'password_hash TEXT');
safeAddColumn('users', 'avatar_url TEXT');
safeAddColumn('users', "bio TEXT DEFAULT 'Hey there! I am using ChatAbit.'");
safeAddColumn('users', "status TEXT DEFAULT 'Online'");
safeAddColumn('users', "file_icon TEXT DEFAULT 'ts'");
safeAddColumn('users', "message_language TEXT DEFAULT 'typescript'");
safeAddColumn('users', "color_theme TEXT DEFAULT 'dark-plus'");
safeAddColumn('users', 'custom_accent_color TEXT DEFAULT NULL');
safeAddColumn('users', 'highlight_all_messages INTEGER DEFAULT 1');
safeAddColumn('users', 'share_live_typing INTEGER DEFAULT 1');
safeAddColumn('messages', 'message_language TEXT DEFAULT NULL');
safeAddColumn('messages', 'attachment_url TEXT');
safeAddColumn('messages', 'attachment_type TEXT');
safeAddColumn('messages', 'attachment_name TEXT');
safeAddColumn('messages', 'attachment_size INTEGER');
safeAddColumn('messages', 'read_at INTEGER');

// Seed the default channels (team spec). Users can create more.
const now = Date.now();
export const DEFAULT_CHANNELS: { id: string; description: string }[] = [
  { id: 'general', description: 'General discussion for all ChatAbit members' },
  { id: 'javascript', description: 'JavaScript, TypeScript, Node.js and the web' },
  { id: 'python', description: 'Python, scripting and data tooling' },
  { id: 'devops', description: 'CI/CD, Docker, cloud and infrastructure' },
  { id: 'ai-ml', description: 'AI, machine learning and LLMs' },
  { id: 'help', description: 'Stuck on something? Ask here' },
];
const insertChannel = db.prepare(`
  INSERT OR IGNORE INTO channels (id, name, description, created_by, created_at)
  VALUES (@id, @id, @description, 'system', @createdAt)
`);
db.transaction(() => {
  // created_at + index keeps the default order stable in listings
  DEFAULT_CHANNELS.forEach((ch, i) => insertChannel.run({ ...ch, createdAt: now + i }));
})();

// Seed DevBot User (the SINGLE chatbot)
const insertDevBot = db.prepare(`
  INSERT OR IGNORE INTO users (id, username, password_hash, display_name, avatar_color, bio, status, is_bot, created_at)
  VALUES ('devbot', 'devbot', NULL, 'DevBot (AI Assistant)', '#06C755', 'Senior AI Pair Programmer & Debugger 🤖', 'Online', 1, @createdAt)
`);
insertDevBot.run({ createdAt: now });

// Update DevBot color to LINE green if it had another color
db.prepare(`UPDATE users SET avatar_color = '#06C755', bio = 'Senior AI Pair Programmer & Debugger 🤖', status = 'Online' WHERE id = 'devbot';`).run();

// "contains" pattern for LIKE ... ESCAPE '!'. Escapes % and _ so a search for
// "50%" or "my_var" matches that literal text instead of acting as a wildcard.
function likeContains(query: string): string {
  const escaped = query.trim().toLowerCase().replace(/[!%_]/g, (c) => `!${c}`);
  return `%${escaped}%`;
}

// DB Data Interfaces
export interface UserRow {
  id: string;
  username: string;
  password_hash?: string | null;
  display_name: string;
  avatar_color: string;
  avatar_url?: string | null;
  file_icon?: string | null;
  message_language?: string | null;
  color_theme?: string | null;
  custom_accent_color?: string | null;
  highlight_all_messages?: number | null;
  share_live_typing?: number | null;
  bio?: string | null;
  status?: string | null;
  is_bot: number;
  created_at: number;
}

export interface ChannelRow {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: number;
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  users: string[];
}

export interface MessageWithReactions {
  id: string;
  channel_id: string | null;
  dm_recipient_id: string | null;
  sender_id: string;
  sender_username: string;
  sender_display_name?: string;
  sender_avatar_color?: string;
  sender_avatar_url?: string | null;
  sender_file_icon?: string | null;
  sender_message_language?: string | null;
  message_language?: string | null;
  sender_is_bot?: boolean;
  content: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  attachment_size?: number | null;
  read_at?: number | null;
  edited_at: number | null;
  deleted_at: number | null;
  created_at: number;
  reactions: ReactionGroup[];
}

export interface FriendRequestRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: number;
  sender_username?: string;
  sender_display_name?: string;
  sender_avatar_color?: string;
  receiver_username?: string;
  receiver_display_name?: string;
  receiver_avatar_color?: string;
}

export const dbService = {
  // Users
  getUserById(id: string): UserRow | undefined {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  },

  getUserByUsername(username: string): UserRow | undefined {
    return db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username) as UserRow | undefined;
  },

  createUser(
    id: string,
    username: string,
    passwordHash: string | null = null,
    displayName: string = username,
    avatarColor: string = '#06C755',
    avatarUrl: string | null = null,
    bio: string = 'Hey there! I am using ChatAbit.'
  ): UserRow {
    const createdAt = Date.now();
    db.prepare(`
      INSERT INTO users (id, username, password_hash, display_name, avatar_color, avatar_url, bio, status, is_bot, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Online', 0, ?)
    `).run(id, username.toLowerCase(), passwordHash, displayName, avatarColor, avatarUrl, bio, createdAt);
    return {
      id,
      username: username.toLowerCase(),
      password_hash: passwordHash,
      display_name: displayName,
      avatar_color: avatarColor,
      avatar_url: avatarUrl,
      bio,
      status: 'Online',
      is_bot: 0,
      created_at: createdAt,
    };
  },

  setPasswordHash(id: string, passwordHash: string): void {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id);
  },

  updateUserStatus(id: string, status?: string, bio?: string): UserRow | undefined {
    return this.updateUserProfile(id, { status, bio });
  },

  updateUserProfile(
    id: string,
    updates: {
      displayName?: string;
      avatarColor?: string;
      avatarUrl?: string | null;
      fileIcon?: string;
      messageLanguage?: string;
      colorTheme?: string;
      customAccentColor?: string | null;
      highlightAllMessages?: boolean;
      shareLiveTyping?: boolean;
      bio?: string;
      status?: string;
    }
  ): UserRow | undefined {
    const user = this.getUserById(id);
    if (!user) return undefined;

    const newDisplayName = updates.displayName !== undefined ? updates.displayName : user.display_name;
    const newAvatarColor = updates.avatarColor !== undefined ? updates.avatarColor : user.avatar_color;
    const newAvatarUrl = updates.avatarUrl !== undefined ? updates.avatarUrl : user.avatar_url;
    const newFileIcon = updates.fileIcon !== undefined ? updates.fileIcon : (user.file_icon || 'ts');
    const newMessageLanguage = updates.messageLanguage !== undefined ? updates.messageLanguage : (user.message_language || 'typescript');
    const newColorTheme = updates.colorTheme !== undefined ? updates.colorTheme : (user.color_theme || 'dark-plus');
    const newCustomAccentColor = updates.customAccentColor !== undefined ? updates.customAccentColor : user.custom_accent_color;
    const newHighlightAllMessages = updates.highlightAllMessages !== undefined ? (updates.highlightAllMessages ? 1 : 0) : (user.highlight_all_messages ?? 1);
    const newShareLiveTyping = updates.shareLiveTyping !== undefined ? (updates.shareLiveTyping ? 1 : 0) : (user.share_live_typing ?? 1);
    const newBio = updates.bio !== undefined ? updates.bio : user.bio;
    const newStatus = updates.status !== undefined ? updates.status : user.status;

    db.prepare(`
      UPDATE users
      SET display_name = ?, avatar_color = ?, avatar_url = ?, file_icon = ?, message_language = ?, color_theme = ?, custom_accent_color = ?, highlight_all_messages = ?, share_live_typing = ?, bio = ?, status = ?
      WHERE id = ?
    `).run(newDisplayName, newAvatarColor, newAvatarUrl, newFileIcon, newMessageLanguage, newColorTheme, newCustomAccentColor, newHighlightAllMessages, newShareLiveTyping, newBio, newStatus, id);

    return this.getUserById(id);
  },

  searchUsers(query: string, excludeUserId?: string): UserRow[] {
    const cleanQ = likeContains(query);
    return db.prepare(`
      SELECT id, username, display_name, avatar_color, avatar_url, file_icon, message_language, color_theme, custom_accent_color, highlight_all_messages, share_live_typing, bio, status, is_bot, created_at
      FROM users
      WHERE is_bot = 0
        AND id != ?
        AND (username LIKE ? ESCAPE '!' OR display_name LIKE ? ESCAPE '!')
      ORDER BY username ASC
      LIMIT 20
    `).all(excludeUserId || '', cleanQ, cleanQ) as UserRow[];
  },

  getAllUsers(excludeBot = false): UserRow[] {
    if (excludeBot) {
      return db.prepare('SELECT id, username, display_name, avatar_color, avatar_url, file_icon, message_language, color_theme, custom_accent_color, highlight_all_messages, share_live_typing, bio, status, is_bot, created_at FROM users WHERE is_bot = 0 ORDER BY username ASC').all() as UserRow[];
    }
    return db.prepare('SELECT id, username, display_name, avatar_color, avatar_url, file_icon, message_language, color_theme, custom_accent_color, highlight_all_messages, share_live_typing, bio, status, is_bot, created_at FROM users ORDER BY is_bot DESC, username ASC').all() as UserRow[];
  },

  // Friends System
  getFriends(userId: string): UserRow[] {
    return db.prepare(`
      SELECT u.id, u.username, u.display_name, u.avatar_color, u.avatar_url, u.file_icon, u.message_language, u.color_theme, u.custom_accent_color, u.highlight_all_messages, u.share_live_typing, u.bio, u.status, u.is_bot, u.created_at
      FROM friends f
      JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = ?
      ORDER BY u.display_name ASC
    `).all(userId) as UserRow[];
  },

  isFriend(userId1: string, userId2: string): boolean {
    const row = db.prepare('SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ?').get(userId1, userId2);
    return Boolean(row);
  },

  addFriend(userId1: string, userId2: string): void {
    const now = Date.now();
    const insert = db.prepare('INSERT OR IGNORE INTO friends (user_id, friend_id, created_at) VALUES (?, ?, ?)');
    insert.run(userId1, userId2, now);
    insert.run(userId2, userId1, now);
  },

  removeFriend(userId1: string, userId2: string): void {
    db.prepare('DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)').run(
      userId1,
      userId2,
      userId2,
      userId1
    );
  },

  // Friend Requests
  getFriendRequests(userId: string): { incoming: FriendRequestRow[]; outgoing: FriendRequestRow[] } {
    const incoming = db.prepare(`
      SELECT fr.*, u.username as sender_username, u.display_name as sender_display_name, u.avatar_color as sender_avatar_color
      FROM friend_requests fr
      JOIN users u ON fr.sender_id = u.id
      WHERE fr.receiver_id = ? AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `).all(userId) as FriendRequestRow[];

    const outgoing = db.prepare(`
      SELECT fr.*, u.username as receiver_username, u.display_name as receiver_display_name, u.avatar_color as receiver_avatar_color
      FROM friend_requests fr
      JOIN users u ON fr.receiver_id = u.id
      WHERE fr.sender_id = ? AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `).all(userId) as FriendRequestRow[];

    return { incoming, outgoing };
  },

  createFriendRequest(senderId: string, receiverId: string): { success: boolean; error?: string; autoAccepted?: boolean } {
    if (senderId === receiverId) {
      return { success: false, error: 'Cannot send friend request to yourself' };
    }

    if (this.isFriend(senderId, receiverId)) {
      return { success: false, error: 'You are already friends' };
    }

    // Note: SQL string literals must use single quotes. better-sqlite3 treats
    // "pending" as a column name and throws.

    // The other person already sent me a request: accept it automatically
    const reverse = db.prepare(
      "SELECT * FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'"
    ).get(receiverId, senderId) as FriendRequestRow | undefined;

    if (reverse) {
      db.transaction(() => {
        this.addFriend(senderId, receiverId);
        db.prepare("UPDATE friend_requests SET status = 'accepted' WHERE id = ?").run(reverse.id);
      })();
      return { success: true, autoAccepted: true };
    }

    // There is one row per (sender, receiver) because of the UNIQUE constraint.
    // An old declined/accepted request (e.g. after unfriending) is reopened instead of blocking forever.
    const existing = db.prepare(
      'SELECT * FROM friend_requests WHERE sender_id = ? AND receiver_id = ?'
    ).get(senderId, receiverId) as FriendRequestRow | undefined;

    const now = Date.now();

    if (existing) {
      if (existing.status === 'pending') {
        return { success: false, error: 'A pending friend request already exists' };
      }
      db.prepare("UPDATE friend_requests SET status = 'pending', created_at = ? WHERE id = ?").run(now, existing.id);
      return { success: true };
    }

    const id = `freq_${now}_${Math.random().toString(36).slice(2, 7)}`;
    db.prepare(
      "INSERT INTO friend_requests (id, sender_id, receiver_id, status, created_at) VALUES (?, ?, ?, 'pending', ?)"
    ).run(id, senderId, receiverId, now);
    return { success: true };
  },

  respondToFriendRequest(
    requestId: string,
    receiverId: string,
    action: 'accept' | 'decline'
  ): { success: boolean; error?: string; senderId?: string } {
    const req = db.prepare(
      "SELECT * FROM friend_requests WHERE id = ? AND receiver_id = ? AND status = 'pending'"
    ).get(requestId, receiverId) as FriendRequestRow | undefined;
    if (!req) {
      return { success: false, error: 'Request not found' };
    }

    if (action === 'accept') {
      db.transaction(() => {
        this.addFriend(req.sender_id, req.receiver_id);
        db.prepare("UPDATE friend_requests SET status = 'accepted' WHERE id = ?").run(requestId);
      })();
    } else {
      db.prepare("UPDATE friend_requests SET status = 'declined' WHERE id = ?").run(requestId);
    }

    return { success: true, senderId: req.sender_id };
  },

  // Channels
  getGeneralChannel(): ChannelRow {
    let ch = db.prepare("SELECT * FROM channels WHERE id = 'general'").get() as ChannelRow | undefined;
    if (!ch) {
      ch = {
        id: 'general',
        name: 'general',
        description: 'General discussion for all ChatAbit members',
        created_by: 'system',
        created_at: Date.now(),
      };
      db.prepare('INSERT INTO channels (id, name, description, created_by, created_at) VALUES (?, ?, ?, ?, ?)').run(
        ch.id,
        ch.name,
        ch.description,
        ch.created_by,
        ch.created_at
      );
    }
    return ch;
  },

  // Default (system) channels first in their seeded order, then custom channels oldest first
  getChannels(): ChannelRow[] {
    this.getGeneralChannel(); // make sure #general always exists
    return db.prepare(`
      SELECT * FROM channels
      ORDER BY (created_by = 'system') DESC, created_at ASC
    `).all() as ChannelRow[];
  },

  getChannelById(id: string): ChannelRow | undefined {
    if (id === 'general') return this.getGeneralChannel();
    return db.prepare('SELECT * FROM channels WHERE id = ?').get(id) as ChannelRow | undefined;
  },

  getChannelByName(name: string): ChannelRow | undefined {
    if (name.toLowerCase() === 'general') return this.getGeneralChannel();
    return db.prepare('SELECT * FROM channels WHERE name = ? COLLATE NOCASE').get(name) as ChannelRow | undefined;
  },

  // Unread tracking
  // Channels: messages newer than the user's last read time (default: when the user joined).
  // DMs: messages sent to the user that have no read_at yet.
  markChannelRead(userId: string, channelId: string, at = Date.now()): void {
    db.prepare(`
      INSERT INTO channel_reads (user_id, channel_id, last_read_at) VALUES (?, ?, ?)
      ON CONFLICT(user_id, channel_id) DO UPDATE SET last_read_at = MAX(last_read_at, excluded.last_read_at)
    `).run(userId, channelId, at);
  },

  // Keys match the client's unreadCounts map: channel id for channels, sender id for DMs.
  getUnreadCounts(userId: string): Record<string, number> {
    const counts: Record<string, number> = {};

    const channelRows = db.prepare(`
      SELECT m.channel_id AS chat_id, COUNT(*) AS count
      FROM messages m
      JOIN users me ON me.id = ?
      LEFT JOIN channel_reads cr ON cr.user_id = me.id AND cr.channel_id = m.channel_id
      WHERE m.channel_id IS NOT NULL
        AND m.deleted_at IS NULL
        AND m.sender_id != me.id
        AND m.created_at > COALESCE(cr.last_read_at, me.created_at)
      GROUP BY m.channel_id
    `).all(userId) as { chat_id: string; count: number }[];

    const dmRows = db.prepare(`
      SELECT sender_id AS chat_id, COUNT(*) AS count
      FROM messages
      WHERE channel_id IS NULL
        AND dm_recipient_id = ?
        AND sender_id != ?
        AND read_at IS NULL
        AND deleted_at IS NULL
      GROUP BY sender_id
    `).all(userId, userId) as { chat_id: string; count: number }[];

    for (const row of [...channelRows, ...dmRows]) {
      counts[row.chat_id] = row.count;
    }
    return counts;
  },

  createChannel(id: string, name: string, description: string | null, createdBy: string): ChannelRow {
    const createdAt = Date.now();
    db.prepare('INSERT OR IGNORE INTO channels (id, name, description, created_by, created_at) VALUES (?, ?, ?, ?, ?)').run(
      id,
      name.toLowerCase(),
      description,
      createdBy,
      createdAt
    );
    return { id, name: name.toLowerCase(), description, created_by: createdBy, created_at: createdAt };
  },

  // Reactions helper
  getReactionsForMessages(messageIds: string[]): Map<string, ReactionGroup[]> {
    const map = new Map<string, ReactionGroup[]>();
    if (messageIds.length === 0) return map;

    const placeholders = messageIds.map(() => '?').join(',');
    const rows = db.prepare(`
      SELECT message_id, emoji, user_id
      FROM reactions
      WHERE message_id IN (${placeholders})
      ORDER BY created_at ASC
    `).all(...messageIds) as { message_id: string; emoji: string; user_id: string }[];

    for (const r of rows) {
      if (!map.has(r.message_id)) {
        map.set(r.message_id, []);
      }
      const groups = map.get(r.message_id)!;
      let group = groups.find((g) => g.emoji === r.emoji);
      if (!group) {
        group = { emoji: r.emoji, count: 0, users: [] };
        groups.push(group);
      }
      group.count++;
      if (!group.users.includes(r.user_id)) {
        group.users.push(r.user_id);
      }
    }
    return map;
  },

  // Messages
  // Messages
  getChannelMessages(channelId: string, limit = 40, beforeTimestamp?: number): MessageWithReactions[] {
    let query = `
      SELECT m.*, u.display_name as sender_display_name, u.avatar_color as sender_avatar_color, u.avatar_url as sender_avatar_url, u.file_icon as sender_file_icon, u.message_language as sender_message_language, u.is_bot as sender_is_bot
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.channel_id = ? AND m.deleted_at IS NULL
    `;
    const params: any[] = [channelId];

    if (beforeTimestamp) {
      query += ` AND m.created_at < ?`;
      params.push(beforeTimestamp);
    }

    query += ` ORDER BY m.created_at DESC LIMIT ?`;
    params.push(limit);

    const rows = db.prepare(query).all(...params) as any[];
    const messages = rows.reverse();
    const reactionsMap = this.getReactionsForMessages(messages.map((m) => m.id));

    return messages.map((m) => ({
      ...m,
      sender_is_bot: Boolean(m.sender_is_bot),
      sender_file_icon: m.sender_file_icon || 'ts',
      sender_message_language: m.sender_message_language || 'typescript',
      message_language: m.message_language || m.sender_message_language || 'typescript',
      reactions: reactionsMap.get(m.id) || [],
    }));
  },

  getDMMessages(user1Id: string, user2Id: string, limit = 40, beforeTimestamp?: number): MessageWithReactions[] {
    let query = `
      SELECT m.*, u.display_name as sender_display_name, u.avatar_color as sender_avatar_color, u.avatar_url as sender_avatar_url, u.file_icon as sender_file_icon, u.message_language as sender_message_language, u.is_bot as sender_is_bot
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.channel_id IS NULL AND m.deleted_at IS NULL AND (
        (m.sender_id = ? AND m.dm_recipient_id = ?) OR
        (m.sender_id = ? AND m.dm_recipient_id = ?)
      )
    `;
    const params: any[] = [user1Id, user2Id, user2Id, user1Id];

    if (beforeTimestamp) {
      query += ` AND m.created_at < ?`;
      params.push(beforeTimestamp);
    }

    query += ` ORDER BY m.created_at DESC LIMIT ?`;
    params.push(limit);

    const rows = db.prepare(query).all(...params) as any[];
    const messages = rows.reverse();
    const reactionsMap = this.getReactionsForMessages(messages.map((m) => m.id));

    return messages.map((m) => ({
      ...m,
      sender_is_bot: Boolean(m.sender_is_bot),
      sender_file_icon: m.sender_file_icon || 'ts',
      sender_message_language: m.sender_message_language || 'typescript',
      message_language: m.message_language || m.sender_message_language || 'typescript',
      reactions: reactionsMap.get(m.id) || [],
    }));
  },

  createMessage(
    paramsOrId:
      | string
      | {
          id: string;
          channelId: string | null;
          dmRecipientId: string | null;
          senderId: string;
          senderUsername: string;
          messageLanguage?: string | null;
          content: string;
          attachmentUrl?: string | null;
          attachmentType?: string | null;
          attachmentName?: string | null;
          attachmentSize?: number | null;
        },
    channelId?: string | null,
    dmRecipientId?: string | null,
    senderId?: string,
    senderUsername?: string,
    content?: string,
    attachmentUrl?: string | null,
    attachmentType?: string | null,
    attachmentName?: string | null,
    attachmentSize?: number | null,
    messageLanguage?: string | null
  ): MessageWithReactions {
    let params: {
      id: string;
      channelId: string | null;
      dmRecipientId: string | null;
      senderId: string;
      senderUsername: string;
      messageLanguage?: string | null;
      content: string;
      attachmentUrl?: string | null;
      attachmentType?: string | null;
      attachmentName?: string | null;
      attachmentSize?: number | null;
    };

    if (typeof paramsOrId === 'string') {
      params = {
        id: paramsOrId,
        channelId: channelId || null,
        dmRecipientId: dmRecipientId || null,
        senderId: senderId!,
        senderUsername: senderUsername!,
        messageLanguage: messageLanguage || null,
        content: content || '',
        attachmentUrl: attachmentUrl || null,
        attachmentType: attachmentType || null,
        attachmentName: attachmentName || null,
        attachmentSize: attachmentSize || null,
      };
    } else {
      params = paramsOrId;
    }

    const user = this.getUserById(params.senderId);
    const resolvedLanguage = params.messageLanguage || user?.message_language || 'typescript';
    const createdAt = Date.now();

    db.prepare(`
      INSERT INTO messages (id, channel_id, dm_recipient_id, sender_id, sender_username, message_language, content, attachment_url, attachment_type, attachment_name, attachment_size, read_at, created_at)
      VALUES (@id, @channelId, @dmRecipientId, @senderId, @senderUsername, @messageLanguage, @content, @attachmentUrl, @attachmentType, @attachmentName, @attachmentSize, NULL, @createdAt)
    `).run({
      id: params.id,
      channelId: params.channelId,
      dmRecipientId: params.dmRecipientId,
      senderId: params.senderId,
      senderUsername: params.senderUsername,
      messageLanguage: resolvedLanguage,
      content: params.content,
      attachmentUrl: params.attachmentUrl || null,
      attachmentType: params.attachmentType || null,
      attachmentName: params.attachmentName || null,
      attachmentSize: params.attachmentSize || null,
      createdAt,
    });

    return {
      id: params.id,
      channel_id: params.channelId,
      dm_recipient_id: params.dmRecipientId,
      sender_id: params.senderId,
      sender_username: params.senderUsername,
      sender_display_name: user?.display_name || params.senderUsername,
      sender_avatar_color: user?.avatar_color || '#06C755',
      sender_avatar_url: user?.avatar_url || null,
      sender_file_icon: user?.file_icon || 'ts',
      sender_message_language: user?.message_language || 'typescript',
      message_language: resolvedLanguage,
      sender_is_bot: Boolean(user?.is_bot),
      content: params.content,
      attachment_url: params.attachmentUrl || null,
      attachment_type: params.attachmentType || null,
      attachment_name: params.attachmentName || null,
      attachment_size: params.attachmentSize || null,
      read_at: null,
      edited_at: null,
      deleted_at: null,
      created_at: createdAt,
      reactions: [],
    };
  },

  markDMMessagesAsRead(senderId: string, recipientId: string): number {
    const now = Date.now();
    const result = db.prepare(`
      UPDATE messages
      SET read_at = ?
      WHERE sender_id = ? AND dm_recipient_id = ? AND read_at IS NULL
    `).run(now, senderId, recipientId);
    return result.changes;
  },

  getMessageById(id: string): MessageWithReactions | undefined {
    const row = db.prepare(`
      SELECT m.*, u.display_name as sender_display_name, u.avatar_color as sender_avatar_color, u.avatar_url as sender_avatar_url, u.is_bot as sender_is_bot
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ? AND m.deleted_at IS NULL
    `).get(id) as any;

    if (!row) return undefined;
    const reactionsMap = this.getReactionsForMessages([row.id]);
    return {
      ...row,
      sender_is_bot: Boolean(row.sender_is_bot),
      reactions: reactionsMap.get(row.id) || [],
    };
  },

  updateMessage(id: string, senderId: string, content: string): MessageWithReactions | undefined {
    const msg = this.getMessageById(id);
    if (!msg || msg.sender_id !== senderId) return undefined;

    const editedAt = Date.now();
    db.prepare('UPDATE messages SET content = ?, edited_at = ? WHERE id = ?').run(content, editedAt, id);
    return this.getMessageById(id);
  },

  deleteMessage(id: string, senderId: string): boolean {
    const msg = this.getMessageById(id);
    if (!msg || msg.sender_id !== senderId) return false;

    // Soft delete: keep the row (with deleted_at) but wipe what it said.
    // All read queries skip rows where deleted_at is set.
    db.transaction(() => {
      db.prepare(`
        UPDATE messages
        SET deleted_at = ?, content = '', attachment_url = NULL, attachment_type = NULL,
            attachment_name = NULL, attachment_size = NULL
        WHERE id = ?
      `).run(Date.now(), id);
      db.prepare('DELETE FROM reactions WHERE message_id = ?').run(id);
    })();
    return true;
  },

  toggleReaction(messageId: string, userId: string, emoji: string): ReactionGroup[] {
    const existing = db.prepare('SELECT id FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?').get(messageId, userId, emoji);

    if (existing) {
      db.prepare('DELETE FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?').run(messageId, userId, emoji);
    } else {
      const id = `react_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      db.prepare('INSERT INTO reactions (id, message_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?, ?)').run(
        id,
        messageId,
        userId,
        emoji,
        Date.now()
      );
    }

    const map = this.getReactionsForMessages([messageId]);
    return map.get(messageId) || [];
  },

  // viewerId: only messages this user may see (any channel, or DMs they are part of)
  // Supports filter prefixes: from:@user, in:#channel, has:file, and keyword matching
  searchMessages(query: string, viewerId: string, channelId?: string, user1Id?: string, user2Id?: string): MessageWithReactions[] {
    let rawQuery = query.trim();
    let fromUser: string | undefined;
    let inChannel: string | undefined;
    let hasFile = false;

    // Parse from:@user or from:user
    const fromMatch = rawQuery.match(/\bfrom:@?([a-zA-Z0-9_\-\.]+)\b/i);
    if (fromMatch) {
      fromUser = fromMatch[1];
      rawQuery = rawQuery.replace(fromMatch[0], '').trim();
    }

    // Parse in:#channel or in:channel
    const inMatch = rawQuery.match(/\bin:#?([a-zA-Z0-9_\-]+)\b/i);
    if (inMatch) {
      inChannel = inMatch[1].toLowerCase();
      rawQuery = rawQuery.replace(inMatch[0], '').trim();
    }

    // Parse has:file
    if (/\bhas:file\b/i.test(rawQuery)) {
      hasFile = true;
      rawQuery = rawQuery.replace(/\bhas:file\b/gi, '').trim();
    }

    let sql = `
      SELECT m.*, u.display_name as sender_display_name, u.avatar_color as sender_avatar_color, u.avatar_url as sender_avatar_url, u.file_icon as sender_file_icon, u.message_language as sender_message_language, u.is_bot as sender_is_bot
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.deleted_at IS NULL
    `;
    const params: any[] = [];

    if (rawQuery) {
      sql += ` AND m.content LIKE ? ESCAPE '!'`;
      params.push(likeContains(rawQuery));
    }

    if (fromUser) {
      sql += ` AND (u.username = ? COLLATE NOCASE OR u.display_name = ? COLLATE NOCASE)`;
      params.push(fromUser, fromUser);
    }

    if (inChannel) {
      sql += ` AND (m.channel_id = ? OR m.channel_id = (SELECT id FROM channels WHERE name = ? COLLATE NOCASE))`;
      params.push(inChannel, inChannel);
    } else if (channelId) {
      sql += ` AND m.channel_id = ?`;
      params.push(channelId);
    } else if (user1Id && user2Id) {
      sql += ` AND m.channel_id IS NULL AND (
        (m.sender_id = ? AND m.dm_recipient_id = ?) OR
        (m.sender_id = ? AND m.dm_recipient_id = ?)
      )`;
      params.push(user1Id, user2Id, user2Id, user1Id);
    }

    if (hasFile) {
      sql += ` AND m.attachment_url IS NOT NULL`;
    }

    sql += ` AND (m.channel_id IS NOT NULL OR m.sender_id = ? OR m.dm_recipient_id = ?)`;
    params.push(viewerId, viewerId);

    sql += ` ORDER BY m.created_at DESC LIMIT 50`;
    const rows = db.prepare(sql).all(...params) as any[];
    const reactionsMap = this.getReactionsForMessages(rows.map((r) => r.id));

    return rows.map((m) => ({
      ...m,
      sender_is_bot: Boolean(m.sender_is_bot),
      sender_file_icon: m.sender_file_icon || 'ts',
      sender_message_language: m.sender_message_language || 'typescript',
      message_language: m.message_language || m.sender_message_language || 'typescript',
      reactions: reactionsMap.get(m.id) || [],
    }));
  },

  // Fetch messages created after `since` timestamp for catchup after socket reconnect
  getMessagesSince(viewerId: string, since: number, channelId?: string, dmUserId?: string): MessageWithReactions[] {
    let query = `
      SELECT m.*, u.display_name as sender_display_name, u.avatar_color as sender_avatar_color, u.avatar_url as sender_avatar_url, u.file_icon as sender_file_icon, u.message_language as sender_message_language, u.is_bot as sender_is_bot
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.created_at > ? AND m.deleted_at IS NULL
    `;
    const params: any[] = [since];

    if (channelId) {
      query += ` AND m.channel_id = ?`;
      params.push(channelId);
    } else if (dmUserId) {
      query += ` AND m.channel_id IS NULL AND (
        (m.sender_id = ? AND m.dm_recipient_id = ?) OR
        (m.sender_id = ? AND m.dm_recipient_id = ?)
      )`;
      params.push(viewerId, dmUserId, dmUserId, viewerId);
    } else {
      query += ` AND (m.channel_id IS NOT NULL OR m.sender_id = ? OR m.dm_recipient_id = ?)`;
      params.push(viewerId, viewerId);
    }

    query += ` ORDER BY m.created_at ASC LIMIT 100`;
    const rows = db.prepare(query).all(...params) as any[];
    const reactionsMap = this.getReactionsForMessages(rows.map((m) => m.id));

    return rows.map((m) => ({
      ...m,
      sender_is_bot: Boolean(m.sender_is_bot),
      sender_file_icon: m.sender_file_icon || 'ts',
      sender_message_language: m.sender_message_language || 'typescript',
      message_language: m.message_language || m.sender_message_language || 'typescript',
      reactions: reactionsMap.get(m.id) || [],
    }));
  },
};

export default dbService;
