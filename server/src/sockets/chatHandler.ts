import { Server, Socket } from 'socket.io';
import { dbService, MessageWithReactions } from '../db/index.js';
import { checkRateLimit, checkDraftRateLimit } from '../middleware/rateLimiter.js';
import { sanitizeText, sanitizeDraftText } from '../middleware/sanitize.js';
import { parseSlashCommand } from '../services/slashCommands.js';
import { botService } from '../services/botService.js';

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

export function registerChatHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    // 1. User Join / Announce
    socket.on('user:join', (data: { userId?: string; id?: string; username: string; displayName?: string; avatarColor?: string; avatarUrl?: string | null; channelId?: string }) => {
      const effectiveUserId = data.userId || (data as any).id;
      if (!effectiveUserId) return;

      const user = dbService.getUserById(effectiveUserId);
      const onlineUser: OnlineUser = {
        socketId: socket.id,
        userId: effectiveUserId,
        username: data.username || user?.username || 'user',
        displayName: data.displayName || user?.display_name || data.username,
        avatarColor: data.avatarColor || user?.avatar_color || '#06C755',
        avatarUrl: data.avatarUrl || user?.avatar_url || null,
        channelId: data.channelId || 'general',
        dmRecipientId: null,
      };

      onlineUsers.set(socket.id, onlineUser);
      socket.data.user = onlineUser;

      // Join channel room
      const initialChannel = data.channelId || 'general';
      socket.join(`channel:${initialChannel}`);
      socket.join(`user:${effectiveUserId}`); // private user room for DMs & notifications

      // Sync active channel drafts to joining user
      const channelDrafts = Array.from(activeDrafts.values()).filter(
        (d) => d.channelId === initialChannel && d.senderId !== effectiveUserId
      );
      if (channelDrafts.length > 0) {
        socket.emit('draft:sync', { drafts: channelDrafts });
      }

      broadcastPresence(io);
    });

    // 2. Switch Channel
    socket.on('channel:switch', (data: { channelId: string; previousChannelId?: string }) => {
      if (!socket.data.user) return;
      if (data.previousChannelId) {
        socket.leave(`channel:${data.previousChannelId}`);
        clearUserDraft(io, socket.data.user.userId, data.previousChannelId, null);
      }
      socket.join(`channel:${data.channelId}`);
      socket.data.user.channelId = data.channelId;
      socket.data.user.dmRecipientId = null;

      // Sync active drafts in this channel to this socket
      const channelDrafts = Array.from(activeDrafts.values()).filter(
        (d) => d.channelId === data.channelId && d.senderId !== socket.data.user?.userId
      );
      if (channelDrafts.length > 0) {
        socket.emit('draft:sync', { drafts: channelDrafts });
      }

      broadcastPresence(io);
    });

    // 3. Switch DM
    socket.on('dm:switch', (data: { recipientId: string; previousChannelId?: string }) => {
      if (!socket.data.user) return;
      if (data.previousChannelId) {
        socket.leave(`channel:${data.previousChannelId}`);
        clearUserDraft(io, socket.data.user.userId, data.previousChannelId, null);
      }
      socket.data.user.channelId = null;
      socket.data.user.dmRecipientId = data.recipientId;

      // Sync DM draft if recipient has one active for me
      const dmKey = `dm:${data.recipientId}:${socket.data.user.userId}`;
      const dmDraft = activeDrafts.get(dmKey);
      if (dmDraft) {
        socket.emit('draft:sync', { drafts: [dmDraft] });
      }

      broadcastPresence(io);
    });

    // 4. Send Message (with optional attachment)
    socket.on('message:send', async (data: {
      channelId?: string | null;
      dmRecipientId?: string | null;
      content: string;
      senderId: string;
      senderUsername: string;
      messageLanguage?: string | null;
      attachmentUrl?: string | null;
      attachmentType?: string | null;
      attachmentName?: string | null;
      attachmentSize?: number | null;
    }) => {
      const sender = dbService.getUserById(data.senderId);
      if (!sender) {
        socket.emit('error', { message: 'Invalid sender profile' });
        return;
      }

      // Rate limit check: 10 messages per 10 seconds
      const rateCheck = checkRateLimit(sender.id);
      if (!rateCheck.allowed) {
        socket.emit('message:rate_limit', {
          message: `Slow down! You are sending messages too quickly. Please wait ${Math.ceil((rateCheck.retryAfterMs || 1000) / 1000)}s.`,
        });
        return;
      }

      const rawContent = data.content || '';

      // Check slash commands (only if no attachment)
      if (!data.attachmentUrl) {
        const slashResult = parseSlashCommand(rawContent);

        if (slashResult.isCommand) {
          if (slashResult.isClientOnly && slashResult.command === 'clear') {
            socket.emit('chat:clear');
            return;
          }

          if (slashResult.handledDirectly && slashResult.resultText) {
            saveAndBroadcastMessage({
              io,
              channelId: data.channelId || null,
              dmRecipientId: data.dmRecipientId || null,
              senderId: sender.id,
              senderUsername: sender.username,
              messageLanguage: data.messageLanguage || sender.message_language || 'typescript',
              content: slashResult.resultText,
            });
            return;
          }

          if (slashResult.isDevBotAsk && slashResult.askQuery) {
            saveAndBroadcastMessage({
              io,
              channelId: data.channelId || null,
              dmRecipientId: data.dmRecipientId || null,
              senderId: sender.id,
              senderUsername: sender.username,
              messageLanguage: data.messageLanguage || sender.message_language || 'typescript',
              content: `/ask ${slashResult.askQuery}`,
            });

            await handleDevBotResponse({
              io,
              channelId: data.channelId || null,
              dmRecipientId: data.dmRecipientId || null,
              userQuery: slashResult.askQuery,
              originatingUserId: sender.id,
            });
            return;
          }
        }
      }

      // Normal message
      const sanitized = sanitizeText(rawContent);
      if (!sanitized && !data.attachmentUrl) return;

      const savedMessage = saveAndBroadcastMessage({
        io,
        channelId: data.channelId || null,
        dmRecipientId: data.dmRecipientId || null,
        senderId: sender.id,
        senderUsername: sender.username,
        messageLanguage: data.messageLanguage || sender.message_language || 'typescript',
        content: sanitized,
        attachmentUrl: data.attachmentUrl,
        attachmentType: data.attachmentType,
        attachmentName: data.attachmentName,
        attachmentSize: data.attachmentSize,
      });

      // DevBot reply checks:
      // Condition 1: DM with DevBot
      const isDmWithDevBot = Boolean(data.dmRecipientId === 'devbot');
      // Condition 2: Mention of @devbot in message in #general
      const isDevBotMentioned = /@devbot\b/i.test(sanitized);

      if (isDmWithDevBot || isDevBotMentioned) {
        const query = sanitized.replace(/@devbot/gi, '').trim() || sanitized;
        await handleDevBotResponse({
          io,
          channelId: data.channelId || null,
          dmRecipientId: data.dmRecipientId || null,
          userQuery: query,
          originatingUserId: sender.id,
        });
      }
    });

    // 5. Message Read Receipt
    socket.on('message:read', (data: { dmSenderId: string; currentUserId: string }) => {
      const updatedCount = dbService.markDMMessagesAsRead(data.dmSenderId, data.currentUserId);
      if (updatedCount > 0) {
        // Broadcast read receipt to sender's room
        io.to(`user:${data.dmSenderId}`).emit('message:read_receipt', {
          readerId: data.currentUserId,
          readAt: Date.now(),
        });
      }
    });

    // 6. Edit Message
    socket.on('message:edit', (data: { messageId: string; senderId: string; content: string }) => {
      const clean = sanitizeText(data.content);
      if (!clean) return;

      const updated = dbService.updateMessage(data.messageId, data.senderId, clean);
      if (!updated) return;

      if (updated.channel_id) {
        io.to(`channel:${updated.channel_id}`).emit('message:edited', updated);
      } else if (updated.dm_recipient_id) {
        io.to(`user:${updated.sender_id}`).emit('message:edited', updated);
        io.to(`user:${updated.dm_recipient_id}`).emit('message:edited', updated);
      }
    });

    // 7. Delete Message
    socket.on('message:delete', (data: { messageId: string; senderId: string }) => {
      const msg = dbService.getMessageById(data.messageId);
      if (!msg || msg.sender_id !== data.senderId) return;

      const success = dbService.deleteMessage(data.messageId, data.senderId);
      if (!success) return;

      if (msg.channel_id) {
        io.to(`channel:${msg.channel_id}`).emit('message:deleted', { id: msg.id });
      } else if (msg.dm_recipient_id) {
        io.to(`user:${msg.sender_id}`).emit('message:deleted', { id: msg.id });
        io.to(`user:${msg.dm_recipient_id}`).emit('message:deleted', { id: msg.id });
      }
    });

    // 8. Toggle Reaction
    socket.on('reaction:toggle', (data: { messageId: string; userId: string; emoji: string }) => {
      const reactions = dbService.toggleReaction(data.messageId, data.userId, data.emoji);
      const msg = dbService.getMessageById(data.messageId);
      if (!msg) return;

      const payload = { messageId: data.messageId, reactions };
      if (msg.channel_id) {
        io.to(`channel:${msg.channel_id}`).emit('reaction:updated', payload);
      } else if (msg.dm_recipient_id) {
        io.to(`user:${msg.sender_id}`).emit('reaction:updated', payload);
        io.to(`user:${msg.dm_recipient_id}`).emit('reaction:updated', payload);
      }
    });

    // 9. Typing Indicator
    socket.on('typing:start', (data: { channelId?: string; dmRecipientId?: string; username: string }) => {
      if (data.channelId) {
        socket.to(`channel:${data.channelId}`).emit('typing:status', {
          channelId: data.channelId,
          username: data.username,
          isTyping: true,
        });
      } else if (data.dmRecipientId) {
        socket.to(`user:${data.dmRecipientId}`).emit('typing:status', {
          dmRecipientId: data.dmRecipientId,
          username: data.username,
          isTyping: true,
        });
      }
    });

    socket.on('typing:stop', (data: { channelId?: string; dmRecipientId?: string; username: string }) => {
      if (data.channelId) {
        socket.to(`channel:${data.channelId}`).emit('typing:status', {
          channelId: data.channelId,
          username: data.username,
          isTyping: false,
        });
      } else if (data.dmRecipientId) {
        socket.to(`user:${data.dmRecipientId}`).emit('typing:status', {
          dmRecipientId: data.dmRecipientId,
          username: data.username,
          isTyping: false,
        });
      }
    });

    // 10. Live Draft Mirroring
    socket.on('draft:update', (data: {
      channelId?: string | null;
      dmRecipientId?: string | null;
      text: string;
      cursorPos?: number;
      messageLanguage?: string;
    }) => {
      const user = socket.data.user;
      if (!user) return;
      const sender = dbService.getUserById(user.userId);
      if (!sender) return;

      // Opt-out check: user disabled live typing
      if (sender.share_live_typing === 0) return;

      // Never broadcast slash commands or devbot DMs
      if (!data.text || data.text.startsWith('/') || data.dmRecipientId === 'devbot') {
        clearUserDraft(io, sender.id, data.channelId, data.dmRecipientId);
        return;
      }

      // Limit to 4000 characters
      let text = String(data.text);
      if (text.length > 4000) {
        text = text.slice(0, 4000);
      }

      // Sanitize text (escape HTML to prevent XSS)
      text = sanitizeDraftText(text);

      // Rate limit check (separate counter)
      if (!checkDraftRateLimit(sender.id)) {
        return;
      }

      // Verify chat membership
      if (data.channelId) {
        if (data.channelId !== 'general') {
          const ch = dbService.getChannelById(data.channelId);
          if (!ch) return;
        }
      } else if (data.dmRecipientId) {
        if (data.dmRecipientId === sender.id) return;
        const recipient = dbService.getUserById(data.dmRecipientId);
        if (!recipient) return;
      } else {
        return;
      }

      const draft: ActiveDraft = {
        senderId: sender.id,
        senderUsername: sender.username,
        senderFileIcon: sender.file_icon || 'ts',
        messageLanguage: data.messageLanguage || sender.message_language || 'typescript',
        channelId: data.channelId || null,
        dmRecipientId: data.dmRecipientId || null,
        text,
        cursorPos: typeof data.cursorPos === 'number' ? data.cursorPos : undefined,
        updatedAt: Date.now(),
      };

      const draftKey = data.channelId
        ? `channel:${data.channelId}:${sender.id}`
        : `dm:${sender.id}:${data.dmRecipientId}`;
      activeDrafts.set(draftKey, draft);

      if (data.channelId) {
        socket.to(`channel:${data.channelId}`).emit('draft:update', draft);
      } else if (data.dmRecipientId) {
        io.to(`user:${data.dmRecipientId}`).emit('draft:update', draft);
      }
    });

    socket.on('draft:clear', (data: { channelId?: string | null; dmRecipientId?: string | null }) => {
      const user = socket.data.user;
      if (!user) return;
      clearUserDraft(io, user.userId, data.channelId, data.dmRecipientId);
    });

    // 11. Disconnect
    socket.on('disconnect', () => {
      const user = socket.data.user;
      if (user) {
        clearAllUserDrafts(io, user.userId);
      }
      onlineUsers.delete(socket.id);
      broadcastPresence(io);
    });
  });
}

function saveAndBroadcastMessage(params: {
  io: Server;
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
}): MessageWithReactions {
  // Clear any active draft immediately upon saving/broadcasting real message
  clearUserDraft(params.io, params.senderId, params.channelId, params.dmRecipientId);

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const message = dbService.createMessage({
    id: messageId,
    channelId: params.channelId,
    dmRecipientId: params.dmRecipientId,
    senderId: params.senderId,
    senderUsername: params.senderUsername,
    messageLanguage: params.messageLanguage || null,
    content: params.content,
    attachmentUrl: params.attachmentUrl,
    attachmentType: params.attachmentType,
    attachmentName: params.attachmentName,
    attachmentSize: params.attachmentSize,
  });

  if (params.channelId) {
    params.io.to(`channel:${params.channelId}`).emit('message:new', message);
  } else if (params.dmRecipientId) {
    params.io.to(`user:${params.senderId}`).emit('message:new', message);
    params.io.to(`user:${params.dmRecipientId}`).emit('message:new', message);
  }

  return message;
}

async function handleDevBotResponse(params: {
  io: Server;
  channelId: string | null;
  dmRecipientId: string | null;
  userQuery: string;
  originatingUserId: string;
}) {
  const { io, channelId, dmRecipientId, userQuery, originatingUserId } = params;

  // Retrieve last 15 messages for context
  let history: { senderUsername: string; content: string; isBot?: boolean }[] = [];
  if (channelId) {
    const raw = dbService.getChannelMessages(channelId, 15);
    history = raw.map((m) => ({
      senderUsername: m.sender_username,
      content: m.content,
      isBot: Boolean(m.sender_is_bot),
    }));
  } else if (dmRecipientId) {
    const raw = dbService.getDMMessages(originatingUserId, 'devbot', 15);
    history = raw.map((m) => ({
      senderUsername: m.sender_username,
      content: m.content,
      isBot: Boolean(m.sender_is_bot),
    }));
  }

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

  try {
    await botService.streamReply(userQuery, history, {
      onChunk(chunk) {
        accumulated += chunk;
        io.to(targetRoom).emit('bot:stream_chunk', {
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
        const botSaved = dbService.createMessage({
          id: tempBotMsgId,
          channelId: channelId || null,
          dmRecipientId: channelId ? null : originatingUserId,
          senderId: 'devbot',
          senderUsername: 'devbot',
          content: fullText,
        });

        io.to(targetRoom).emit('bot:stream_done', {
          tempId: tempBotMsgId,
          message: botSaved,
        });
      },
      onError(err) {
        console.error('[Socket] DevBot error:', err);
      },
    });
  } finally {
    io.to(targetRoom).emit('bot:typing', {
      channelId,
      dmRecipientId,
      isTyping: false,
    });
  }
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
