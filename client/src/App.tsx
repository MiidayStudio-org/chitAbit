import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './context/AuthContext';
import { useSocket } from './context/SocketContext';
import { User, Message, LastMessage, ActiveChat, NavigationTab, FriendRequest, OpenTab, LiveDraft, Channel } from './types';
import { CreateChannelModal } from './components/modals/CreateChannelModal';
import { channelToChat } from './utils/chatUtils';
import { ActivityBar } from './components/vscode/ActivityBar';
import { ExplorerSidebar } from './components/vscode/ExplorerSidebar';
import { EditorTabsBar } from './components/vscode/EditorTabsBar';
import { BreadcrumbBar } from './components/vscode/BreadcrumbBar';
import { EditorMessageFeed } from './components/vscode/EditorMessageFeed';
import { EditorInputBar } from './components/vscode/EditorInputBar';
import { StatusBar } from './components/vscode/StatusBar';
import { CommandPalette } from './components/vscode/CommandPalette';
import { SettingsEditor } from './components/vscode/SettingsEditor';
import { AddFriendDialog } from './components/vscode/AddFriendDialog';
import { EditMessageModal } from './components/chat/EditMessageModal';
import { LoginModal } from './components/modals/LoginModal';
import { AlertCircle, Loader2 } from 'lucide-react';
import { applyTheme } from './utils/themeRegistry';

const DEFAULT_TABS: OpenTab[] = [
  {
    id: 'general',
    name: 'general',
    displayName: 'general',
    type: 'channel',
    fileIcon: 'folder',
  },
  {
    id: 'devbot',
    name: 'devbot',
    displayName: 'devbot.ai',
    type: 'dm',
    fileIcon: 'bot',
    isBot: true,
  },
];

export const App: React.FC = () => {
  const { user, isLoading: isAuthLoading, logout, updateProfile } = useAuth();
  const { socket, onlineUsers } = useSocket();

  // Navigation & Theme State
  const [navTab, setNavTab] = useState<NavigationTab>('explorer');
  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(true);
  const [colorTheme, setColorTheme] = useState<string>(() => {
    return localStorage.getItem('chitabit_theme') || 'dark-plus';
  });
  const [customAccentColor, setCustomAccentColor] = useState<string | null>(() => {
    return localStorage.getItem('chitabit_accent') || null;
  });
  const [isLightMode, setIsLightMode] = useState<boolean>(false);

  // Editor Tabs State
  const [openTabs, setOpenTabs] = useState<OpenTab[]>(DEFAULT_TABS);
  const [activeTabId, setActiveTabId] = useState<string | null>('general');
  // Latest open tab id, readable inside callbacks without re-creating them
  const activeTabIdRef = React.useRef<string | null>(activeTabId);
  activeTabIdRef.current = activeTabId;

  // Friends & Social Data
  const [friends, setFriends] = useState<User[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [, setLastMessages] = useState<Record<string, LastMessage>>({});

  // Chat Feed State
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMoreOlderMessages, setHasMoreOlderMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isBotTyping, setIsBotTyping] = useState<boolean>(false);
  const [liveDrafts, setLiveDrafts] = useState<LiveDraft[]>([]);
  const [rateLimitNotice, setRateLimitNotice] = useState<string | null>(null);

  // Modals
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Sync user profile theme preferences
  useEffect(() => {
    if (user?.colorTheme && user.colorTheme !== colorTheme) {
      setColorTheme(user.colorTheme);
    }
    if (user?.customAccentColor !== undefined && user.customAccentColor !== customAccentColor) {
      setCustomAccentColor(user.customAccentColor);
    }
  }, [user?.colorTheme, user?.customAccentColor]);

  // Sync Theme with DOM CSS variables and localStorage
  useEffect(() => {
    const themeDef = applyTheme(colorTheme, customAccentColor);
    localStorage.setItem('chitabit_theme', themeDef.id);
    if (customAccentColor) {
      localStorage.setItem('chitabit_accent', customAccentColor);
    } else {
      localStorage.removeItem('chitabit_accent');
    }
    setIsLightMode(themeDef.type === 'light');
  }, [colorTheme, customAccentColor]);

  const handleSelectTheme = useCallback(
    (themeId: string) => {
      setColorTheme(themeId);
      const themeDef = applyTheme(themeId, customAccentColor);
      localStorage.setItem('chitabit_theme', themeDef.id);
      setIsLightMode(themeDef.type === 'light');
      if (user) {
        updateProfile({ colorTheme: themeDef.id });
      }
    },
    [customAccentColor, user, updateProfile]
  );

  const handlePreviewTheme = useCallback(
    (themeId: string) => {
      applyTheme(themeId, customAccentColor);
    },
    [customAccentColor]
  );

  const handleCancelPreviewTheme = useCallback(() => {
    applyTheme(colorTheme, customAccentColor);
  }, [colorTheme, customAccentColor]);

  const handleSetCustomAccent = useCallback(
    (color: string | null) => {
      setCustomAccentColor(color);
      applyTheme(colorTheme, color);
      if (color) {
        localStorage.setItem('chitabit_accent', color);
      } else {
        localStorage.removeItem('chitabit_accent');
      }
      if (user) {
        updateProfile({ customAccentColor: color });
      }
    },
    [colorTheme, user, updateProfile]
  );

  const toggleTheme = useCallback(() => {
    const nextTheme = colorTheme === 'light-plus' ? 'dark-plus' : 'light-plus';
    handleSelectTheme(nextTheme);
  }, [colorTheme, handleSelectTheme]);

  // Compute Active Chat from activeTabId
  const activeTab = useMemo(() => {
    return openTabs.find((t) => t.id === activeTabId) || null;
  }, [openTabs, activeTabId]);

  const activeChat: ActiveChat | null = useMemo(() => {
    if (!activeTab || activeTab.type === 'settings') return null;
    return {
      type: activeTab.type,
      id: activeTab.id,
      name: activeTab.name,
      displayName: activeTab.displayName,
      fileIcon: activeTab.fileIcon,
      isBot: activeTab.isBot,
    };
  }, [activeTab]);

  // Total unreads
  const totalUnreads = useMemo(() => {
    return Object.values(unreadCounts).reduce((acc, count) => acc + count, 0);
  }, [unreadCounts]);

  // Fetch real friends from database
  const fetchFriends = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/friends?userId=${user.id}`);
      const data = await res.json();
      if (data.friends) setFriends(data.friends);
    } catch (err) {
      console.error('Failed to load friends:', err);
    }
  }, [user]);

  // Fetch pending friend requests
  const fetchFriendRequests = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/friends/requests?userId=${user.id}`);
      const data = await res.json();
      if (data.incoming) setFriendRequests(data.incoming);
    } catch (err) {
      console.error('Failed to load friend requests:', err);
    }
  }, [user]);

  // Fetch all channels (6 defaults + custom ones)
  const fetchChannels = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/channels');
      const data = await res.json();
      if (Array.isArray(data.channels)) setChannels(data.channels);
    } catch (err) {
      console.error('Failed to load channels:', err);
    }
  }, [user]);

  // Unread counts are stored on the server, so badges survive a refresh.
  // The chat that is open right now is never shown as unread.
  const fetchUnreadCounts = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/messages/unread');
      const data = await res.json();
      if (data.unreadCounts) {
        const counts: Record<string, number> = { ...data.unreadCounts };
        if (activeTabIdRef.current) delete counts[activeTabIdRef.current];
        setUnreadCounts(counts);
      }
    } catch (err) {
      console.error('Failed to load unread counts:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchFriends();
      fetchFriendRequests();
      fetchChannels();
      fetchUnreadCounts();
    }
  }, [user, fetchFriends, fetchFriendRequests, fetchChannels, fetchUnreadCounts]);

  // After a reconnect we may have missed messages: resync channels and badges
  useEffect(() => {
    if (!socket) return;
    const resync = () => {
      fetchChannels();
      fetchUnreadCounts();
    };
    socket.on('connect', resync);
    return () => {
      socket.off('connect', resync);
    };
  }, [socket, fetchChannels, fetchUnreadCounts]);

  // Create a channel on the server, then open it
  const handleCreateChannel = useCallback(
    async (name: string, description: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/channels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description }),
        });
        const data = await res.json();
        if (!res.ok) return { success: false, error: data.error || 'Failed to create channel' };

        const channel: Channel = data.channel;
        setChannels((prev) => (prev.some((c) => c.id === channel.id) ? prev : [...prev, channel]));
        handleSelectChat(channelToChat(channel));
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Network error' };
      }
    },
    // handleSelectChat is declared below; it is only called later, when the user submits
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Tab management handlers
  const handleSelectChat = useCallback((chat: ActiveChat) => {
    setOpenTabs((prev) => {
      const exists = prev.find((t) => t.id === chat.id);
      if (exists) return prev;
      const newTab: OpenTab = {
        id: chat.id,
        name: chat.name,
        displayName: chat.displayName || chat.name,
        type: chat.type,
        fileIcon: chat.fileIcon,
        isBot: chat.isBot,
      };
      return [...prev, newTab];
    });
    setActiveTabId(chat.id);
  }, []);

  const handleOpenSettingsTab = useCallback(() => {
    setOpenTabs((prev) => {
      const exists = prev.find((t) => t.id === 'settings');
      if (exists) return prev;
      const settingsTab: OpenTab = {
        id: 'settings',
        name: 'settings',
        displayName: 'Settings',
        type: 'settings',
        fileIcon: 'json',
      };
      return [...prev, settingsTab];
    });
    setActiveTabId('settings');
  }, []);

  const handleCloseTab = useCallback((tabId: string) => {
    setOpenTabs((prev) => {
      const index = prev.findIndex((t) => t.id === tabId);
      if (index === -1) return prev;
      const nextTabs = prev.filter((t) => t.id !== tabId);

      // If closing active tab, switch to adjacent tab
      if (activeTabId === tabId) {
        if (nextTabs.length > 0) {
          const nextActive = nextTabs[Math.max(0, index - 1)];
          setActiveTabId(nextActive.id);
        } else {
          setActiveTabId(null);
        }
      }
      return nextTabs;
    });
  }, [activeTabId]);

  const handleNextTab = useCallback(() => {
    setOpenTabs((prev) => {
      if (prev.length <= 1) return prev;
      const currentIndex = prev.findIndex((t) => t.id === activeTabId);
      const nextIndex = (currentIndex + 1) % prev.length;
      setActiveTabId(prev[nextIndex].id);
      return prev;
    });
  }, [activeTabId]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Toggle Side Bar: Ctrl+B
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarVisible((prev) => !prev);
        return;
      }

      // 2. Close Active Tab: Ctrl+W
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (activeTabId) {
          handleCloseTab(activeTabId);
        }
        return;
      }

      // 3. Next Tab: Ctrl+Tab
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        handleNextTab();
        return;
      }

      // 4. Command Palette: Ctrl+Shift+P, Ctrl+P, Ctrl+K
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')
      ) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // 5. Esc closes modal or palette
      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) setIsCommandPaletteOpen(false);
        if (isAddFriendOpen) setIsAddFriendOpen(false);
        if (replyingTo) setReplyingTo(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, handleCloseTab, handleNextTab, isCommandPaletteOpen, isAddFriendOpen, replyingTo]);

  // Fetch messages when activeChat changes
  const fetchMessages = useCallback(async () => {
    if (!user || !activeChat) {
      setMessages([]);
      return;
    }

    try {
      if (activeChat.type === 'channel') {
        const res = await fetch(`/api/channels/${activeChat.id}/messages?limit=40`);
        const data = await res.json();
        const msgList = data.messages || [];
        setMessages(msgList);
        setHasMoreOlderMessages(msgList.length >= 40);
        setUnreadCounts((prev) => ({ ...prev, [activeChat.id]: 0 }));

        if (msgList.length > 0) {
          const latest = msgList[msgList.length - 1];
          setLastMessages((prev) => ({
            ...prev,
            [`channel_${activeChat.id}`]: {
              content: latest.content,
              timestamp: latest.created_at,
              senderId: latest.sender_id,
              senderUsername: latest.sender_username,
            },
          }));
        }
      } else if (activeChat.type === 'dm') {
        const res = await fetch(`/api/messages/dm/${user.id}/${activeChat.id}?limit=40`);
        const data = await res.json();
        const msgList = data.messages || [];
        setMessages(msgList);
        setHasMoreOlderMessages(msgList.length >= 40);
        setUnreadCounts((prev) => ({ ...prev, [activeChat.id]: 0 }));

        if (msgList.length > 0) {
          const latest = msgList[msgList.length - 1];
          setLastMessages((prev) => ({
            ...prev,
            [`dm_${activeChat.id}`]: {
              content: latest.content,
              timestamp: latest.created_at,
              senderId: latest.sender_id,
              senderUsername: latest.sender_username,
            },
          }));
        }

        // Mark this DM as read on the server (DevBot too, so its unread badge clears)
        if (socket) {
          socket.emit('message:read', {
            dmSenderId: activeChat.id,
            currentUserId: user.id,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }, [user, activeChat, socket]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Tell the server which chat is open (live drafts, and unread tracking:
  // messages in the open chat are not counted as unread)
  const announceOpenChat = useCallback(() => {
    if (!socket || !user || !activeChat) return;
    if (activeChat.type === 'channel') {
      socket.emit('channel:switch', { channelId: activeChat.id });
    } else if (activeChat.type === 'dm') {
      // Also for DevBot, so the server knows we left the channel
      socket.emit('dm:switch', { recipientId: activeChat.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, user, activeChat?.type, activeChat?.id]);

  useEffect(() => {
    announceOpenChat();
  }, [announceOpenChat]);

  // After a (re)connect the server starts fresh at #general: re-send the open chat.
  // SocketContext's own 'connect' handler (user:join) runs first.
  useEffect(() => {
    if (!socket) return;
    socket.on('connect', announceOpenChat);
    return () => {
      socket.off('connect', announceOpenChat);
    };
  }, [socket, announceOpenChat]);

  // Load older messages (infinite scroll upward)
  const handleLoadOlderMessages = async () => {
    if (!user || !activeChat || messages.length === 0) return;
    const oldestTimestamp = messages[0].created_at;

    try {
      let url = '';
      if (activeChat.type === 'channel') {
        url = `/api/channels/${activeChat.id}/messages?limit=30&before=${oldestTimestamp}`;
      } else {
        url = `/api/messages/dm/${user.id}/${activeChat.id}?limit=30&before=${oldestTimestamp}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      const older = data.messages || [];

      if (older.length > 0) {
        setMessages((prev) => [...older, ...prev]);
        setHasMoreOlderMessages(older.length >= 30);
      } else {
        setHasMoreOlderMessages(false);
      }
    } catch (err) {
      console.error('Failed to load older messages:', err);
    }
  };

  // Socket Event Handlers
  useEffect(() => {
    if (!socket || !user) return;

    // 1. `user:join` is sent once per connection by SocketContext. It must not be
    //    re-sent on every chat change: it used to reset the server's idea of which
    //    chat is open to #general, which broke unread tracking while in a DM.

    // 2. Incoming New Message
    const handleNewMessage = (msg: Message) => {
      // Immediately remove any active live draft from sender to prevent duplicates/flicker
      setLiveDrafts((prev) =>
        prev.filter((d) => {
          if (d.senderId !== msg.sender_id) return true;
          if (msg.channel_id && d.channelId === msg.channel_id) return false;
          if (
            msg.dm_recipient_id &&
            (d.dmRecipientId === msg.dm_recipient_id || d.dmRecipientId === user.id)
          )
            return false;
          return false;
        })
      );
      setTypingUsers((prev) => prev.filter((u) => u !== msg.sender_username));

      const isForCurrentChannel =
        activeChat?.type === 'channel' && msg.channel_id === activeChat.id;
      const isForCurrentDM =
        activeChat?.type === 'dm' &&
        (msg.sender_id === activeChat.id ||
          (msg.sender_id === user.id && msg.dm_recipient_id === activeChat.id));

      if (isForCurrentChannel || isForCurrentDM) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        // Mark read immediately if viewing this DM
        if (activeChat?.type === 'dm' && msg.sender_id === activeChat.id) {
          socket.emit('message:read', {
            dmSenderId: activeChat.id,
            currentUserId: user.id,
          });
        }
      } else {
        // Increment unread count
        const key = msg.channel_id || msg.sender_id;
        if (msg.sender_id !== user.id) {
          setUnreadCounts((prev) => ({
            ...prev,
            [key]: (prev[key] || 0) + 1,
          }));
        }
      }

      // Update last message preview
      const threadKey = msg.channel_id
        ? `channel_${msg.channel_id}`
        : `dm_${msg.sender_id === user.id ? msg.dm_recipient_id : msg.sender_id}`;

      setLastMessages((prev) => ({
        ...prev,
        [threadKey]: {
          content: msg.content,
          timestamp: msg.created_at,
          senderId: msg.sender_id,
          senderUsername: msg.sender_username,
        },
      }));
    };

    // 3. Read receipt received from peer
    const handleReadReceipt = (data: { readerId: string; readAt: number }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.sender_id === user.id && (!m.read_at || m.read_at < data.readAt)
            ? { ...m, read_at: data.readAt }
            : m
        )
      );
    };

    // 4. DevBot stream chunks
    const handleBotChunk = (data: {
      tempId: string;
      chunk: string;
      accumulated: string;
      channelId?: string | null;
      dmRecipientId?: string | null;
      senderId: string;
      senderUsername: string;
      senderDisplayName: string;
      senderAvatarColor: string;
      senderFileIcon?: string;
    }) => {
      const isRelevant =
        (activeChat?.type === 'channel' && data.channelId === activeChat.id) ||
        (activeChat?.type === 'dm' && activeChat.id === 'devbot');

      if (isRelevant) {
        setMessages((prev) => {
          const index = prev.findIndex((m) => m.id === data.tempId);
          if (index !== -1) {
            const next = [...prev];
            next[index] = {
              ...next[index],
              content: data.accumulated,
              isStreaming: true,
            };
            return next;
          } else {
            const botMessage: Message = {
              id: data.tempId,
              channel_id: data.channelId || null,
              dm_recipient_id: data.dmRecipientId || null,
              sender_id: data.senderId,
              sender_username: data.senderUsername,
              sender_display_name: data.senderDisplayName,
              sender_avatar_color: data.senderAvatarColor,
              sender_file_icon: data.senderFileIcon || 'bot',
              sender_is_bot: true,
              content: data.accumulated,
              edited_at: null,
              deleted_at: null,
              created_at: Date.now(),
              reactions: [],
              isStreaming: true,
            };
            return [...prev, botMessage];
          }
        });
      }
    };

    // 5. DevBot stream done
    const handleBotDone = (data: { tempId: string; message: Message }) => {
      setMessages((prev) => {
        const index = prev.findIndex((m) => m.id === data.tempId);
        if (index !== -1) {
          const next = [...prev];
          next[index] = { ...data.message, isStreaming: false };
          return next;
        }
        return [...prev, { ...data.message, isStreaming: false }];
      });
      setIsBotTyping(false);
    };

    // 6. Bot typing indicator
    const handleBotTyping = (data: { channelId?: string; dmRecipientId?: string; isTyping: boolean }) => {
      const isRelevant =
        (activeChat?.type === 'channel' && data.channelId === activeChat.id) ||
        (activeChat?.type === 'dm' && activeChat.id === 'devbot');
      if (isRelevant) {
        setIsBotTyping(data.isTyping);
      }
    };

    // 7. Message Edited
    const handleMessageEdited = (updatedMsg: Message) => {
      setMessages((prev) => prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)));
    };

    // 8. Message Deleted
    const handleMessageDeleted = (data: { id: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== data.id));
    };

    // 9. Reaction Updated
    const handleReactionUpdated = (data: { messageId: string; reactions: any[] }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m))
      );
    };

    // 10. Typing Status
    const handleTypingStatus = (data: { channelId?: string; dmRecipientId?: string; username: string; isTyping: boolean }) => {
      const isRelevant =
        (activeChat?.type === 'channel' && data.channelId === activeChat.id) ||
        (activeChat?.type === 'dm' && activeChat.id !== 'devbot');

      if (isRelevant && data.username !== user.username) {
        if (data.isTyping) {
          setTypingUsers((prev) => (prev.includes(data.username) ? prev : [...prev, data.username]));
        } else {
          setTypingUsers((prev) => prev.filter((u) => u !== data.username));
        }
      }
    };

    // 11. Rate limit notice
    const handleRateLimit = (data: { message: string }) => {
      setRateLimitNotice(data.message);
      setTimeout(() => setRateLimitNotice(null), 4000);
    };

    // 11b. Server rejected something (unknown channel, message too long, ...): show it
    const handleServerError = (data: { message?: string }) => {
      handleRateLimit({ message: data?.message || 'Something went wrong' });
    };

    // 11c. `/clear` only clears this user's screen
    const handleChatClear = () => {
      setMessages([]);
      setHasMoreOlderMessages(false);
    };

    // 11d. Someone created a channel: add it to the sidebar
    const handleChannelCreated = (channel: Channel) => {
      setChannels((prev) => (prev.some((c) => c.id === channel.id) ? prev : [...prev, channel]));
    };

    // 12. Real-time friend alerts
    const handleFriendRequestReceived = () => {
      fetchFriendRequests();
    };

    const handleFriendRequestAccepted = () => {
      fetchFriends();
      fetchFriendRequests();
    };

    // 13. Live Draft update
    const handleDraftUpdate = (draft: LiveDraft) => {
      if (draft.senderId === user.id) return;
      setLiveDrafts((prev) => {
        const index = prev.findIndex(
          (d) =>
            d.senderId === draft.senderId &&
            d.channelId === draft.channelId &&
            d.dmRecipientId === draft.dmRecipientId
        );
        if (index !== -1) {
          const next = [...prev];
          next[index] = draft;
          return next;
        }
        return [...prev, draft];
      });
    };

    // 14. Live Draft cleared
    const handleDraftCleared = (data: {
      senderId: string;
      channelId?: string | null;
      dmRecipientId?: string | null;
    }) => {
      setLiveDrafts((prev) =>
        prev.filter((d) => {
          if (d.senderId !== data.senderId) return true;
          if (data.channelId && d.channelId === data.channelId) return false;
          if (data.dmRecipientId && d.dmRecipientId === data.dmRecipientId) return false;
          if (!data.channelId && !data.dmRecipientId) return false;
          return true;
        })
      );
    };

    // 15. Live Draft sync on join/switch
    const handleDraftSync = (data: { drafts: LiveDraft[] }) => {
      if (!data?.drafts) return;
      setLiveDrafts((prev) => {
        const incomingKeys = new Set(
          data.drafts.map(
            (d) => `${d.senderId}:${d.channelId || ''}:${d.dmRecipientId || ''}`
          )
        );
        const remaining = prev.filter(
          (d) =>
            !incomingKeys.has(
              `${d.senderId}:${d.channelId || ''}:${d.dmRecipientId || ''}`
            )
        );
        return [...remaining, ...data.drafts];
      });
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:read_receipt', handleReadReceipt);
    socket.on('bot:stream:chunk', handleBotChunk);
    socket.on('bot:stream:end', handleBotDone);
    socket.on('bot:typing', handleBotTyping);
    socket.on('message:edited', handleMessageEdited);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('reaction:updated', handleReactionUpdated);
    socket.on('typing:status', handleTypingStatus);
    socket.on('draft:update', handleDraftUpdate);
    socket.on('draft:cleared', handleDraftCleared);
    socket.on('draft:sync', handleDraftSync);
    socket.on('message:rate_limit', handleRateLimit);
    socket.on('friend_request:received', handleFriendRequestReceived);
    socket.on('friend_request:accepted', handleFriendRequestAccepted);
    socket.on('error', handleServerError);
    socket.on('chat:clear', handleChatClear);
    socket.on('channel:created', handleChannelCreated);

    return () => {
      socket.off('error', handleServerError);
      socket.off('chat:clear', handleChatClear);
      socket.off('channel:created', handleChannelCreated);
      socket.off('message:new', handleNewMessage);
      socket.off('message:read_receipt', handleReadReceipt);
      socket.off('bot:stream:chunk', handleBotChunk);
      socket.off('bot:stream:end', handleBotDone);
      socket.off('bot:typing', handleBotTyping);
      socket.off('message:edited', handleMessageEdited);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('reaction:updated', handleReactionUpdated);
      socket.off('typing:status', handleTypingStatus);
      socket.off('draft:update', handleDraftUpdate);
      socket.off('draft:cleared', handleDraftCleared);
      socket.off('draft:sync', handleDraftSync);
      socket.off('message:rate_limit', handleRateLimit);
      socket.off('friend_request:received', handleFriendRequestReceived);
      socket.off('friend_request:accepted', handleFriendRequestAccepted);
    };
  }, [socket, user, activeChat, fetchFriendRequests, fetchFriends]);

  // Friend actions
  const handleRespondFriendRequest = async (requestId: string, action: 'accept' | 'decline') => {
    if (!user) return;
    try {
      const res = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, receiverId: user.id, action }),
      });
      if (res.ok) {
        await fetchFriendRequests();
        await fetchFriends();
      }
    } catch (err) {
      console.error('Failed to respond to friend request:', err);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/friends/${friendId}?userId=${user.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchFriends();
        handleCloseTab(friendId);
      }
    } catch (err) {
      console.error('Failed to remove friend:', err);
    }
  };

  // Message sending
  const handleSendMessage = (
    content: string,
    attachment?: { url: string; type: string; name: string; size: number }
  ) => {
    if (!socket || !user || !activeChat) return;

    socket.emit('message:send', {
      channelId: activeChat.type === 'channel' ? activeChat.id : null,
      dmRecipientId: activeChat.type === 'dm' ? activeChat.id : null,
      content,
      senderId: user.id,
      senderUsername: user.username,
      senderFileIcon: user.fileIcon || 'ts',
      messageLanguage: user.messageLanguage || 'typescript',
      attachmentUrl: attachment?.url || null,
      attachmentType: attachment?.type || null,
      attachmentName: attachment?.name || null,
      attachmentSize: attachment?.size || null,
    });
  };

  const handleTyping = (isTyping: boolean) => {
    if (!socket || !user || !activeChat) return;
    const event = isTyping ? 'typing:start' : 'typing:stop';
    socket.emit(event, {
      channelId: activeChat.type === 'channel' ? activeChat.id : undefined,
      dmRecipientId: activeChat.type === 'dm' ? activeChat.id : undefined,
      username: user.username,
    });
  };

  const handleUpdateDraft = useCallback(
    (text: string, cursorPos?: number) => {
      if (!socket || !user || !activeChat) return;
      if (user.shareLiveTyping === false) return;
      if (activeChat.id === 'devbot' || activeChat.isBot) return;
      if (text.startsWith('/')) {
        socket.emit('draft:clear', {
          channelId: activeChat.type === 'channel' ? activeChat.id : null,
          dmRecipientId: activeChat.type === 'dm' ? activeChat.id : null,
        });
        return;
      }

      socket.emit('draft:update', {
        channelId: activeChat.type === 'channel' ? activeChat.id : null,
        dmRecipientId: activeChat.type === 'dm' ? activeChat.id : null,
        text,
        cursorPos,
        messageLanguage: user.messageLanguage || 'typescript',
      });
    },
    [socket, user, activeChat]
  );

  const handleClearDraft = useCallback(() => {
    if (!socket || !activeChat) return;
    socket.emit('draft:clear', {
      channelId: activeChat.type === 'channel' ? activeChat.id : null,
      dmRecipientId: activeChat.type === 'dm' ? activeChat.id : null,
    });
  }, [socket, activeChat]);

  // Compute live typing indicators for Explorer Sidebar
  const { typingUserIdsSet, typingChannelIdsSet } = useMemo(() => {
    const ids = new Set<string>();
    const channelIds = new Set<string>(); // channels where someone is typing

    // Normal typing indicator users
    for (const u of typingUsers) {
      ids.add(u);
      const friend = friends.find((f) => f.username === u);
      if (friend) ids.add(friend.id);
      if (activeChat?.type === 'channel') {
        channelIds.add(activeChat.id);
      }
    }

    // Live draft typers
    for (const d of liveDrafts) {
      if (d.senderId === user?.id) continue;
      if (!d.text || d.text.length === 0) continue;
      if (d.channelId) channelIds.add(d.channelId);
      ids.add(d.senderId);
      ids.add(d.senderUsername);
    }

    return { typingUserIdsSet: ids, typingChannelIdsSet: channelIds };
  }, [typingUsers, friends, activeChat, liveDrafts, user?.id]);

  const handleEditMessage = (messageId: string, content: string) => {
    if (!socket || !user) return;
    socket.emit('message:edit', {
      messageId,
      senderId: user.id,
      content,
    });
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!socket || !user) return;
    if (confirm('Delete this message for everyone?')) {
      socket.emit('message:delete', {
        messageId,
        senderId: user.id,
      });
    }
  };

  const handleToggleReaction = (messageId: string, emoji: string) => {
    if (!socket || !user) return;
    socket.emit('reaction:toggle', {
      messageId,
      userId: user.id,
      emoji,
    });
  };

  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1e1e1e] text-[#cccccc] font-mono">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-[#007acc]" />
          <span className="text-xs">Loading chitAbit workspace...</span>
        </div>
      </div>
    );
  }

  // Not logged in: Show LoginModal
  if (!user) {
    return <LoginModal />;
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg)] text-[var(--text)] font-sans antialiased select-none">
      {/* 1. Main Workbench (Activity Bar + Sidebar + Editor Main) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Activity Bar (48px narrow left icon rail) */}
        <ActivityBar
          activeTab={navTab}
          onSelectTab={(tab) => {
            if (tab === 'settings') {
              handleOpenSettingsTab();
            } else {
              setNavTab(tab);
              setIsSidebarVisible(true);
            }
          }}
          currentUser={user}
          unreadCount={totalUnreads}
          friendRequestsCount={friendRequests.length}
          onOpenSettingsTab={handleOpenSettingsTab}
        />

        {/* Primary Side Bar (Explorer / Friends / Search) */}
        {isSidebarVisible && (
          <ExplorerSidebar
            activeTab={navTab}
            currentUser={user}
            friends={friends}
            friendRequests={friendRequests}
            onlineUsers={onlineUsers}
            activeChat={activeChat}
            unreadCounts={unreadCounts}
            typingUserIds={typingUserIdsSet}
            channels={channels}
            typingChannelIds={typingChannelIdsSet}
            onCreateChannel={() => setIsCreateChannelOpen(true)}
            isBotTyping={isBotTyping}
            onSelectChat={handleSelectChat}
            onOpenAddFriend={() => setIsAddFriendOpen(true)}
            onRespondFriendRequest={handleRespondFriendRequest}
            onRemoveFriend={handleRemoveFriend}
          />
        )}

        {/* Editor Main Canvas */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg)] relative">
          {/* Rate limit warning banner */}
          {rateLimitNotice && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-slate-950 font-semibold px-4 py-1.5 rounded shadow-xl flex items-center gap-2 text-xs font-mono animate-bounce">
              <AlertCircle className="w-4 h-4" />
              <span>{rateLimitNotice}</span>
            </div>
          )}

          {/* Editor Tabs Bar */}
          <EditorTabsBar
            tabs={openTabs}
            activeTabId={activeTabId}
            unreadCounts={unreadCounts}
            onSelectTab={(id) => setActiveTabId(id)}
            onCloseTab={handleCloseTab}
          />

          {/* Breadcrumb Bar */}
          <BreadcrumbBar activeChat={activeChat} />

          {/* Active Tab View */}
          <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            {activeTab?.type === 'settings' ? (
              <SettingsEditor
                currentUser={user}
                onUpdateProfile={updateProfile}
                currentColorTheme={colorTheme}
                onSelectTheme={handleSelectTheme}
                customAccentColor={customAccentColor}
                onSetCustomAccent={handleSetCustomAccent}
                onLogout={logout}
              />
            ) : activeChat ? (
              <>
                <EditorMessageFeed
                  activeChat={activeChat}
                  messages={messages}
                  currentUser={user}
                  typingUsers={typingUsers}
                  isBotTyping={isBotTyping}
                  isLightMode={isLightMode}
                  colorTheme={colorTheme}
                  highlightAllMessages={user.highlightAllMessages !== false}
                  liveDrafts={liveDrafts}
                  shareLiveTyping={user.shareLiveTyping !== false}
                  onEdit={(id, content) => setEditingMessage({ id, content })}
                  onDelete={handleDeleteMessage}
                  onToggleReaction={handleToggleReaction}
                  onAskBot={(prompt) => handleSendMessage(`/ask ${prompt}`)}
                  onReply={(msg) => setReplyingTo(msg)}
                  onLoadOlderMessages={handleLoadOlderMessages}
                  hasMoreOlderMessages={hasMoreOlderMessages}
                />

                <EditorInputBar
                  onSendMessage={handleSendMessage}
                  onTyping={handleTyping}
                  onUpdateDraft={handleUpdateDraft}
                  onClearDraft={handleClearDraft}
                  shareLiveTyping={user.shareLiveTyping !== false}
                  targetId={activeChat.id}
                  targetName={activeChat.displayName || activeChat.name}
                  replyingTo={replyingTo}
                  onCancelReply={() => setReplyingTo(null)}
                  socketConnected={Boolean(socket?.connected)}
                />
              </>
            ) : (
              /* Empty Editor Watermark Screen */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none text-[#858585] font-mono">
                <div className="max-w-md space-y-4">
                  <div className="text-4xl opacity-20 font-bold tracking-tight text-white light-plus:text-black">
                    chitAbit
                  </div>
                  <p className="text-xs text-[#858585]">
                    Developer chat inside the VS Code editor workbench
                  </p>
                  <div className="text-xs space-y-2 text-left border border-[#3c3c3c] light-plus:border-[#e7e7e7] p-3 rounded bg-[#252526] light-plus:bg-[#f8f8f8]">
                    <div className="flex justify-between items-center">
                      <span>Quick Open Chat</span>
                      <kbd className="bg-[#3c3c3c] light-plus:bg-white text-white light-plus:text-black px-1.5 py-0.5 rounded text-[10px]">
                        Ctrl+P
                      </kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Show All Commands</span>
                      <kbd className="bg-[#3c3c3c] light-plus:bg-white text-white light-plus:text-black px-1.5 py-0.5 rounded text-[10px]">
                        Ctrl+Shift+P
                      </kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Toggle Primary Side Bar</span>
                      <kbd className="bg-[#3c3c3c] light-plus:bg-white text-white light-plus:text-black px-1.5 py-0.5 rounded text-[10px]">
                        Ctrl+B
                      </kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Next Open Tab</span>
                      <kbd className="bg-[#3c3c3c] light-plus:bg-white text-white light-plus:text-black px-1.5 py-0.5 rounded text-[10px]">
                        Ctrl+Tab
                      </kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Close Active Tab</span>
                      <kbd className="bg-[#3c3c3c] light-plus:bg-white text-white light-plus:text-black px-1.5 py-0.5 rounded text-[10px]">
                        Ctrl+W
                      </kbd>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectChat({
                          type: 'channel',
                          id: 'general',
                          name: 'general',
                          displayName: 'general',
                          fileIcon: 'folder',
                        })
                      }
                      className="px-3 py-1.5 bg-[#007acc] hover:bg-[#0062a3] text-white text-xs rounded font-semibold cursor-pointer transition-colors"
                    >
                      Open #general
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectChat({
                          type: 'dm',
                          id: 'devbot',
                          name: 'devbot',
                          displayName: 'devbot.ai',
                          fileIcon: 'bot',
                          isBot: true,
                        })
                      }
                      className="px-3 py-1.5 bg-[#252526] light-plus:bg-[#f0f0f0] border border-[#3c3c3c] light-plus:border-[#e7e7e7] hover:border-[#007acc] text-[#cccccc] light-plus:text-[#333333] text-xs rounded font-semibold cursor-pointer transition-colors"
                    >
                      Open DevBot
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. VS Code Status Bar (22px Blue Bar #007ACC) */}
      <StatusBar
        socketConnected={Boolean(socket?.connected)}
        currentUser={user}
        activeChat={activeChat}
        onlineCount={onlineUsers.length}
        isBotTyping={isBotTyping}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onToggleTheme={toggleTheme}
        isLightMode={isLightMode}
        currentColorTheme={colorTheme}
      />

      {/* 3. Command Palette Dialog (Ctrl+Shift+P / Ctrl+P) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        friends={friends}
        channels={channels}
        onCreateChannel={() => setIsCreateChannelOpen(true)}
        onSelectChat={handleSelectChat}
        onToggleTheme={toggleTheme}
        onOpenAddFriend={() => setIsAddFriendOpen(true)}
        onOpenSettings={handleOpenSettingsTab}
        onToggleSidebar={() => setIsSidebarVisible((prev) => !prev)}
        onCloseActiveTab={() => activeTabId && handleCloseTab(activeTabId)}
        onLogout={logout}
        isLightMode={isLightMode}
        currentColorTheme={colorTheme}
        onSelectColorTheme={handleSelectTheme}
        onPreviewColorTheme={handlePreviewTheme}
        onCancelPreviewColorTheme={handleCancelPreviewTheme}
      />

      {/* 4. Add Friend Dialog */}
      <AddFriendDialog
        isOpen={isAddFriendOpen}
        onClose={() => setIsAddFriendOpen(false)}
        currentUserId={user.id}
        onFriendAdded={() => {
          fetchFriends();
          fetchFriendRequests();
        }}
      />

      {/* 4b. Create Channel Dialog */}
      <CreateChannelModal
        isOpen={isCreateChannelOpen}
        onClose={() => setIsCreateChannelOpen(false)}
        onCreateChannel={handleCreateChannel}
      />

      {/* 5. Edit Message Modal */}
      {editingMessage && (
        <EditMessageModal
          isOpen={Boolean(editingMessage)}
          messageId={editingMessage.id}
          initialContent={editingMessage.content}
          onSave={handleEditMessage}
          onClose={() => setEditingMessage(null)}
        />
      )}
    </div>
  );
};

export default App;
