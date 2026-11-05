import React, { useState, useMemo } from 'react';
import { User, ActiveChat, FriendRequest, NavigationTab, Channel } from '../../types';
import {
  ChevronDown,
  ChevronRight,
  UserPlus,
  Search,
  Check,
  X,
  UserMinus,
  Sparkles,
  Hash,
  Bot,
  User as UserIcon,
} from 'lucide-react';
import { ProfileModalUser } from './UserProfileModal';

export interface ExplorerSidebarProps {
  activeTab: NavigationTab;
  currentUser: User | null;
  friends: User[];
  friendRequests: FriendRequest[];
  onlineUsers: { id: string }[];
  activeChat: ActiveChat | null;
  unreadCounts: Record<string, number>;
  typingUserIds?: Set<string>;
  channels: Channel[];
  typingChannelIds?: Set<string>;
  isBotTyping?: boolean;
  onSelectChat: (chat: ActiveChat) => void;
  onCreateChannel: () => void;
  onOpenAddFriend: () => void;
  onRespondFriendRequest: (requestId: string, action: 'accept' | 'decline') => void;
  onRemoveFriend: (friendId: string) => void;
  onOpenUserProfile?: (user: ProfileModalUser) => void;
}

// 4 strictly defined active channels
const FIXED_CHANNELS = [
  { id: 'general', name: 'general', description: 'General developer discussion & chat' },
  { id: 'javascript', name: 'javascript', description: 'JS/TS, React, Node.js and frontend' },
  { id: 'python', name: 'python', description: 'Python, scripting, ML and backend' },
  { id: 'devops', name: 'devops', description: 'CI/CD, Docker, Kubernetes and cloud' },
];

export const ExplorerSidebar: React.FC<ExplorerSidebarProps> = ({
  activeTab,
  currentUser: _currentUser,
  friends,
  friendRequests,
  onlineUsers,
  activeChat,
  unreadCounts,
  typingUserIds,
  channels: _channels,
  typingChannelIds,
  isBotTyping = false,
  onSelectChat,
  onCreateChannel: _onCreateChannel,
  onOpenAddFriend,
  onRespondFriendRequest,
  onRemoveFriend,
  onOpenUserProfile,
}) => {
  // Collapsible tree sections
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);
  const [botsOpen, setBotsOpen] = useState(true);
  const [requestsOpen, setRequestsOpen] = useState(true);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  const onlineUserIds = useMemo(() => new Set(onlineUsers.map((u) => u.id)), [onlineUsers]);

  // Standard DM contacts + user's friends list
  const displayDirectMessages = useMemo(() => {
    const list: {
      id: string;
      username: string;
      displayName: string;
      status: 'online' | 'idle' | 'offline';
      fileIcon: string;
      avatarUrl?: string | null;
    }[] = [
      {
        id: 'syntaxcoder13',
        username: 'syntaxcoder13',
        displayName: 'syntaxcoder13',
        status: 'online',
        fileIcon: 'ts',
        avatarUrl: null,
      },
      {
        id: 'vikrant-choudhary',
        username: 'vikrant-choudhary',
        displayName: 'vikrant-choudhary',
        status: 'idle',
        fileIcon: 'py',
        avatarUrl: null,
      },
    ];

    friends.forEach((f) => {
      if (f.username !== 'syntaxcoder13' && f.username !== 'vikrant-choudhary') {
        const isOnline = onlineUserIds.has(f.id);
        list.push({
          id: f.id,
          username: f.username,
          displayName: f.displayName || f.username,
          status: isOnline ? 'online' : 'offline',
          fileIcon: f.fileIcon || 'ts',
          avatarUrl: f.avatarUrl || null,
        });
      }
    });

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((m) => m.username.toLowerCase().includes(q) || m.displayName.toLowerCase().includes(q));
  }, [friends, onlineUserIds, searchQuery]);

  const devbotChat: ActiveChat = {
    type: 'dm',
    id: 'devbot',
    name: 'devbot',
    displayName: 'devbot.ai',
    fileIcon: 'bot',
    isBot: true,
    status: 'Online',
    bio: 'Senior AI Pair Programmer & Debugger 🤖',
  };

  return (
    <aside
      aria-label="VS Code Primary Side Bar"
      className="w-64 flex-shrink-0 bg-[#181825] text-[#cdd6f4] border-r border-[#313244] flex flex-col h-full select-none text-[13px] font-mono transition-all fixed md:relative left-12 md:left-0 top-0 bottom-0 z-30 md:z-auto shadow-2xl md:shadow-none"
    >
      {/* 1. Explorer Header Strip */}
      <div className="h-9 px-4 flex items-center justify-between text-[11px] font-bold tracking-wider uppercase text-[#a6adc8] border-b border-[#313244]/60">
        <span>
          {activeTab === 'explorer'
            ? 'EXPLORER'
            : activeTab === 'friends'
            ? 'FRIENDS DIRECTORY'
            : activeTab === 'search'
            ? 'SEARCH'
            : 'SETTINGS'}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Add Contact / Friend"
            onClick={onOpenAddFriend}
            className="p-1 hover:bg-[#313244] rounded text-[#a6adc8] hover:text-[#cdd6f4] cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Search View in Sidebar (when Search activity tab active) */}
      {activeTab === 'search' && (
        <div className="p-3 border-b border-[#313244]">
          <div className="relative">
            <span className="absolute left-2.5 top-2 text-[#6c7086]">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              id="vscode-sidebar-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search channels, DMs, bots..."
              className="w-full bg-[#1e1e2e] text-[#cdd6f4] border border-[#313244] focus:border-[#cba6f7] rounded-sm pl-8 pr-2 py-1 text-xs outline-none"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* 3. Main Tree View Content */}
      <div className="flex-1 overflow-y-auto py-1 text-[12px]">
        {/* Section: Pending Friend Requests (if any) */}
        {friendRequests.length > 0 && (
          <div className="mb-1">
            <button
              type="button"
              onClick={() => setRequestsOpen(!requestsOpen)}
              className="w-full px-2 py-1 flex items-center gap-1 font-bold text-[11px] tracking-wider uppercase text-[#cba6f7] hover:bg-[#313244]/50 cursor-pointer text-left"
            >
              {requestsOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              <span>PENDING REQUESTS ({friendRequests.length})</span>
            </button>

            {requestsOpen && (
              <div className="pl-4 pr-2 py-1 space-y-1">
                {friendRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-1.5 rounded hover:bg-[#313244]/50"
                  >
                    <span className="truncate text-xs text-[#a6adc8]">
                      @{req.sender_username}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => onRespondFriendRequest(req.id, 'accept')}
                        title="Accept"
                        className="p-1 bg-[#cba6f7] text-[#11111b] rounded hover:bg-[#b4befe] cursor-pointer"
                      >
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRespondFriendRequest(req.id, 'decline')}
                        title="Decline"
                        className="p-1 bg-[#313244] text-[#f38ba8] rounded hover:bg-[#45475a] cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tree Section 1: ▾ CHANNELS (4) */}
        <div className="mb-1">
          <button
            type="button"
            onClick={() => setChannelsOpen(!channelsOpen)}
            className="w-full px-2 py-1 flex items-center justify-between font-bold text-[11px] tracking-wider uppercase text-[#a6adc8] hover:bg-[#313244]/50 cursor-pointer text-left"
          >
            <div className="flex items-center gap-1">
              {channelsOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-[#6c7086]" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-[#6c7086]" />
              )}
              <span>CHANNELS (4)</span>
            </div>
          </button>

          {channelsOpen && (
            <div className="pl-2 pr-1 space-y-0.5 mt-0.5">
              {FIXED_CHANNELS.map((ch) => {
                const isSelected = activeChat?.type === 'channel' && activeChat.id === ch.id;
                const unread = unreadCounts[ch.id] || 0;
                const isTyping = typingChannelIds?.has(ch.id);

                return (
                  <div
                    key={ch.id}
                    onClick={() =>
                      onSelectChat({
                        type: 'channel',
                        id: ch.id,
                        name: ch.name,
                        displayName: `# ${ch.name}`,
                        fileIcon: 'folder',
                      })
                    }
                    className={`group flex items-center justify-between px-2.5 py-1 rounded-sm cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#313244] text-[#cba6f7] font-semibold border-l-2 border-[#cba6f7]'
                        : 'text-[#a6adc8] hover:bg-[#313244]/40 hover:text-[#cdd6f4]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Hash className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-[#cba6f7]' : 'text-[#89b4fa]'}`} />
                      <span className="truncate">{ch.name}</span>
                      {isTyping && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#cba6f7] animate-ping" />
                      )}
                    </div>

                    {unread > 0 && (
                      <span className="min-w-[16px] h-4 px-1 bg-[#cba6f7] text-[#11111b] text-[9px] font-extrabold rounded-full flex items-center justify-center">
                        {unread}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tree Section 2: ▾ DIRECT MESSAGES */}
        <div className="mb-1">
          <button
            type="button"
            onClick={() => setDmsOpen(!dmsOpen)}
            className="w-full px-2 py-1 flex items-center justify-between font-bold text-[11px] tracking-wider uppercase text-[#a6adc8] hover:bg-[#313244]/50 cursor-pointer text-left"
          >
            <div className="flex items-center gap-1">
              {dmsOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-[#6c7086]" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-[#6c7086]" />
              )}
              <span>DIRECT MESSAGES ({displayDirectMessages.length})</span>
            </div>
          </button>

          {dmsOpen && (
            <div className="pl-2 pr-1 space-y-0.5 mt-0.5">
              {displayDirectMessages.length === 0 ? (
                <div className="px-2.5 py-1.5 text-[11px] text-[#6c7086] italic">
                  No friends added yet. Click + to add contacts.
                </div>
              ) : (
                displayDirectMessages.map((dm) => {
                const isSelected = activeChat?.type === 'dm' && activeChat.id === dm.id;
                const unread = unreadCounts[dm.id] || 0;
                const isTyping = typingUserIds?.has(dm.id) || typingUserIds?.has(dm.username);

                return (
                  <div
                    key={dm.id}
                    onClick={() =>
                      onSelectChat({
                        type: 'dm',
                        id: dm.id,
                        name: dm.username,
                        displayName: `@${dm.username}`,
                        fileIcon: dm.fileIcon,
                        status: dm.status === 'online' ? 'Online' : dm.status === 'idle' ? 'Idle' : 'Offline',
                      })
                    }
                    className={`group flex items-center justify-between px-2.5 py-1 rounded-sm cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#313244] text-[#cba6f7] font-semibold border-l-2 border-[#cba6f7]'
                        : 'text-[#a6adc8] hover:bg-[#313244]/40 hover:text-[#cdd6f4]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {/* Presence Dot: ● green for online, ○ amber for idle, gray for offline */}
                      {dm.status === 'online' ? (
                        <span className="w-2 h-2 rounded-full bg-[#a6e3a1] flex-shrink-0" title="Online" />
                      ) : dm.status === 'idle' ? (
                        <span className="w-2 h-2 rounded-full border border-[#f9e2af] bg-transparent flex-shrink-0" title="Idle" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-[#6c7086] flex-shrink-0" title="Offline" />
                      )}

                      <span className="truncate">@{dm.username}</span>

                      {isTyping && (
                        <span className="text-[#cba6f7] font-bold text-xs animate-pulse">...</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* View Profile Button on Hover */}
                      {onOpenUserProfile && (
                        <button
                          type="button"
                          title={`View @${dm.username}'s profile`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenUserProfile({
                              id: dm.id,
                              username: dm.username,
                              displayName: dm.displayName || dm.username,
                              avatarUrl: dm.avatarUrl,
                              fileIcon: dm.fileIcon,
                              status: dm.status === 'online' ? 'Online' : dm.status === 'idle' ? 'Idle' : 'Offline',
                            });
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[#6c7086] hover:text-[#cba6f7] hover:bg-[#313244] transition-all cursor-pointer"
                        >
                          <UserIcon className="w-3 h-3" />
                        </button>
                      )}

                      {unread > 0 && (
                        <span className="min-w-[16px] h-4 px-1 bg-[#cba6f7] text-[#11111b] text-[9px] font-extrabold rounded-full flex items-center justify-center">
                          {unread}
                        </span>
                      )}
                      {activeTab === 'friends' && (
                        <button
                          type="button"
                          title={`Remove ${dm.username}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Remove @${dm.username} from friends?`)) {
                              onRemoveFriend(dm.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-[#6c7086] hover:text-[#f38ba8] cursor-pointer"
                        >
                          <UserMinus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              }))}
            </div>
          )}
        </div>

        {/* Tree Section 3: ▾ INTEGRATIONS & BOTS */}
        <div>
          <button
            type="button"
            onClick={() => setBotsOpen(!botsOpen)}
            className="w-full px-2 py-1 flex items-center justify-between font-bold text-[11px] tracking-wider uppercase text-[#a6adc8] hover:bg-[#313244]/50 cursor-pointer text-left"
          >
            <div className="flex items-center gap-1">
              {botsOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-[#6c7086]" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-[#6c7086]" />
              )}
              <span>INTEGRATIONS & BOTS</span>
            </div>
          </button>

          {botsOpen && (
            <div className="pl-2 pr-1 space-y-0.5 mt-0.5">
              <div
                onClick={() => onSelectChat(devbotChat)}
                className={`group flex items-center justify-between px-2.5 py-1 rounded-sm cursor-pointer transition-colors ${
                  activeChat?.id === 'devbot'
                    ? 'bg-[#313244] text-[#cba6f7] font-semibold border-l-2 border-[#cba6f7]'
                    : 'text-[#a6adc8] hover:bg-[#313244]/40 hover:text-[#cdd6f4]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Sparkles className="w-3.5 h-3.5 text-[#f9e2af] flex-shrink-0" />
                  <span className="truncate">devbot.ai</span>
                  {isBotTyping && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f9e2af] animate-ping" />
                  )}
                </div>

                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-[#313244] text-[#a6e3a1] border border-[#a6e3a1]/30">
                  ready
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
