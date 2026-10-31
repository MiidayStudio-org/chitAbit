import React, { useState, useMemo } from 'react';
import {
  Channel,
  User,
  OnlineUser,
  LastMessage,
  ActiveChat,
} from '../../types';
import {
  Search,
  Pin,
  CheckCheck,
  Bot,
  Hash,
  X,
  Sliders,
  UserPlus,
  BellOff,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import { getInitials, formatConversationTime } from '../../utils/chatUtils';

export type ChatsFilterTab = 'all' | 'dms' | 'groups' | 'devbot';

export interface ChatsListProps {
  currentUser: User | null;
  channels: Channel[];
  users: User[];
  onlineUsers: OnlineUser[];
  activeChat: ActiveChat | null;
  unreadCounts: Record<string, number>;
  lastMessages?: Record<string, LastMessage>;
  onSelectChat: (chat: ActiveChat) => void;
  onOpenAddContact: () => void;
  onOpenQuickSwitcher: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const ChatsList: React.FC<ChatsListProps> = ({
  currentUser,
  channels,
  users,
  onlineUsers,
  activeChat,
  unreadCounts,
  lastMessages = {},
  onSelectChat,
  onOpenAddContact,
  onOpenQuickSwitcher,
  isOpenMobile = false,
  onCloseMobile = () => {},
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ChatsFilterTab>('all');
  const [pinnedChatIds, setPinnedChatIds] = useState<Set<string>>(new Set(['devbot', 'general']));
  const [mutedChatIds, setMutedChatIds] = useState<Set<string>>(new Set());
  const [hiddenChatIds, setHiddenChatIds] = useState<Set<string>>(new Set());
  const [actionMenuChatId, setActionMenuChatId] = useState<string | null>(null);

  // Filter out current user from contacts list
  const otherUsers = useMemo(() => {
    return users.filter((u) => u.id !== currentUser?.id);
  }, [users, currentUser?.id]);

  const devbotUser = useMemo(() => {
    return otherUsers.find((u) => u.id === 'devbot');
  }, [otherUsers]);

  const humanUsers = useMemo(() => {
    return otherUsers.filter((u) => u.id !== 'devbot');
  }, [otherUsers]);

  // Online status helper
  const getUserStatus = (u: User): 'Online' | 'Idle' | 'Offline' => {
    if (u.id === 'devbot') return 'Online';
    const found = onlineUsers.find((ou) => ou.id === u.id);
    if (found) {
      return found.status || 'Online';
    }
    return u.status || 'Offline';
  };

  // Build unified thread list
  const threadList = useMemo(() => {
    const list: Array<{
      id: string;
      key: string;
      type: 'channel' | 'dm';
      title: string;
      subtitle: string;
      avatarColor?: string;
      isBot?: boolean;
      status?: 'Online' | 'Idle' | 'Offline';
      timestamp?: number;
      unread: number;
      isPinned: boolean;
      isMuted: boolean;
      lastMsg?: LastMessage;
      rawUser?: User;
      rawChannel?: Channel;
    }> = [];

    // 1. DevBot
    if (devbotUser && !hiddenChatIds.has('devbot')) {
      const dmKey = 'dm_devbot';
      const last = lastMessages[dmKey];
      list.push({
        id: devbotUser.id,
        key: dmKey,
        type: 'dm',
        title: 'DevBot',
        subtitle: last?.content || devbotUser.bio || 'Senior AI Pair Programmer & Debugger',
        avatarColor: '#6366f1',
        isBot: true,
        status: 'Online',
        timestamp: last?.timestamp,
        unread: unreadCounts[dmKey] || 0,
        isPinned: pinnedChatIds.has('devbot'),
        isMuted: mutedChatIds.has('devbot'),
        lastMsg: last,
        rawUser: devbotUser,
      });
    }

    // 2. Channels & Groups
    for (const ch of channels) {
      if (hiddenChatIds.has(ch.id)) continue;
      const chKey = `channel_${ch.id}`;
      const last = lastMessages[chKey];
      list.push({
        id: ch.id,
        key: chKey,
        type: 'channel',
        title: `#${ch.name}`,
        subtitle: last?.content || ch.description || `Welcome to #${ch.name}`,
        avatarColor: '#818cf8',
        timestamp: last?.timestamp || ch.created_at,
        unread: unreadCounts[chKey] || 0,
        isPinned: pinnedChatIds.has(ch.id),
        isMuted: mutedChatIds.has(ch.id),
        lastMsg: last,
        rawChannel: ch,
      });
    }

    // 3. Direct Message Peers
    for (const u of humanUsers) {
      if (hiddenChatIds.has(u.id)) continue;
      const dmKey = `dm_${u.id}`;
      const last = lastMessages[dmKey];
      list.push({
        id: u.id,
        key: dmKey,
        type: 'dm',
        title: u.displayName || u.username,
        subtitle: last?.content || u.bio || `@${u.username}`,
        avatarColor: u.avatarColor,
        isBot: false,
        status: getUserStatus(u),
        timestamp: last?.timestamp,
        unread: unreadCounts[dmKey] || 0,
        isPinned: pinnedChatIds.has(u.id),
        isMuted: mutedChatIds.has(u.id),
        lastMsg: last,
        rawUser: u,
      });
    }

    // Sort: pinned first, then by latest timestamp
    return list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
  }, [devbotUser, channels, humanUsers, lastMessages, unreadCounts, onlineUsers, pinnedChatIds, mutedChatIds, hiddenChatIds]);

  // Filter threads by active tab and search query
  const filteredThreads = useMemo(() => {
    return threadList.filter((item) => {
      // Tab filter
      if (activeTab === 'groups' && item.type !== 'channel') return false;
      if (activeTab === 'dms' && (item.type !== 'dm' || item.isBot)) return false;
      if (activeTab === 'devbot' && !item.isBot) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesSubtitle = item.subtitle.toLowerCase().includes(q);
        return matchesTitle || matchesSubtitle;
      }

      return true;
    });
  }, [threadList, activeTab, searchQuery]);

  // Actions
  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedChatIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setActionMenuChatId(null);
  };

  const toggleMute = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMutedChatIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setActionMenuChatId(null);
  };

  const deleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHiddenChatIds((prev) => new Set(prev).add(id));
    setActionMenuChatId(null);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-[340px] flex-shrink-0 bg-[#161a23] border-r border-zinc-800/80 flex flex-col transition-transform duration-200 ease-in-out select-none ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header: "Chats" title + Search, Add Contact, Settings */}
        <div className="h-14 px-4 bg-[#161a23] border-b border-zinc-800/80 flex items-center justify-between flex-shrink-0">
          <h2 className="text-base font-bold text-zinc-100 font-sans tracking-tight">
            Chats
          </h2>

          <div className="flex items-center gap-1">
            <button
              id="add-contact-btn"
              type="button"
              onClick={onOpenAddContact}
              title="Add Contact / Start DM / Create Group"
              className="p-2 rounded-xl text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800/60 transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
            </button>

            <button
              id="settings-switcher-btn"
              type="button"
              onClick={onOpenQuickSwitcher}
              title="Settings & Switcher (Ctrl+K)"
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors cursor-pointer"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Full-width rounded pill search box */}
        <div className="px-3 pt-3 pb-2 bg-[#161a23]">
          <div className="relative flex items-center bg-[#0f1218] border border-zinc-800 focus-within:border-indigo-500 rounded-full px-3 py-1.5 transition-all">
            <Search className="w-4 h-4 text-zinc-500 flex-shrink-0 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats, contacts, channels"
              className="w-full bg-transparent text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none font-sans"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-0.5 rounded-full text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills: "All", "Friends / DMs", "Groups & Channels", "DevBot" */}
        <div className="px-3 pb-2.5 pt-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'dms', label: 'Friends / DMs' },
              { key: 'groups', label: 'Groups & Channels' },
              { key: 'devbot', label: 'DevBot' },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1 rounded-full text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-950/60 font-semibold'
                    : 'bg-[#0f1218] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-zinc-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Chats List Items */}
        <div className="flex-1 overflow-y-auto px-1.5 py-1 space-y-0.5">
          {filteredThreads.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs font-mono">
              No conversations found
            </div>
          ) : (
            filteredThreads.map((item) => {
              const isSelected = activeChat && activeChat.type === item.type && activeChat.id === item.id;
              const isUserLastSender =
                item.lastMsg && currentUser && item.lastMsg.senderId === currentUser.id;

              const activeChatObj: ActiveChat = {
                type: item.type,
                id: item.id,
                name: item.title,
                displayName: item.rawUser?.displayName || item.title,
                handle: item.rawUser?.username,
                avatarColor: item.avatarColor,
                isBot: item.isBot,
                status: item.status,
                bio: item.rawUser?.bio,
                description: item.rawChannel?.description || undefined,
                roomId:
                  item.type === 'dm' && currentUser
                    ? [currentUser.id, item.id].sort().join('___')
                    : item.id,
              };

              return (
                <div
                  key={item.key}
                  id={`chat-item-${item.type}-${item.id}`}
                  onClick={() => {
                    onSelectChat(activeChatObj);
                    onCloseMobile();
                  }}
                  className={`w-full px-3 py-2.5 rounded-2xl flex items-center gap-3 text-left transition-all relative group cursor-pointer ${
                    isSelected
                      ? 'bg-white/[0.07] border-l-2 border-indigo-500 shadow-sm'
                      : 'hover:bg-white/[0.03] text-zinc-300'
                  }`}
                >
                  {/* Circular Avatar (44px) with Online presence ring */}
                  <div className="relative flex-shrink-0">
                    {item.isBot ? (
                      <div className="w-11 h-11 rounded-full bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400 shadow-sm">
                        <Bot className="w-5 h-5" />
                      </div>
                    ) : item.type === 'channel' ? (
                      <div className="w-11 h-11 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-indigo-400 shadow-inner">
                        <Hash className="w-5 h-5 text-indigo-400" />
                      </div>
                    ) : (
                      <div
                        className="w-11 h-11 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center text-zinc-200 font-mono text-xs font-bold shadow-inner"
                        style={{
                          borderColor: item.avatarColor ? `${item.avatarColor}60` : undefined,
                          color: item.avatarColor || undefined,
                        }}
                      >
                        {getInitials(item.title, item.title)}
                      </div>
                    )}

                    {/* Active Presence Status Dot */}
                    {item.type === 'dm' && (
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#161a23] ${
                          item.status === 'Online'
                            ? 'bg-emerald-500'
                            : item.status === 'Idle'
                            ? 'bg-amber-500'
                            : 'bg-zinc-600'
                        }`}
                      />
                    )}
                  </div>

                  {/* Center & Right Meta */}
                  <div className="flex-1 min-w-0">
                    {/* Title line: Display name + timestamp on far right */}
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className={`font-semibold text-xs tracking-tight truncate ${
                            isSelected ? 'text-zinc-100 font-bold' : 'text-zinc-200'
                          }`}
                        >
                          {item.title}
                        </span>
                        {item.isPinned && (
                          <Pin className="w-3 h-3 text-indigo-400 rotate-45 flex-shrink-0" />
                        )}
                        {item.isMuted && (
                          <BellOff className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                        )}
                      </div>

                      {item.timestamp && (
                        <span className="text-[10px] font-mono text-zinc-500 flex-shrink-0">
                          {formatConversationTime(item.timestamp)}
                        </span>
                      )}
                    </div>

                    {/* Subtitle line: Delivery checkmarks + snippet + unread badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 text-xs text-zinc-400 truncate">
                        {isUserLastSender && (
                          <span className="text-indigo-400 flex-shrink-0">
                            <CheckCheck className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <span className="truncate text-xs font-sans text-zinc-400 group-hover:text-zinc-300">
                          {item.subtitle}
                        </span>
                      </div>

                      {/* Unread badge or hover action menu */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {item.unread > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-indigo-600 text-white shadow-sm shadow-indigo-950/60">
                            {item.unread}
                          </span>
                        )}

                        {/* Hover Quick Action Menu Trigger */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuChatId(actionMenuChatId === item.id ? null : item.id);
                            }}
                            title="Chat options"
                            className="p-1 rounded text-zinc-500 hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {actionMenuChatId === item.id && (
                            <div className="absolute right-0 top-full mt-1 w-36 bg-[#161a23] border border-zinc-800 rounded-2xl shadow-2xl p-1 z-40 text-xs font-mono text-zinc-300">
                              <button
                                type="button"
                                onClick={(e) => togglePin(item.id, e)}
                                className="w-full px-2.5 py-1.5 rounded-xl hover:bg-zinc-800 text-left flex items-center gap-2"
                              >
                                <Pin className="w-3.5 h-3.5 text-indigo-400" />
                                <span>{item.isPinned ? 'Unpin' : 'Pin to top'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => toggleMute(item.id, e)}
                                className="w-full px-2.5 py-1.5 rounded-xl hover:bg-zinc-800 text-left flex items-center gap-2"
                              >
                                <BellOff className="w-3.5 h-3.5 text-amber-400" />
                                <span>{item.isMuted ? 'Unmute' : 'Mute chat'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => deleteConversation(item.id, e)}
                                className="w-full px-2.5 py-1.5 rounded-xl hover:bg-red-950/40 text-red-400 text-left flex items-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hide chat</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
};

export default ChatsList;
