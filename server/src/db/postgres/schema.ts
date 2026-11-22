import { sql } from 'drizzle-orm';
import {
  bigint,
  index,
  integer,
  pgSchema,
  primaryKey,
  text,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const chat = pgSchema('chitabit');

export const users = chat.table('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull(),
  passwordHash: text('password_hash'),
  displayName: text('display_name').notNull(),
  avatarColor: text('avatar_color').notNull(),
  avatarUrl: text('avatar_url'),
  bio: text('bio').default('Hey there! I am using ChatAbit.'),
  status: text('status').default('Online'),
  fileIcon: text('file_icon').default('ts'),
  messageLanguage: text('message_language').default('typescript'),
  colorTheme: text('color_theme').default('dark-plus'),
  customAccentColor: text('custom_accent_color'),
  highlightAllMessages: integer('highlight_all_messages').default(1),
  shareLiveTyping: integer('share_live_typing').default(1),
  isBot: integer('is_bot').default(0),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
}, (table) => [
  uniqueIndex('users_username_ci').on(sql`lower(${table.username})`),
]);

export const channels = chat.table('channels', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdBy: text('created_by').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
}, (table) => [
  uniqueIndex('channels_name_ci').on(sql`lower(${table.name})`),
]);

export const messages = chat.table('messages', {
  id: text('id').primaryKey(),
  channelId: text('channel_id').references(() => channels.id),
  dmRecipientId: text('dm_recipient_id'),
  senderId: text('sender_id').notNull().references(() => users.id),
  senderUsername: text('sender_username').notNull(),
  messageLanguage: text('message_language'),
  content: text('content').notNull(),
  attachmentUrl: text('attachment_url'),
  attachmentType: text('attachment_type'),
  attachmentName: text('attachment_name'),
  attachmentSize: integer('attachment_size'),
  readAt: bigint('read_at', { mode: 'number' }),
  editedAt: bigint('edited_at', { mode: 'number' }),
  deletedAt: bigint('deleted_at', { mode: 'number' }),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
}, (table) => [
  index('idx_messages_channel').on(table.channelId, table.createdAt),
  index('idx_messages_dm').on(table.senderId, table.dmRecipientId, table.createdAt),
  index('idx_messages_dm_unread').on(table.dmRecipientId, table.readAt),
]);

export const reactions = chat.table('reactions', {
  id: text('id').primaryKey(),
  messageId: text('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  emoji: text('emoji').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
}, (table) => [
  unique().on(table.messageId, table.userId, table.emoji),
  index('idx_reactions_message').on(table.messageId),
]);

export const friends = chat.table('friends', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  friendId: text('friend_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.friendId] }),
  index('idx_friends_user').on(table.userId),
]);

export const friendRequests = chat.table('friend_requests', {
  id: text('id').primaryKey(),
  senderId: text('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  receiverId: text('receiver_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
}, (table) => [
  unique().on(table.senderId, table.receiverId),
  index('idx_friend_requests_receiver').on(table.receiverId, table.status),
]);

export const channelReads = chat.table('channel_reads', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  channelId: text('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  lastReadAt: bigint('last_read_at', { mode: 'number' }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.channelId] }),
]);
