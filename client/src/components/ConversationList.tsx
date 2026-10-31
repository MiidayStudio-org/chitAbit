import React, { useState, useMemo } from 'react';
import {
  Channel,
  User,
  OnlineUser,
  LastMessage,
} from '../types';
import {
  Search,
  Pin,
  CheckCheck,
  Bot,
  Hash,
  X,
  Sliders,
  UserPlus,
} from 'lucide-react';
import { getInitials, formatConversationTime } from '../utils/chatUtils';

export type FilterTab = 'all' | 'dms' | 'channels' | 'devbot';

export interface ConversationListProps {
  currentUser: User | null;
  channels: Channel[];
  users: User[];
  onlineUsers: OnlineUser[];
  activeChannelId: string | null;
  activeDMUserId: string | null;
  unreadCounts: Record<string, number>;
  lastMessages?: Record<string, LastMessage>;
  onSelectChannel: (channelId: string) => void;
  onSelectDM: (userId: string) => void;
  onOpenCreateChannel: () => void;
  onOpenAddFriend: () => void;
  onOpenQuickSwitcher: () => void;
  onLogout?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  currentUser,
  channels,
  users,
  onlineUsers,
  activeChannelId,
  activeDMUserId,
  unreadCounts,
  lastMessages = {},
  onSelectChannel,
  onSelectDM,
  onOpenCreateChannel: _onOpenCreateChannel,
  onOpenAddFriend,
  onOpenQuickSwitcher,
  onLogout: _onLogout,
  isOpenMobile = false,
  onCloseMobile = () => {},
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [showSearchBar, setShowSearchBar] = useState(true);

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

  // Build unified conversation list
  const conversationList = useMemo(() => {
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
      lastMsg?: LastMessage;
      rawUser?: User;
      rawChannel?: Channel;
    }> = [];

    // 1. DevBot (Pinned by default)
    if (devbotUser) {
      const dmKey = 'dm_devbot';
      const last = lastMessages[dmKey];
      list.push({
        id: devbotUser.id,
        key: dmKey,
        type: 'dm',
        title: 'DevBot',
        subtitle: last?.content || 'Senior AI Pair Programmer & Debugger',
        avatarColor: '#6366f1',
        isBot: true,
        status: 'Online',
        timestamp: last?.timestamp,
        unread: unreadCounts[dmKey] || 0,
        isPinned: true,
        lastMsg: last,
        rawUser: devbotUser,
      });
    }

    // 2. Channels
    for (const ch of channels) {
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
        isPinned: ch.id === 'general',
        lastMsg: last,
        rawChannel: ch,
      });
    }

    // 3. Human DMs
    for (const u of humanUsers) {
      const dmKey = `dm_${u.id}`;
      const last = lastMessages[dmKey];
      list.push({
        id: u.id,
        key: dmKey,
        type: 'dm',
        title: u.displayName || u.username,
        subtitle: last?.content || `@${u.username}`,
        avatarColor: u.avatarColor,
        isBot: false,
        status: getUserStatus(u),
        timestamp: last?.timestamp,
        unread: unreadCounts[dmKey] || 0,
        isPinned: false,
        lastMsg: last,
        rawUser: u,
      });
    }

    return list;
  }, [devbotUser, channels, humanUsers, lastMessages, unreadCounts, onlineUsers]);

  // Filter conversations by tab and search
  const filteredConversations = useMemo(() => {
    return conversationList.filter((item) => {
      // Tab filter: "All", "DMs", "Channels", "DevBot"
      if (activeTab === 'channels' && item.type !== 'channel') return false;
      if (activeTab === 'dms' && (item.type !== 'dm' || item.isBot)) return false;
      if (activeTab === 'devbot' && !item.isBot) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesSubtitle = item.subtitle.toLowerCase().includes(q);
        return matchesTitle || matchesSubtitle;
      }

      return true;
    });
  }, [conversationList, activeTab, searchQuery]);

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
        {/* Top Header: Title "Chats" + Action Icons (Search, Add Contact, Settings) */}
        <div className="h-14 px-4 bg-[#161a23] border-b border-zinc-800/80 flex items-center justify-between flex-shrink-0">
          <h2 className="text-base font-bold text-zinc-100 font-sans tracking-tight">
            Chats
          </h2>

          {/* Action icons on the top right */}
          <div className="flex items-center gap-1">
            <button
              id="search-toggle-btn"
              type="button"
              onClick={() => setShowSearchBar(!showSearchBar)}
              title="Search"
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              id="add-contact-btn"
              type="button"
              onClick={onOpenAddFriend}
              title="Add Contact / Start DM"
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

        {/* Full-width rounded pill search box ("Search chats, contacts, channels") */}
        {showSearchBar && (
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
        )}

        {/* Filter Chips below search: Horizontal tabs ("All", "DMs", "Channels", "DevBot") */}
        <div className="px-3 pb-2.5 pt-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'dms', label: 'DMs' },
              { key: 'channels', label: 'Channels' },
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

        {/* Chat List Items */}
        <div className="flex-1 overflow-y-auto px-1.5 py-1 space-y-0.5">
          {filteredConversations.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs font-mono">
              No conversations found
            </div>
          ) : (
            filteredConversations.map((item) => {
              const isSelected =
                (item.type === 'channel' && activeChannelId === item.id) ||
                (item.type === 'dm' && activeDMUserId === item.id);

              const isUserLastSender =
                item.lastMsg && currentUser && item.lastMsg.senderId === currentUser.id;

              return (
                <button
                  key={item.key}
                  id={`chat-item-${item.type}-${item.id}`}
                  type="button"
                  onClick={() => {
                    if (item.type === 'channel') {
                      onSelectChannel(item.id);
                    } else {
                      onSelectDM(item.id);
                    }
                    onCloseMobile();
                  }}
                  className={`w-full px-3 py-2.5 rounded-2xl flex items-center gap-3 text-left transition-all relative group cursor-pointer ${
                    isSelected
                      ? 'bg-white/[0.06] border-l-2 border-indigo-500 shadow-sm'
                      : 'hover:bg-white/[0.03] text-zinc-300'
                  }`}
                >
                  {/* Circular Avatar (rounded-full h-11 w-11) with fallback initials and status dot */}
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

                  {/* Center: Contact / Channel Name in bold, latest message snippet */}
                  <div className="flex-1 min-w-0">
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
                      </div>

                      {/* Right: Relative Timestamp */}
                      {item.timestamp && (
                        <span className="text-[10px] font-mono text-zinc-500 flex-shrink-0">
                          {formatConversationTime(item.timestamp)}
                        </span>
                      )}
                    </div>

                    {/* Subtitle Line: Delivery tick + Snippet + Unread badge (indigo pill) */}
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

                      {/* Indigo Unread Badge */}
                      {item.unread > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-indigo-600 text-white flex-shrink-0 shadow-sm shadow-indigo-950/60">
                          {item.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
};

export default ConversationList;
