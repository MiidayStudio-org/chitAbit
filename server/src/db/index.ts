import { DEFAULT_CHANNELS } from './defaultChannels.js';
import { fileURLToPath } from 'node:url';
import { sql, type SQL } from 'drizzle-orm';
import { createPostgresConnection } from './postgres/client.js';

type Executor = {
  execute(query: SQL): Promise<{ rows: unknown[] }>;
};

const { db, transaction } = await openDatabase();

async function openDatabase(): Promise<{ db: Executor; transaction: <T>(work: (tx: Executor) => Promise<T>) => Promise<T> }> {
  if (process.env.NODE_ENV === 'test') {
    const { PGlite } = await import('@electric-sql/pglite');
    const { drizzle } = await import('drizzle-orm/pglite');
    const { migrate } = await import('drizzle-orm/pglite/migrator');
    const database = drizzle(new PGlite());
    await migrate(database, { migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)) });
    return {
      db: database,
      transaction: <T>(work: (tx: Executor) => Promise<T>) => database.transaction(work),
    };
  }
  const { db: database } = createPostgresConnection();
  return {
    db: database,
    transaction: <T>(work: (tx: Executor) => Promise<T>) => database.transaction(work),
  };
}

export { db };

async function all<T>(query: SQL, executor = db): Promise<T[]> {
  const { rows } = await executor.execute(query);
  // node-postgres returns bigint values as strings. Keep milliseconds numeric in the API.
  return rows.map((row) => Object.fromEntries(
    Object.entries(row as Record<string, unknown>).map(([key, value]) => [
      key, key.endsWith('_at') && typeof value === 'string' ? Number(value) : value,
    ]),
  ) as T);
}

async function get<T>(query: SQL, executor = db): Promise<T | undefined> {
  const [row] = await all<T>(query, executor);
  return row;
}

async function run(query: SQL, executor = db): Promise<void> {
  await executor.execute(query);
}

export async function seedChatDatabase() {
  const now = Date.now();
  await transaction(async (tx) => {
    const channels = DEFAULT_CHANNELS.map(({ id, description }, index) =>
      sql`(${id}, ${id}, ${description}, 'system', ${now + index})`);
    await run(sql`
      INSERT INTO chitabit.channels (id, name, description, created_by, created_at)
      VALUES ${sql.join(channels, sql`, `)}
      ON CONFLICT DO NOTHING
    `, tx);
    await run(sql`
      INSERT INTO chitabit.users (id, username, display_name, avatar_color, bio, is_bot, created_at)
      VALUES ('devbot', 'devbot', 'DevBot (AI Assistant)', '#06C755', 'Senior AI Pair Programmer & Debugger 🤖', 1, ${now})
      ON CONFLICT DO NOTHING
    `, tx);
  });
}

if (process.env.NODE_ENV === 'test') await seedChatDatabase();

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

async function lockFriendPair(first: string, second: string, tx: Executor) {
  await run(sql`
    SELECT id FROM chitabit.users WHERE id IN (${first}, ${second}) ORDER BY id FOR UPDATE
  `, tx);
}

async function insertFriendship(first: string, second: string, tx: Executor) {
  const now = Date.now();
  await run(sql`
    INSERT INTO chitabit.friends (user_id, friend_id, created_at)
    VALUES (${first}, ${second}, ${now}), (${second}, ${first}, ${now})
    ON CONFLICT DO NOTHING
  `, tx);
}

export const dbService = {
  // Users
  async getUserById(id: string): Promise<UserRow | undefined> {
    return get<UserRow>(sql`SELECT * FROM chitabit.users WHERE id = ${id}`);
  },

  async getLiveDraftSender(
    senderId: string,
    target: { channelId: string | null; dmRecipientId: string | null },
  ): Promise<Pick<UserRow, 'id' | 'username' | 'file_icon' | 'message_language'> | undefined> {
    const destination = target.channelId
      ? sql`SELECT 1 FROM chitabit.channels WHERE id = ${target.channelId}`
      : sql`SELECT 1 FROM chitabit.users WHERE id = ${target.dmRecipientId}`;
    return get<Pick<UserRow, 'id' | 'username' | 'file_icon' | 'message_language'>>(sql`
      SELECT id, username, file_icon, message_language FROM chitabit.users
      WHERE id = ${senderId} AND share_live_typing IS DISTINCT FROM 0 AND EXISTS (${destination})
    `);
  },

  async getUserByUsername(username: string): Promise<UserRow | undefined> {
    return get<UserRow>(sql`SELECT * FROM chitabit.users WHERE lower(username) = lower(${username})`);
  },

  async createUser(
    id: string,
    username: string,
    passwordHash: string | null = null,
    displayName: string = username,
    avatarColor: string = '#06C755',
    avatarUrl: string | null = null,
    bio: string = 'Hey there! I am using ChatAbit.'
  ): Promise<UserRow | undefined> {
    return get<UserRow>(sql`
      INSERT INTO chitabit.users (id, username, password_hash, display_name, avatar_color, avatar_url, bio, status, is_bot, created_at)
      VALUES (${id}, ${username.toLowerCase()}, ${passwordHash}, ${displayName}, ${avatarColor}, ${avatarUrl}, ${bio}, 'Online', 0, ${Date.now()})
      ON CONFLICT DO NOTHING RETURNING *
    `);
  },

  async setPasswordHash(id: string, passwordHash: string): Promise<boolean> {
    const user = await get(sql`
      UPDATE chitabit.users SET password_hash = ${passwordHash}
      WHERE id = ${id} AND COALESCE(password_hash, '') = '' RETURNING id
    `);
    return Boolean(user);
  },

  async updateUserStatus(id: string, status?: string, bio?: string): Promise<UserRow | undefined> {
    return this.updateUserProfile(id, { status, bio });
  },

  async updateUserProfile(
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
  ): Promise<UserRow | undefined> {
    const fields = {
      display_name: updates.displayName,
      avatar_color: updates.avatarColor,
      avatar_url: updates.avatarUrl,
      file_icon: updates.fileIcon,
      message_language: updates.messageLanguage,
      color_theme: updates.colorTheme,
      custom_accent_color: updates.customAccentColor,
      highlight_all_messages: updates.highlightAllMessages === undefined ? undefined : Number(updates.highlightAllMessages),
      share_live_typing: updates.shareLiveTyping === undefined ? undefined : Number(updates.shareLiveTyping),
      bio: updates.bio,
      status: updates.status,
    };
    const assignments = Object.entries(fields)
      .filter(([, value]) => value !== undefined)
      .map(([column, value]) => sql`${sql.identifier(column)} = ${value}`);
    if (!assignments.length) return this.getUserById(id);
    return get<UserRow>(sql`
      UPDATE chitabit.users SET ${sql.join(assignments, sql`, `)} WHERE id = ${id} RETURNING *
    `);
  },

  async searchUsers(query: string, viewerId: string): Promise<(UserRow & { is_friend: boolean })[]> {
    const cleanQ = likeContains(query);
    return all<UserRow & { is_friend: boolean }>(sql`
      SELECT u.id, u.username, u.display_name, u.avatar_color, u.avatar_url, u.file_icon,
        u.message_language, u.color_theme, u.custom_accent_color, u.highlight_all_messages,
        u.share_live_typing, u.bio, u.status, u.is_bot, u.created_at,
        EXISTS (
          SELECT 1 FROM chitabit.friends f WHERE f.user_id = ${viewerId} AND f.friend_id = u.id
        ) AS is_friend
      FROM chitabit.users u
      WHERE u.is_bot = 0
        AND u.id != ${viewerId}
        AND (u.username ILIKE ${cleanQ} ESCAPE '!' OR u.display_name ILIKE ${cleanQ} ESCAPE '!')
      ORDER BY u.username ASC
      LIMIT 20
    `);
  },

  async getAllUsers(excludeBot = false): Promise<UserRow[]> {
    if (excludeBot) {
      return all<UserRow>(sql`SELECT id, username, display_name, avatar_color, avatar_url, file_icon, message_language, color_theme, custom_accent_color, highlight_all_messages, share_live_typing, bio, status, is_bot, created_at FROM chitabit.users WHERE is_bot = 0 ORDER BY username ASC`);
    }
    return all<UserRow>(sql`SELECT id, username, display_name, avatar_color, avatar_url, file_icon, message_language, color_theme, custom_accent_color, highlight_all_messages, share_live_typing, bio, status, is_bot, created_at FROM chitabit.users ORDER BY is_bot DESC, username ASC`);
  },

  // Friends System
  async getFriends(userId: string): Promise<UserRow[]> {
    return all<UserRow>(sql`
      SELECT u.id, u.username, u.display_name, u.avatar_color, u.avatar_url, u.file_icon, u.message_language, u.color_theme, u.custom_accent_color, u.highlight_all_messages, u.share_live_typing, u.bio, u.status, u.is_bot, u.created_at
      FROM chitabit.friends f
      JOIN chitabit.users u ON f.friend_id = u.id
      WHERE f.user_id = ${userId}
      ORDER BY u.display_name ASC
    `);
  },

  async isFriend(userId1: string, userId2: string): Promise<boolean> {
    const row = await get(sql`SELECT 1 FROM chitabit.friends WHERE user_id = ${userId1} AND friend_id = ${userId2}`);
    return Boolean(row);
  },

  async addFriend(userId1: string, userId2: string): Promise<void> {
    await insertFriendship(userId1, userId2, db);
  },

  async removeFriend(userId1: string, userId2: string): Promise<void> {
    await transaction(async (tx) => {
      await lockFriendPair(userId1, userId2, tx);
      await run(sql`
        DELETE FROM chitabit.friends
        WHERE (user_id = ${userId1} AND friend_id = ${userId2})
           OR (user_id = ${userId2} AND friend_id = ${userId1})
      `, tx);
    });
  },

  // Friend Requests
  async getFriendRequests(userId: string): Promise<{ incoming: FriendRequestRow[]; outgoing: FriendRequestRow[] }> {
    const incoming = await all<FriendRequestRow>(sql`
      SELECT fr.*, u.username as sender_username, u.display_name as sender_display_name, u.avatar_color as sender_avatar_color
      FROM chitabit.friend_requests fr
      JOIN chitabit.users u ON fr.sender_id = u.id
      WHERE fr.receiver_id = ${userId} AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `);

    const outgoing = await all<FriendRequestRow>(sql`
      SELECT fr.*, u.username as receiver_username, u.display_name as receiver_display_name, u.avatar_color as receiver_avatar_color
      FROM chitabit.friend_requests fr
      JOIN chitabit.users u ON fr.receiver_id = u.id
      WHERE fr.sender_id = ${userId} AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `);

    return { incoming, outgoing };
  },

  async createFriendRequest(senderId: string, receiverId: string): Promise<{ success: boolean; error?: string; autoAccepted?: boolean }> {
    if (senderId === receiverId) {
      return { success: false, error: 'Cannot send friend request to yourself' };
    }

    return transaction(async (tx) => {
      await lockFriendPair(senderId, receiverId, tx);
      if (await get(sql`SELECT 1 FROM chitabit.friends WHERE user_id = ${senderId} AND friend_id = ${receiverId}`, tx)) {
        return { success: false, error: 'You are already friends' };
      }

      const reverse = await get<FriendRequestRow>(sql`
        SELECT * FROM chitabit.friend_requests
        WHERE sender_id = ${receiverId} AND receiver_id = ${senderId} AND status = 'pending'
      `, tx);
      if (reverse) {
        await insertFriendship(senderId, receiverId, tx);
        await run(sql`UPDATE chitabit.friend_requests SET status = 'accepted' WHERE id = ${reverse.id}`, tx);
        return { success: true, autoAccepted: true };
      }

      const now = Date.now();
      const id = `freq_${now}_${Math.random().toString(36).slice(2, 7)}`;
      const row = await get(sql`
        INSERT INTO chitabit.friend_requests (id, sender_id, receiver_id, status, created_at)
        VALUES (${id}, ${senderId}, ${receiverId}, 'pending', ${now})
        ON CONFLICT (sender_id, receiver_id) DO UPDATE
        SET status = 'pending', created_at = excluded.created_at
        WHERE friend_requests.status <> 'pending'
        RETURNING id
      `, tx);
      return row ? { success: true } : { success: false, error: 'A pending friend request already exists' };
    });
  },

  async respondToFriendRequest(
    requestId: string,
    receiverId: string,
    action: 'accept' | 'decline'
  ): Promise<{ success: boolean; error?: string; senderId?: string }> {
    return transaction(async (tx) => {
      const request = await get<FriendRequestRow>(sql`
        SELECT * FROM chitabit.friend_requests WHERE id = ${requestId} AND receiver_id = ${receiverId}
      `, tx);
      if (!request) return { success: false, error: 'Request not found' };

      await lockFriendPair(request.sender_id, receiverId, tx);
      const updated = await get(sql`
        UPDATE chitabit.friend_requests SET status = ${action === 'accept' ? 'accepted' : 'declined'}
        WHERE id = ${requestId} AND receiver_id = ${receiverId} AND status = 'pending'
        RETURNING id
      `, tx);
      if (!updated) return { success: false, error: 'Request not found' };
      if (action === 'accept') await insertFriendship(request.sender_id, receiverId, tx);
      return { success: true, senderId: request.sender_id };
    });
  },

  // Default (system) channels first in their seeded order, then custom channels oldest first
  async getChannels(): Promise<ChannelRow[]> {
    return all<ChannelRow>(sql`
      SELECT * FROM chitabit.channels
      ORDER BY (created_by = 'system') DESC, created_at ASC
    `);
  },

  async getChannelById(id: string): Promise<ChannelRow | undefined> {
    return get<ChannelRow>(sql`SELECT * FROM chitabit.channels WHERE id = ${id}`);
  },

  // Unread tracking
  // Channels: messages newer than the user's last read time (default: when the user joined).
  // DMs: messages sent to the user that have no read_at yet.
  async markChannelRead(userId: string, channelId: string, at = Date.now()): Promise<void> {
    await this.markChannelReadForUsers([userId], channelId, at);
  },

  async markChannelReadForUsers(userIds: string[], channelId: string, at: number): Promise<void> {
    if (!userIds.length) return;
    await run(sql`
      INSERT INTO chitabit.channel_reads (user_id, channel_id, last_read_at)
      SELECT user_id, ${channelId}, ${at}::bigint FROM unnest(${sql.param(userIds)}::text[]) AS ids(user_id)
      ORDER BY user_id
      ON CONFLICT (user_id, channel_id) DO UPDATE
      SET last_read_at = GREATEST(channel_reads.last_read_at, excluded.last_read_at)
    `);
  },

  // Keys match the client's unreadCounts map: channel id for channels, sender id for DMs.
  async getUnreadCounts(userId: string): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};

    const rows = await all<{ chat_id: string; count: number }>(sql`
      SELECT m.channel_id AS chat_id, COUNT(*) AS count
      FROM chitabit.messages m
      JOIN chitabit.users me ON me.id = ${userId}
      LEFT JOIN chitabit.channel_reads cr ON cr.user_id = me.id AND cr.channel_id = m.channel_id
      WHERE m.channel_id IS NOT NULL
        AND m.deleted_at IS NULL
        AND m.sender_id != me.id
        AND m.created_at > COALESCE(cr.last_read_at, me.created_at)
      GROUP BY m.channel_id
      UNION ALL
      SELECT sender_id AS chat_id, COUNT(*) AS count
      FROM chitabit.messages
      WHERE channel_id IS NULL
        AND dm_recipient_id = ${userId}
        AND sender_id != ${userId}
        AND read_at IS NULL
        AND deleted_at IS NULL
      GROUP BY sender_id
    `);

    for (const row of rows) {
      counts[row.chat_id] = Number(row.count);
    }
    return counts;
  },

  async createChannel(id: string, name: string, description: string | null, createdBy: string): Promise<ChannelRow | undefined> {
    return get<ChannelRow>(sql`
      INSERT INTO chitabit.channels (id, name, description, created_by, created_at)
      VALUES (${id}, ${name.toLowerCase()}, ${description}, ${createdBy}, ${Date.now()})
      ON CONFLICT DO NOTHING RETURNING *
    `);
  },

  // Reactions helper
  async getReactionsForMessages(messageIds: string[], executor = db): Promise<Map<string, ReactionGroup[]>> {
    const map = new Map<string, ReactionGroup[]>();
    if (messageIds.length === 0) return map;

    const rows = await all<{ message_id: string; emoji: string; user_id: string }>(sql`
      SELECT message_id, emoji, user_id
      FROM chitabit.reactions
      WHERE message_id IN (${sql.join(messageIds.map((id) => sql`${id}`), sql`, `)})
      ORDER BY created_at ASC
    `, executor);

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
  async getChannelMessages(channelId: string, limit = 40, beforeTimestamp?: number): Promise<MessageWithReactions[]> {
    const before = beforeTimestamp ? sql`AND m.created_at < ${beforeTimestamp}` : sql.empty();
    const rows = await loadMessages(sql`
      m.channel_id = ${channelId} ${before}
      ORDER BY m.created_at DESC, m.id DESC LIMIT ${limit}
    `);
    return rows.reverse();
  },

  async getDMMessages(user1Id: string, user2Id: string, limit = 40, beforeTimestamp?: number): Promise<MessageWithReactions[]> {
    const before = beforeTimestamp ? sql`AND m.created_at < ${beforeTimestamp}` : sql.empty();
    const rows = await loadMessages(sql`
      ${dmBetween(user1Id, user2Id)} ${before}
      ORDER BY m.created_at DESC, m.id DESC LIMIT ${limit}
    `);
    return rows.reverse();
  },

  async createMessage(
    paramsOrId:
      | string
      | {
          id: string;
          channelId: string | null;
          dmRecipientId: string | null;
          senderId: string;
          senderUsername: string;
          sender?: UserRow;
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
  ): Promise<MessageWithReactions> {
    let params: {
      id: string;
      channelId: string | null;
      dmRecipientId: string | null;
      senderId: string;
      senderUsername: string;
      sender?: UserRow;
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

    const user = params.sender ?? await this.getUserById(params.senderId);
    const resolvedLanguage = params.messageLanguage || user?.message_language || 'typescript';
    const createdAt = Date.now();

    await run(sql`
      INSERT INTO chitabit.messages (id, channel_id, dm_recipient_id, sender_id, sender_username, message_language, content, attachment_url, attachment_type, attachment_name, attachment_size, read_at, created_at)
      VALUES (${params.id}, ${params.channelId}, ${params.dmRecipientId}, ${params.senderId}, ${params.senderUsername}, ${resolvedLanguage}, ${params.content}, ${params.attachmentUrl || null}, ${params.attachmentType || null}, ${params.attachmentName || null}, ${params.attachmentSize || null}, NULL, ${createdAt})
    `);

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

  async markDMMessagesAsRead(senderId: string, recipientId: string): Promise<number> {
    const now = Date.now();
    const updated = await all(sql`
      UPDATE chitabit.messages
      SET read_at = ${now}
      WHERE sender_id = ${senderId} AND dm_recipient_id = ${recipientId} AND read_at IS NULL
      RETURNING id
    `);
    return updated.length;
  },

  async getMessageById(id: string): Promise<MessageWithReactions | undefined> {
    const [message] = await loadMessages(sql`m.id = ${id}`);
    return message;
  },

  async updateMessage(id: string, senderId: string, content: string): Promise<MessageWithReactions | undefined> {
    const updated = await get(sql`
      UPDATE chitabit.messages SET content = ${content}, edited_at = ${Date.now()}
      WHERE id = ${id} AND sender_id = ${senderId} AND deleted_at IS NULL
      RETURNING id
    `);
    return updated ? this.getMessageById(id) : undefined;
  },

  async deleteMessage(id: string, senderId: string): Promise<boolean> {
    return transaction(async (tx) => {
      const deleted = await get(sql`
        UPDATE chitabit.messages
        SET deleted_at = ${Date.now()}, content = '', attachment_url = NULL, attachment_type = NULL,
            attachment_name = NULL, attachment_size = NULL
        WHERE id = ${id} AND sender_id = ${senderId} AND deleted_at IS NULL
        RETURNING id
      `, tx);
      if (!deleted) return false;
      await run(sql`DELETE FROM chitabit.reactions WHERE message_id = ${id}`, tx);
      return true;
    });
  },

  async toggleReaction(messageId: string, userId: string, emoji: string): Promise<ReactionGroup[]> {
    return transaction(async (tx) => {
      const message = await get(sql`
        SELECT id FROM chitabit.messages WHERE id = ${messageId} AND deleted_at IS NULL FOR UPDATE
      `, tx);
      if (!message) return [];
      const deleted = await get(sql`
        DELETE FROM chitabit.reactions WHERE message_id = ${messageId} AND user_id = ${userId} AND emoji = ${emoji}
        RETURNING id
      `, tx);
      if (!deleted) {
        const now = Date.now();
        const id = `react_${now}_${Math.random().toString(36).slice(2, 7)}`;
        await run(sql`
          INSERT INTO chitabit.reactions (id, message_id, user_id, emoji, created_at)
          VALUES (${id}, ${messageId}, ${userId}, ${emoji}, ${now})
        `, tx);
      }
      return (await this.getReactionsForMessages([messageId], tx)).get(messageId) || [];
    });
  },

  // viewerId: only messages this user may see (any channel, or DMs they are part of)
  // Supports filter prefixes: from:@user, in:#channel, has:file, and keyword matching
  async searchMessages(query: string, viewerId: string, channelId?: string, user1Id?: string, user2Id?: string): Promise<MessageWithReactions[]> {
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

    const filters = [visibleTo(viewerId)];
    if (rawQuery) filters.push(sql`m.content ILIKE ${likeContains(rawQuery)} ESCAPE '!'`);
    if (fromUser) {
      filters.push(sql`(lower(u.username) = lower(${fromUser}) OR lower(u.display_name) = lower(${fromUser}))`);
    }
    if (inChannel) {
      filters.push(sql`(m.channel_id = ${inChannel} OR m.channel_id = (
        SELECT id FROM chitabit.channels WHERE lower(name) = ${inChannel}
      ))`);
    } else if (channelId) {
      filters.push(sql`m.channel_id = ${channelId}`);
    } else if (user1Id && user2Id) {
      filters.push(dmBetween(user1Id, user2Id));
    }
    if (hasFile) filters.push(sql`m.attachment_url IS NOT NULL`);

    return loadMessages(sql`${sql.join(filters, sql` AND `)} ORDER BY m.created_at DESC, m.id DESC LIMIT 50`);
  },

  // Fetch messages created after `since` for catchup after socket reconnect.
  async getMessagesSince(viewerId: string, since: number, channelId?: string, dmUserId?: string): Promise<MessageWithReactions[]> {
    let target = visibleTo(viewerId);
    if (channelId) target = sql`m.channel_id = ${channelId}`;
    else if (dmUserId) target = dmBetween(viewerId, dmUserId);
    return loadMessages(sql`
      m.created_at > ${since} AND ${target} ORDER BY m.created_at ASC, m.id ASC LIMIT 100
    `);
  },
};

function visibleTo(viewerId: string) {
  return sql`(m.channel_id IS NOT NULL OR m.sender_id = ${viewerId} OR m.dm_recipient_id = ${viewerId})`;
}

function dmBetween(first: string, second: string) {
  return sql`(m.channel_id IS NULL AND (
    (m.sender_id = ${first} AND m.dm_recipient_id = ${second})
    OR (m.sender_id = ${second} AND m.dm_recipient_id = ${first})
  ))`;
}

async function loadMessages(filter: SQL): Promise<MessageWithReactions[]> {
  const rows = await all<Omit<MessageWithReactions, 'sender_is_bot'> & { sender_is_bot: number }>(sql`
    SELECT m.*, u.display_name AS sender_display_name, u.avatar_color AS sender_avatar_color,
      u.avatar_url AS sender_avatar_url, u.file_icon AS sender_file_icon,
      u.message_language AS sender_message_language, u.is_bot AS sender_is_bot,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object('emoji', grouped.emoji, 'count', grouped.count, 'users', grouped.users)
                         ORDER BY grouped.first_at, grouped.emoji)
        FROM (
          SELECT r.emoji, count(*) AS count, array_agg(r.user_id ORDER BY r.created_at, r.id) AS users,
            min(r.created_at) AS first_at
          FROM chitabit.reactions r
          WHERE r.message_id = m.id
          GROUP BY r.emoji
        ) grouped
      ), '[]'::jsonb) AS reactions
    FROM chitabit.messages m
    JOIN chitabit.users u ON m.sender_id = u.id
    WHERE m.deleted_at IS NULL AND ${filter}
  `);
  return rows.map((row) => ({
    ...row,
    sender_is_bot: Boolean(row.sender_is_bot),
    sender_file_icon: row.sender_file_icon || 'ts',
    sender_message_language: row.sender_message_language || 'typescript',
    message_language: row.message_language || row.sender_message_language || 'typescript',
  }));
}

export default dbService;
