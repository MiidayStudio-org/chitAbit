import { createHash, randomUUID } from 'node:crypto';
import { Server, Socket } from 'socket.io';
import { dbService, MessageWithReactions, type UserRow } from '../db/index.js';
import { checkRateLimit, checkDraftRateLimit, checkBotRateLimit } from '../middleware/rateLimiter.js';
import { sanitizeText, sanitizeDraftText } from '../middleware/sanitize.js';
import { parseSlashCommand } from '../services/slashCommands.js';
import { botService } from '../services/botService.js';
import { verifyToken, AuthPayload } from '../middleware/auth.js';

interface OnlineUser {
  socketId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarColor: string;
  avatarUrl?: string | null;
  channelId: string | null;
  dmRecipientId: string | null;
}

export interface ActiveDraft {
  senderId: string;
  senderUsername: string;
  senderFileIcon: string;
  messageLanguage?: string;
  channelId?: string | null;
  dmRecipientId?: string | null;
  text: string;
  cursorPos?: number;
  updatedAt: number;
}

// Global online socket tracking & in-memory drafts
const onlineUsers = new Map<string, OnlineUser>();
const activeDrafts = new Map<string, ActiveDraft>();

function clearUserDraft(
  io: Server,
  userId: string,
  channelId?: string | null,
  dmRecipientId?: string | null
) {
  const draftKey = channelId
    ? `channel:${channelId}:${userId}`
    : `dm:${userId}:${dmRecipientId}`;

  if (activeDrafts.has(draftKey)) {
    activeDrafts.delete(draftKey);
    const payload = {
      senderId: userId,
      channelId: channelId || null,
      dmRecipientId: dmRecipientId || null,
    };
    if (channelId) {
      io.to(`channel:${channelId}`).emit('draft:cleared', payload);
    } else if (dmRecipientId) {
      io.to(`user:${dmRecipientId}`).emit('draft:cleared', payload);
    }
  }
}

function clearAllUserDrafts(io: Server, userId: string) {
  for (const [key, draft] of activeDrafts.entries()) {
    if (draft.senderId === userId) {
      activeDrafts.delete(key);
      const payload = {
        senderId: userId,
        channelId: draft.channelId || null,
        dmRecipientId: draft.dmRecipientId || null,
      };
      if (draft.channelId) {
        io.to(`channel:${draft.channelId}`).emit('draft:cleared', payload);
      } else if (draft.dmRecipientId) {
        io.to(`user:${draft.dmRecipientId}`).emit('draft:cleared', payload);
      }
    }
  }
}

const MAX_MESSAGE_LENGTH = 8000;
// Emoji only: short, no letters/digits/spaces/HTML
const EMOJI_PATTERN = /^[^\w\s<>&"'`]{1,16}$/u;
const UPLOAD_URL_PATTERN = /^\/uploads\/[\w.-]+$/;

function isId(value: unknown, max = 100): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

// Works out where a message/draft is going, and checks the channel or user exists.
async function resolveTarget(
  channelId: unknown,
  dmRecipientId: unknown
): Promise<{ channelId: string | null; dmRecipientId: string | null } | null> {
  if (isId(channelId)) {
    return await dbService.getChannelById(channelId) ? { channelId, dmRecipientId: null } : null;
  }
  if (isId(dmRecipientId)) {
    return await dbService.getUserById(dmRecipientId) ? { channelId: null, dmRecipientId } : null;
  }
  return null;
}

// Channel messages are public; DM messages only to the two people in the DM.
function canAccessMessage(msg: MessageWithReactions, userId: string): boolean {
  if (msg.channel_id) return true;
  return msg.sender_id === userId || msg.dm_recipient_id === userId;
}

// Sends an event to everyone who can see this message: the channel room,
// or both people in a DM. Used by socket handlers and REST routes.
export function emitToMessageAudience(io: Server, msg: MessageWithReactions, event: string, payload: unknown) {
  if (msg.channel_id) {
    io.to(`channel:${msg.channel_id}`).emit(event, payload);
  } else if (msg.dm_recipient_id) {
    io.to(`user:${msg.sender_id}`).to(`user:${msg.dm_recipient_id}`).emit(event, payload);
  }
}

export function registerChatHandlers(io: Server) {
  // Every socket must send a valid JWT: io('/', { auth: { token } })
  io.use((socket, next) => {
    void verifyToken(socket.handshake.auth?.token).then((auth) => {
      if (!auth) {
        next(new Error('Unauthorized'));
        return;
      }
      socket.data.auth = auth;
      next();
    }).catch(() => next(new Error('Could not verify session')));
  });

  io.on('connection', (socket: Socket) => {
    // The only trusted identity. Never use userId/senderId sent by the client.
    const me = socket.data.auth as AuthPayload;

    // Process events from one socket in order, including joins and switches.
    let pending = Promise.resolve();
    const on = <T extends object>(
      event: string,
      handler: (data: Partial<T>, acknowledge?: (result: MessageSendResult) => void) => void | Promise<void>,
    ) => {
      socket.on(event, (data: unknown, callback?: unknown) => {
        const acknowledge = typeof callback === 'function' ? callback as (result: MessageSendResult) => void : undefined;
        if (data !== undefined && (data === null || typeof data !== 'object')) {
          if (event === 'message:send') acknowledge?.({ success: false, error: 'Invalid message payload' });
          return;
        }
        if (event === 'message:send' || event === 'draft:clear' || event === 'channel:switch' || event === 'dm:switch') {
          // Invalidate drafts as the event enters the queue, before any SQL work.
          draftRevision++;
          latestDraft = undefined;
        }
        pending = pending.then(async () => {
          if (socket.connected) await handler((data ?? {}) as Partial<T>, acknowledge);
        }).catch(() => {
          console.error(`[Socket] "${event}" failed for ${me.userId}`);
          const error = 'Something went wrong handling your request';
          socket.emit('error', { message: error });
          if (event === 'message:send') acknowledge?.({ success: false, error });
        });
      });
    };

    // 1. User Join / Announce (profile always comes from the DB, not the client)
    on<{ channelId: string }>('user:join', async (data) => {
      const user = await dbService.getUserById(me.userId);
      if (!user) return;

      // A repeated user:join on the same socket only refreshes the profile; it must
      // not reset which chat is open (channel:switch / dm:switch own that).
      const previous = socket.data.user as OnlineUser | undefined;
      const channels = await dbService.getChannels();
      const initialChannel = channels.find(({ id }) => id === data.channelId)?.id ?? 'general';
      if (!socket.connected) return;

      const onlineUser: OnlineUser = {
        socketId: socket.id,
        userId: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarColor: user.avatar_color,
        avatarUrl: user.avatar_url || null,
        channelId: previous ? previous.channelId : initialChannel,
        dmRecipientId: previous ? previous.dmRecipientId : null,
      };

      onlineUsers.set(socket.id, onlineUser);
      socket.data.user = onlineUser;

      // Join every channel room (not only the open one) so messages in other
      // channels still reach the client and its unread badges update live.
      await socket.join([...channels.map(({ id }) => `channel:${id}`), `user:${user.id}`]);
      if (!previous) await dbService.markChannelRead(user.id, initialChannel);
      if (!socket.connected) return;

      const channelDrafts = Array.from(activeDrafts.values()).filter(
        (d) => d.channelId === initialChannel && d.senderId !== user.id
      );
      if (channelDrafts.length > 0) {
        socket.emit('draft:sync', { drafts: channelDrafts });
      }

      broadcastPresence(io);
    });

    // 2. Switch Channel
    on<{ channelId: string; previousChannelId: string }>('channel:switch', async (data) => {
      if (!socket.data.user) return;
      if (!isId(data.channelId) || !(await dbService.getChannelById(data.channelId))) return;
      if (!socket.connected) return;

      if (isId(data.previousChannelId)) {
        socket.leave(`channel:${data.previousChannelId}`);
        clearUserDraft(io, me.userId, data.previousChannelId, null);
      }
      socket.join(`channel:${data.channelId}`);
      socket.data.user.channelId = data.channelId;
      socket.data.user.dmRecipientId = null;
      await dbService.markChannelRead(me.userId, data.channelId);

      const channelDrafts = Array.from(activeDrafts.values()).filter(
        (d) => d.channelId === data.channelId && d.senderId !== me.userId
      );
      if (channelDrafts.length > 0) {
        socket.emit('draft:sync', { drafts: channelDrafts });
      }

      broadcastPresence(io);
    });

    // 3. Switch DM
    on<{ recipientId: string; previousChannelId: string }>('dm:switch', (data) => {
      if (!socket.data.user) return;
      if (!isId(data.recipientId)) return;

      if (isId(data.previousChannelId)) {
        socket.leave(`channel:${data.previousChannelId}`);
        clearUserDraft(io, me.userId, data.previousChannelId, null);
      }
      socket.data.user.channelId = null;
      socket.data.user.dmRecipientId = data.recipientId;

      const dmDraft = activeDrafts.get(`dm:${data.recipientId}:${me.userId}`);
      if (dmDraft) {
        socket.emit('draft:sync', { drafts: [dmDraft] });
      }

      broadcastPresence(io);
    });

    on<MessageInput>('message:send', async (data, acknowledge) => {
      let error: string | undefined;
      let cleared = false;
      const message = await sendChatMessage(io, me, data, (event, text) => {
        if (event === 'chat:clear') {
          cleared = true;
          socket.emit(event);
        } else if (text) {
          error = text;
          socket.emit(event, { message: text });
        }
      });
      if (message) acknowledge?.({ success: true, message });
      else if (cleared) acknowledge?.({ success: true, cleared: true });
      else acknowledge?.({ success: false, error: error ?? 'Message content required' });
    });

    // 5. Message Read Receipt (the reader is always the logged-in user)
    on<{ dmSenderId: string }>('message:read', async (data) => {
      if (!isId(data.dmSenderId)) return;
      const updatedCount = await dbService.markDMMessagesAsRead(data.dmSenderId, me.userId);
      if (updatedCount > 0) {
        io.to(`user:${data.dmSenderId}`).emit('message:read_receipt', {
          readerId: me.userId,
          readAt: Date.now(),
        });
      }
    });

    // 5b. Mark a channel as read (same as POST /api/messages/read with channelId)
    on<{ channelId: string }>('channel:read', async (data) => {
      if (!isId(data.channelId) || !(await dbService.getChannelById(data.channelId))) return;
      if (!socket.connected) return;
      await dbService.markChannelRead(me.userId, data.channelId);
    });

    // 6. Edit Message (only your own)
    on<{ messageId: string; content: string }>('message:edit', async (data) => {
      if (!isId(data.messageId) || typeof data.content !== 'string') return;
      if (data.content.length > MAX_MESSAGE_LENGTH) return;
      const clean = sanitizeText(data.content);
      if (!clean) return;

      const updated = await dbService.updateMessage(data.messageId, me.userId, clean);
      if (!updated) return;

      emitToMessageAudience(io, updated, 'message:edited', updated);
    });

    // 7. Delete Message (only your own)
    on<{ messageId: string }>('message:delete', async (data) => {
      if (!isId(data.messageId)) return;
      const msg = await dbService.getMessageById(data.messageId);
      if (!msg || msg.sender_id !== me.userId) return;

      const success = await dbService.deleteMessage(data.messageId, me.userId);
      if (!success) return;

      emitToMessageAudience(io, msg, 'message:deleted', { id: msg.id });
    });

    // 8. Toggle Reaction (message must exist and be visible to you)
    on<{ messageId: string; emoji: string }>('reaction:toggle', async (data) => {
      if (!isId(data.messageId) || typeof data.emoji !== 'string') return;
      if (!EMOJI_PATTERN.test(data.emoji)) return;

      const msg = await dbService.getMessageById(data.messageId);
      if (!msg || !canAccessMessage(msg, me.userId)) return;

      const reactions = await dbService.toggleReaction(data.messageId, me.userId, data.emoji);
      emitToMessageAudience(io, msg, 'reaction:updated', { messageId: data.messageId, reactions });
    });

    // 9. Typing Indicator (username comes from the token)
    const emitTyping = (data: { channelId?: unknown; dmRecipientId?: unknown }, isTyping: boolean) => {
      if (isId(data.channelId)) {
        socket.to(`channel:${data.channelId}`).emit('typing:status', {
          channelId: data.channelId,
          username: me.username,
          isTyping,
        });
      } else if (isId(data.dmRecipientId)) {
        socket.to(`user:${data.dmRecipientId}`).emit('typing:status', {
          dmRecipientId: data.dmRecipientId,
          username: me.username,
          isTyping,
        });
      }
    };
    on<{ channelId: string; dmRecipientId: string }>('typing:start', (data) => emitTyping(data, true));
    on<{ channelId: string; dmRecipientId: string }>('typing:stop', (data) => emitTyping(data, false));

    // 10. Live Draft Mirroring
    type DraftInput = Partial<{
      channelId: string | null;
      dmRecipientId: string | null;
      text: string;
      cursorPos: number;
      messageLanguage: string;
    }>;
    type DraftUpdate = { data: DraftInput; after: Promise<void>; revision: number };
    let latestDraft: DraftUpdate | undefined;
    let draftRevision = 0;
    let processingDraft = false;

    async function publishDraft({ data, revision }: DraftUpdate) {
      if (!socket.data.user) return;
      // Never broadcast slash commands or DevBot DMs.
      if (typeof data.text !== 'string' || !data.text || data.text.startsWith('/') || data.dmRecipientId === 'devbot') {
        clearUserDraft(io, me.userId, data.channelId, data.dmRecipientId);
        return;
      }

      const target = isId(data.channelId)
        ? { channelId: data.channelId, dmRecipientId: null }
        : { channelId: null, dmRecipientId: isId(data.dmRecipientId) ? data.dmRecipientId : null };
      if (!target.channelId && (!target.dmRecipientId || target.dmRecipientId === me.userId)) return;
      if (!checkDraftRateLimit(me.userId)) return;

      const sender = await dbService.getLiveDraftSender(me.userId, target);
      if (!sender || !socket.connected || revision !== draftRevision) return;

      const text = sanitizeDraftText(data.text.slice(0, 4000));

      const draft: ActiveDraft = {
        senderId: sender.id,
        senderUsername: sender.username,
        senderFileIcon: sender.file_icon || 'ts',
        messageLanguage:
          (typeof data.messageLanguage === 'string' && data.messageLanguage.slice(0, 40)) ||
          sender.message_language ||
          'typescript',
        channelId: target.channelId,
        dmRecipientId: target.dmRecipientId,
        text,
        cursorPos: typeof data.cursorPos === 'number' ? data.cursorPos : undefined,
        updatedAt: Date.now(),
      };

      const draftKey = target.channelId
        ? `channel:${target.channelId}:${sender.id}`
        : `dm:${sender.id}:${target.dmRecipientId}`;
      activeDrafts.set(draftKey, draft);

      if (target.channelId) {
        socket.to(`channel:${target.channelId}`).emit('draft:update', draft);
      } else if (target.dmRecipientId) {
        io.to(`user:${target.dmRecipientId}`).emit('draft:update', draft);
      }
    }

    async function processDrafts() {
      processingDraft = true;
      try {
        while (latestDraft) {
          const update = latestDraft;
          latestDraft = undefined;
          await update.after;
          if (socket.connected && update.revision === draftRevision) await publishDraft(update);
        }
      } catch {
        console.error(`[Socket] Draft update failed for ${me.userId}`);
      } finally {
        processingDraft = false;
        if (latestDraft) void processDrafts();
      }
    }

    socket.on('draft:update', (data: unknown) => {
      if (!data || typeof data !== 'object') return;
      latestDraft = { data: data as DraftInput, after: pending, revision: ++draftRevision };
      if (!processingDraft) void processDrafts();
    });

    on<{ channelId: string | null; dmRecipientId: string | null }>('draft:clear', (data) => {
      if (!socket.data.user) return;
      clearUserDraft(io, me.userId, data.channelId, data.dmRecipientId);
    });

    // 11. Disconnect
    socket.on('disconnect', () => {
      draftRevision++;
      latestDraft = undefined;
      if (socket.data.user) {
        clearAllUserDrafts(io, me.userId);
      }
      onlineUsers.delete(socket.id);
      broadcastPresence(io);
    });
  });
}

type SentMessage = MessageWithReactions & { localTempId?: string };
type MessageSendResult =
  | { success: true; message: SentMessage }
  | { success: true; cleared: true }
  | { success: false; error: string };

interface MessageInput {
  localTempId: string;
  channelId: string | null;
  dmRecipientId: string | null;
  content: string;
  messageLanguage: string | null;
  attachmentUrl: string | null;
  attachmentType: string | null;
  attachmentName: string | null;
  attachmentSize: number | null;
}

export async function sendChatMessage(
  io: Server,
  me: AuthPayload,
  data: Partial<MessageInput>,
  notify: (event: 'error' | 'message:rate_limit' | 'chat:clear', message?: string) => void,
): Promise<SentMessage | undefined> {
  const localTempId = data.localTempId;
  if (localTempId !== undefined && (typeof localTempId !== 'string' || !/^[\w-]{1,100}$/.test(localTempId))) {
    notify('error', 'Invalid send ID');
    return;
  }
  const [sender, target] = await Promise.all([
    dbService.getUserById(me.userId),
    resolveTarget(data.channelId, data.dmRecipientId),
  ]);
  if (!sender) {
    notify('error', 'Invalid sender profile');
    return;
  }

  if (!target) {
    notify('error', 'Unknown channel or recipient');
    return;
  }

  const rawContent = typeof data.content === 'string' ? data.content : '';
  if (rawContent.length > MAX_MESSAGE_LENGTH) {
    notify('error', `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`);
    return;
  }

  const messageId = localTempId
    ? `msg_send_${createHash('sha256').update(JSON.stringify([sender.id, localTempId])).digest('hex')}`
    : `msg_${randomUUID()}`;

  const findSavedMessage = async () => {
    const existing = await dbService.getMessageById(messageId);
    if (!existing || existing.sender_id !== sender.id || existing.channel_id !== target.channelId ||
        existing.dm_recipient_id !== target.dmRecipientId) return undefined;
    return { ...existing, localTempId };
  };

  // Attachments must point at a file we stored ourselves (no javascript: or external URLs)
  let attachment: { url: string; type: string; name: string; size: number | null } | null = null;
  if (data.attachmentUrl) {
    if (typeof data.attachmentUrl !== 'string' || !UPLOAD_URL_PATTERN.test(data.attachmentUrl)) {
      notify('error', 'Invalid attachment');
      return;
    }
    attachment = {
      url: data.attachmentUrl,
      type: data.attachmentType === 'image' ? 'image' : 'file',
      name: sanitizeText(String(data.attachmentName || 'file')).slice(0, 255) || 'file',
      size: typeof data.attachmentSize === 'number' && Number.isInteger(data.attachmentSize) &&
        data.attachmentSize >= 0 && data.attachmentSize <= 2_147_483_647 ? data.attachmentSize : null,
    };
  }

  const rateCheck = checkRateLimit(sender.id);
  if (!rateCheck.allowed) {
    const existing = localTempId ? await findSavedMessage() : undefined;
    if (existing) return existing;
    notify('message:rate_limit', `Slow down! You are sending messages too quickly. Please wait ${Math.ceil((rateCheck.retryAfterMs || 1000) / 1000)}s.`);
    return;
  }

  const messageLanguage =
    (typeof data.messageLanguage === 'string' && data.messageLanguage.slice(0, 40)) ||
    sender.message_language ||
    'typescript';

  // Separate, stricter limit for DevBot so one user can't burn the Gemini quota
  const askDevBot = (triggerMessageId: string, userQuery: string) => {
    const botCheck = checkBotRateLimit(sender.id);
    if (!botCheck.allowed) {
      notify('message:rate_limit', `DevBot needs a break. You can ask again in ${Math.ceil((botCheck.retryAfterMs || 1000) / 1000)}s.`);
      return;
    }
    void handleDevBotResponse({
      io,
      ...target,
      userQuery,
      originatingUserId: sender.id,
      triggerMessageId,
    }).catch(() => {
      console.error('[Socket] Could not complete DevBot response');
      notify('error', 'Could not complete DevBot response');
    });
  };

  const slash = attachment ? undefined : parseSlashCommand(rawContent);
  if (slash?.isClientOnly && slash.command === 'clear') {
    notify('chat:clear');
    return;
  }

  const askQuery = slash?.isDevBotAsk && slash.askQuery ? sanitizeText(slash.askQuery) : undefined;
  const sanitized = sanitizeText(rawContent);
  const content = askQuery !== undefined ? `/ask ${askQuery}`
    : slash?.handledDirectly && slash.resultText ? slash.resultText : sanitized;
  if (!content && !attachment) return;

  let message: SentMessage;
  try {
    const saved = await dbService.createMessage({
      id: messageId,
      ...target,
      senderId: sender.id,
      sender,
      senderUsername: sender.username,
      messageLanguage,
      content,
      attachmentUrl: attachment?.url,
      attachmentType: attachment?.type,
      attachmentName: attachment?.name,
      attachmentSize: attachment?.size,
    });
    message = localTempId ? { ...saved, localTempId } : saved;
  } catch (error) {
    const databaseError = (error as { cause?: { code?: string }; code?: string });
    if (!localTempId || (databaseError.cause?.code ?? databaseError.code) !== '23505') throw error;
    const existing = await findSavedMessage();
    if (!existing) notify('error', 'Send ID was already used');
    return existing;
  }

  clearUserDraft(io, sender.id, target.channelId, target.dmRecipientId);
  emitToMessageAudience(io, message, 'message:new', message);
  if (target.channelId) {
    void markChannelReadForViewers(target.channelId, message.created_at).catch(() => {
      console.error('[Socket] Could not update channel read state');
    });
  }

  if (askQuery !== undefined) {
    askDevBot(message.id, askQuery);
  } else if (!slash?.handledDirectly && (target.dmRecipientId === 'devbot' || /@devbot\b/i.test(sanitized)) && sanitized) {
    askDevBot(message.id, sanitized.replace(/@devbot/gi, '').trim() || sanitized);
  }

  return message;
}

async function handleDevBotResponse(params: {
  io: Server;
  channelId: string | null;
  dmRecipientId: string | null;
  userQuery: string;
  originatingUserId: string;
  // The message that asked DevBot. It is already sent as the "current request",
  // so it is left out of the history to avoid giving Gemini the question twice.
  triggerMessageId: string;
}) {
  const { io, channelId, dmRecipientId, userQuery, originatingUserId, triggerMessageId } = params;

  // Last 15 messages before the question, for context
  const raw = channelId
    ? await dbService.getChannelMessages(channelId, 16)
    : dmRecipientId
      ? await dbService.getDMMessages(originatingUserId, 'devbot', 16)
      : [];
  const history = raw
    .filter((m) => m.id !== triggerMessageId)
    .slice(-15)
    .map((m) => ({
      senderUsername: m.sender_username,
      content: m.content,
      isBot: Boolean(m.sender_is_bot),
    }));

  // Target room
  const targetRoom = channelId ? `channel:${channelId}` : `user:${originatingUserId}`;

  // 1. Emit typing indicator for DevBot
  io.to(targetRoom).emit('bot:typing', {
    channelId,
    dmRecipientId,
    isTyping: true,
  });

  const tempBotMsgId = `bot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  let accumulated = '';
  let completedReply: string | undefined;

  try {
    await botService.streamReply(userQuery, history, {
      onChunk(chunk) {
        accumulated += chunk;
        io.to(targetRoom).emit('bot:stream:chunk', {
          tempId: tempBotMsgId,
          channelId,
          dmRecipientId: channelId ? null : originatingUserId,
          senderId: 'devbot',
          senderUsername: 'devbot',
          senderDisplayName: 'DevBot (AI Assistant)',
          senderAvatarColor: '#06C755',
          chunk,
          accumulated,
        });
      },
      onDone(fullText) {
        completedReply = fullText;
      },
      onError(err) {
        console.error('[Socket] DevBot error:', err);
      },
    });
    if (completedReply === undefined) return;
    const botSaved = await dbService.createMessage({
      id: tempBotMsgId,
      channelId: channelId || null,
      dmRecipientId: channelId ? null : originatingUserId,
      senderId: 'devbot',
      senderUsername: 'devbot',
      content: completedReply,
    });
    if (channelId) {
      await markChannelReadForViewers(channelId, botSaved.created_at);
    } else if (isViewingDm(originatingUserId, 'devbot')) {
      await dbService.markDMMessagesAsRead('devbot', originatingUserId);
    }
    io.to(targetRoom).emit('bot:stream:end', { tempId: tempBotMsgId, message: botSaved });
  } finally {
    io.to(targetRoom).emit('bot:typing', {
      channelId,
      dmRecipientId,
      isTyping: false,
    });
  }
}

// Anyone who has this channel open right now has seen the new message,
// so it should not count as unread for them.
async function markChannelReadForViewers(channelId: string, at: number) {
  const viewers = new Set<string>();
  for (const u of onlineUsers.values()) {
    if (u.channelId === channelId) viewers.add(u.userId);
  }
  await dbService.markChannelReadForUsers([...viewers], channelId, at);
}

// True if any of the user's open tabs/sockets has this DM open right now
function isViewingDm(userId: string, otherUserId: string): boolean {
  for (const u of onlineUsers.values()) {
    if (u.userId === userId && u.dmRecipientId === otherUserId) return true;
  }
  return false;
}

function broadcastPresence(io: Server) {
  const uniqueUsers = new Map<string, { id: string; username: string; displayName: string; avatarColor: string; avatarUrl?: string | null; channelId: string | null }>();

  // Always include DevBot as online
  uniqueUsers.set('devbot', {
    id: 'devbot',
    username: 'devbot',
    displayName: 'DevBot (AI Assistant)',
    avatarColor: '#06C755',
    channelId: null,
  });

  for (const user of onlineUsers.values()) {
    uniqueUsers.set(user.userId, {
      id: user.userId,
      username: user.username,
      displayName: user.displayName,
      avatarColor: user.avatarColor,
      avatarUrl: user.avatarUrl,
      channelId: user.channelId,
    });
  }

  const usersList = Array.from(uniqueUsers.values());
  io.emit('presence:update', { onlineUsers: usersList });
}
