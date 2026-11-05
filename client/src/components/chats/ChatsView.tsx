import React, { useState, useMemo } from 'react';
import { User, ActiveChat, LastMessage } from '../../types';
import { Search, Bot, Hash, Sparkles, Pin } from 'lucide-react';
import { getInitials } from '../../utils/chatUtils';

interface ChatsViewProps {
  currentUser: User | null;
  friends: User[];
  onlineUsers: { id: string }[];
  activeChat: ActiveChat | null;
  unreadCounts: Record<string, number>;
  lastMessages: Record<string, LastMessage>;
  onSelectChat: (chat: ActiveChat) => void;
}

export const ChatsView: React.FC<ChatsViewProps> = ({
  currentUser: _currentUser,
  friends,
  onlineUsers,
  activeChat,
  unreadCounts,
  lastMessages,
  onSelectChat,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'direct' | 'devbot'>('all');

  const onlineUserIds = useMemo(() => new Set(onlineUsers.map((u) => u.id)), [onlineUsers]);

  // Pinned items: 1. DevBot, 2. #general
  const devbotChat: ActiveChat = {
    type: 'dm',
    id: 'devbot',
    name: 'devbot',
    displayName: 'DevBot (AI Assistant)',
    avatarColor: '#06C755',
    isBot: true,
    status: 'Online',
    bio: 'Senior AI Pair Programmer & Debugger 🤖',
  };

  const generalChat: ActiveChat = {
    type: 'channel',
    id: 'general',
    name: 'general',
    displayName: '#general',
    description: 'General discussion for all ChatAbit members',
  };

  // Sort friends by latest message timestamp
  const sortedFriends = useMemo(() => {
    return [...friends].sort((a, b) => {
      const timeA = lastMessages[`dm_${a.id}`]?.timestamp || 0;
      const timeB = lastMessages[`dm_${b.id}`]?.timestamp || 0;
      return timeB - timeA;
    });
  }, [friends, lastMessages]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const matchesQuery = (name: string, snippet?: string) => {
      if (!q) return true;
      return name.toLowerCase().includes(q) || (snippet && snippet.toLowerCase().includes(q));
    };

    const showDevbot =
      (filterTab === 'all' || filterTab === 'devbot') &&
      matchesQuery('DevBot AI Assistant', lastMessages['dm_devbot']?.content);

    const showGeneral =
      (filterTab === 'all') &&
      matchesQuery('#general', lastMessages['channel_general']?.content);

    const friendChats = (filterTab === 'all' || filterTab === 'direct')
      ? sortedFriends.filter((f) =>
          matchesQuery(f.displayName || f.username, lastMessages[`dm_${f.id}`]?.content)
        )
      : [];

    return { showDevbot, showGeneral, friendChats };
  }, [searchQuery, filterTab, sortedFriends, lastMessages]);

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-80 md:w-96 flex-shrink-0 h-full bg-white dark:bg-[#161920] border-r border-zinc-200 dark:border-zinc-800 flex flex-col select-none transition-colors">
      {/* Top Header */}
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Chats</h2>
        <div className="text-xs text-zinc-400 font-medium">
          {friends.length + 2} conversation{friends.length + 2 === 1 ? '' : 's'}
        </div>
      </div>

      {/* Search Input */}
      <div className="px-4 py-2.5">
        <div className="relative">
          <span className="absolute left-3 top-2.5 text-zinc-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            id="chats-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats or messages..."
            className="w-full bg-zinc-100 dark:bg-zinc-850 border-0 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#06C755]/30 transition-all"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-1 flex gap-1">
        {(['all', 'direct', 'devbot'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            id={`filter-tab-${tab}`}
            onClick={() => setFilterTab(tab)}
            className={`px-3 py-1 text-xs font-semibold rounded-full capitalize transition-all cursor-pointer ${
              filterTab === tab
                ? 'bg-[#06C755] text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 bg-zinc-100 dark:bg-zinc-800'
            }`}
          >
            {tab === 'devbot' ? 'DevBot' : tab}
          </button>
        ))}
      </div>

      {/* Conversation Thread List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {/* Pinned Section */}
        {(filteredItems.showDevbot || filteredItems.showGeneral) && (
          <div className="mb-2">
            <div className="px-2 pb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              <Pin className="w-3 h-3 text-[#06C755]" />
              <span>Pinned</span>
            </div>

            {/* Pinned: DevBot */}
            {filteredItems.showDevbot && (
              <div
                id="chat-item-devbot"
                onClick={() => onSelectChat(devbotChat)}
                className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                  activeChat?.id === 'devbot'
                    ? 'bg-[#06C755]/15 text-[#06C755]'
                    : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-[#06C755] flex items-center justify-center text-white shadow-md shadow-[#06C755]/20">
                    <Bot className="w-6 h-6" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#06C755] ring-2 ring-white dark:ring-zinc-800" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1 truncate">
                      DevBot
                      <Sparkles className="w-3 h-3 text-amber-500 flex-shrink-0" />
                    </span>
                    <span className="text-[11px] text-zinc-400 flex-shrink-0">
                      {formatTime(lastMessages['dm_devbot']?.timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {lastMessages['dm_devbot']?.content || 'AI Pair Programmer ready to assist'}
                    </p>
                    {unreadCounts['devbot'] > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 bg-[#06C755] text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0 ml-1.5 shadow-sm">
                        {unreadCounts['devbot']}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Pinned: #general */}
            {filteredItems.showGeneral && (
              <div
                id="chat-item-general"
                onClick={() => onSelectChat(generalChat)}
                className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                  activeChat?.id === 'general'
                    ? 'bg-[#06C755]/15 text-[#06C755]'
                    : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
                    <Hash className="w-6 h-6" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                      #general
                    </span>
                    <span className="text-[11px] text-zinc-400 flex-shrink-0">
                      {formatTime(lastMessages['channel_general']?.timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {lastMessages['channel_general']?.content || 'General discussion for all ChatAbit members'}
                    </p>
                    {unreadCounts['general'] > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 bg-[#06C755] text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0 ml-1.5 shadow-sm">
                        {unreadCounts['general']}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Direct Messages Section */}
        {filteredItems.friendChats.length > 0 && (
          <div>
            <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Messages
            </div>
            {filteredItems.friendChats.map((f) => {
              const isOnline = onlineUserIds.has(f.id);
              const unread = unreadCounts[f.id] || 0;
              const lastMsg = lastMessages[`dm_${f.id}`];
              const isSelected = activeChat?.id === f.id;

              return (
                <div
                  key={f.id}
                  id={`chat-item-${f.username}`}
                  onClick={() =>
                    onSelectChat({
                      type: 'dm',
                      id: f.id,
                      name: f.username,
                      displayName: f.displayName || f.username,
                      avatarColor: f.avatarColor,
                      avatarUrl: f.avatarUrl,
                      status: isOnline ? 'Online' : 'Offline',
                      bio: f.bio,
                    })
                  }
                  className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#06C755]/15 text-[#06C755]'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    {f.avatarUrl ? (
                      <img
                        src={f.avatarUrl}
                        alt={f.displayName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm"
                        style={{ backgroundColor: f.avatarColor || '#06C755' }}
                      >
                        {getInitials(f.displayName || f.username)}
                      </div>
                    )}
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white dark:ring-zinc-800 ${
                        isOnline ? 'bg-[#06C755]' : 'bg-zinc-400'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                        {f.displayName || f.username}
                      </span>
                      <span className="text-[11px] text-zinc-400 flex-shrink-0">
                        {formatTime(lastMsg?.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {lastMsg?.content || f.bio || 'Tap to chat'}
                      </p>
                      {unread > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 bg-[#06C755] text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0 ml-1.5 shadow-sm">
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredItems.friendChats.length === 0 && !filteredItems.showDevbot && !filteredItems.showGeneral && (
          <div className="py-12 text-center text-xs text-zinc-400">
            No chats found matching "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  );
};
