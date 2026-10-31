import React, { useState, useMemo } from 'react';
import { User, ActiveChat, FriendRequest, NavigationTab } from '../../types';
import {
  ChevronDown,
  ChevronRight,
  UserPlus,
  Search,
  Check,
  X,
  UserMinus,
  Sparkles,
  Plus,
} from 'lucide-react';
import { FileIcon, getFileExtension } from '../../utils/fileIcons';

export interface ExplorerSidebarProps {
  activeTab: NavigationTab;
  currentUser: User | null;
  friends: User[];
  friendRequests: FriendRequest[];
  onlineUsers: { id: string }[];
  activeChat: ActiveChat | null;
  unreadCounts: Record<string, number>;
  typingUserIds?: Set<string>;
  isGeneralTyping?: boolean;
  isBotTyping?: boolean;
  onSelectChat: (chat: ActiveChat) => void;
  onOpenAddFriend: () => void;
  onRespondFriendRequest: (requestId: string, action: 'accept' | 'decline') => void;
  onRemoveFriend: (friendId: string) => void;
}

export const ExplorerSidebar: React.FC<ExplorerSidebarProps> = ({
  activeTab,
  currentUser: _currentUser,
  friends,
  friendRequests,
  onlineUsers,
  activeChat,
  unreadCounts,
  typingUserIds,
  isGeneralTyping = false,
  isBotTyping = false,
  onSelectChat,
  onOpenAddFriend,
  onRespondFriendRequest,
  onRemoveFriend,
}) => {
  // Collapsible sections state
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [botsOpen, setBotsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);
  const [requestsOpen, setRequestsOpen] = useState(true);

  // Search input state (for Search activity tab)
  const [searchQuery, setSearchQuery] = useState('');

  const onlineUserIds = useMemo(() => new Set(onlineUsers.map((u) => u.id)), [onlineUsers]);

  const generalChat: ActiveChat = {
    type: 'channel',
    id: 'general',
    name: 'general',
    displayName: 'general',
    fileIcon: 'folder',
    description: 'General discussion for all chitAbit members',
  };

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

  // Filtered friends for Explorer or Search tab
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.toLowerCase().trim();
    return friends.filter(
      (f) =>
        f.username.toLowerCase().includes(q) ||
        (f.displayName && f.displayName.toLowerCase().includes(q))
    );
  }, [friends, searchQuery]);

  return (
    <aside
      aria-label="VS Code Primary Side Bar"
      className="w-64 md:w-64 flex-shrink-0 bg-[var(--sidebar)] text-[var(--text)] border-r border-[var(--border)] flex flex-col h-full select-none text-[13px] font-sans transition-colors"
    >
      {/* 1. Explorer / Sidebar Title Bar */}
      <div className="h-9 px-4 flex items-center justify-between text-[11px] font-bold tracking-wider uppercase text-[#bbbbbb] light-plus:text-[#555555]">
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
          {activeTab === 'explorer' && (
            <button
              type="button"
              title="Add Friend / New Chat"
              onClick={onOpenAddFriend}
              className="p-1 hover:bg-[#37373d] light-plus:hover:bg-[#e0e0e0] rounded text-[#cccccc] light-plus:text-[#555555] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          {activeTab === 'friends' && (
            <button
              type="button"
              title="Add Friend"
              onClick={onOpenAddFriend}
              className="p-1 hover:bg-[#37373d] light-plus:hover:bg-[#e0e0e0] rounded text-[#cccccc] light-plus:text-[#555555] cursor-pointer flex items-center gap-1 text-[11px] font-normal lowercase"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#007acc]" />
              <span>add</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Search View in Sidebar (when Search activity tab active) */}
      {activeTab === 'search' && (
        <div className="p-3 border-b border-[#3c3c3c] light-plus:border-[#e7e7e7]">
          <div className="relative">
            <span className="absolute left-2.5 top-2 text-[#858585]">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              id="vscode-sidebar-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats, files, members..."
              className="w-full bg-[#3c3c3c] light-plus:bg-white text-[#cccccc] light-plus:text-[#333333] border border-[#3c3c3c] focus:border-[#007acc] rounded-sm pl-8 pr-2 py-1 text-xs outline-none"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* 3. Main Tree View Content */}
      <div className="flex-1 overflow-y-auto py-1 font-mono text-[12px]">
        {/* Section: Pending Friend Requests (if any) */}
        {friendRequests.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setRequestsOpen(!requestsOpen)}
              className="w-full px-2 py-1 flex items-center gap-1 font-bold text-[11px] tracking-wider uppercase text-[#007acc] hover:bg-[#2a2d2e] light-plus:hover:bg-[#e8e8e8] cursor-pointer text-left"
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
                    className="flex items-center justify-between p-1.5 rounded hover:bg-[#2a2d2e] light-plus:hover:bg-[#e8e8e8]"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileIcon name="ts" size={14} />
                      <span className="truncate text-xs">
                        {req.sender_username}
                        <span className="text-[#858585] text-[10px] ml-1">.req</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        id={`btn-accept-req-${req.id}`}
                        onClick={() => onRespondFriendRequest(req.id, 'accept')}
                        title="Accept"
                        className="p-1 bg-[#007acc] text-white rounded hover:bg-[#0062a3] cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        id={`btn-decline-req-${req.id}`}
                        onClick={() => onRespondFriendRequest(req.id, 'decline')}
                        title="Decline"
                        className="p-1 bg-[#37373d] light-plus:bg-[#e0e0e0] text-[#cccccc] rounded hover:bg-red-900 hover:text-white cursor-pointer"
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

        {/* Section 1: CHANNELS */}
        <div>
          <button
            type="button"
            id="explorer-channels-header"
            onClick={() => setChannelsOpen(!channelsOpen)}
            className="w-full px-2 py-1 flex items-center justify-between font-bold text-[11px] tracking-wider uppercase text-[#bbbbbb] light-plus:text-[#666666] hover:bg-[#2a2d2e] light-plus:hover:bg-[#e8e8e8] cursor-pointer text-left"
          >
            <div className="flex items-center gap-1">
              {channelsOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              <span>CHANNELS</span>
            </div>
            {unreadCounts['general'] > 0 && (
              <span className="min-w-[16px] h-4 px-1 bg-[#007acc] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCounts['general']}
              </span>
            )}
          </button>

          {channelsOpen && (
            <div className="pl-4 pr-2">
              <button
                type="button"
                id="explorer-item-general"
                onClick={() => onSelectChat(generalChat)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-sm cursor-pointer transition-colors text-left ${
                  activeChat?.id === 'general'
                    ? 'bg-[var(--selection)] text-white font-semibold'
                    : 'hover:bg-[var(--line-highlight)] text-[var(--text)]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileIcon
                    isFolder={true}
                    isOpenFolder={activeChat?.id === 'general'}
                    size={16}
                  />
                  <span className="truncate">general/</span>
                  {isGeneralTyping && (
                    <span
                      className="inline-flex items-center text-[#007acc] font-bold text-xs animate-pulse tracking-widest ml-0.5"
                      title="Someone is typing in general..."
                    >
                      ...
                    </span>
                  )}
                </div>
                {unreadCounts['general'] > 0 && (
                  <span className="min-w-[16px] h-4 px-1 bg-[#007acc] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCounts['general']}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Section 2: BOTS */}
        <div className="mt-1">
          <button
            type="button"
            id="explorer-bots-header"
            onClick={() => setBotsOpen(!botsOpen)}
            className="w-full px-2 py-1 flex items-center justify-between font-bold text-[11px] tracking-wider uppercase text-[#bbbbbb] light-plus:text-[#666666] hover:bg-[#2a2d2e] light-plus:hover:bg-[#e8e8e8] cursor-pointer text-left"
          >
            <div className="flex items-center gap-1">
              {botsOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              <span>BOTS</span>
            </div>
            {unreadCounts['devbot'] > 0 && (
              <span className="min-w-[16px] h-4 px-1 bg-[#007acc] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCounts['devbot']}
              </span>
            )}
          </button>

          {botsOpen && (
            <div className="pl-4 pr-2">
              <button
                type="button"
                id="explorer-item-devbot"
                onClick={() => onSelectChat(devbotChat)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-sm cursor-pointer transition-colors text-left ${
                  activeChat?.id === 'devbot'
                    ? 'bg-[var(--selection)] text-white font-semibold'
                    : 'hover:bg-[var(--line-highlight)] text-[var(--text)]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileIcon isBot={true} size={16} status="Online" />
                  <span className="truncate flex items-center gap-1">
                    devbot.ai
                    <Sparkles className="w-3 h-3 text-[#cca700]" />
                  </span>
                  {isBotTyping && (
                    <span
                      className="inline-flex items-center text-[#cca700] font-bold text-xs animate-pulse tracking-widest ml-0.5"
                      title="DevBot is generating code..."
                    >
                      ...
                    </span>
                  )}
                </div>
                {unreadCounts['devbot'] > 0 && (
                  <span className="min-w-[16px] h-4 px-1 bg-[#007acc] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCounts['devbot']}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Section 3: DIRECT MESSAGES / FRIENDS */}
        <div className="mt-1">
          <button
            type="button"
            id="explorer-dms-header"
            onClick={() => setDmsOpen(!dmsOpen)}
            className="w-full px-2 py-1 flex items-center justify-between font-bold text-[11px] tracking-wider uppercase text-[#bbbbbb] light-plus:text-[#666666] hover:bg-[#2a2d2e] light-plus:hover:bg-[#e8e8e8] cursor-pointer text-left"
          >
            <div className="flex items-center gap-1">
              {dmsOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              <span>DIRECT MESSAGES ({friends.length})</span>
            </div>
          </button>

          {dmsOpen && (
            <div className="pl-4 pr-2 space-y-0.5">
              {filteredFriends.length === 0 ? (
                <div className="px-2 py-2 text-[11px] text-[#858585] italic">
                  {friends.length === 0
                    ? 'No friends yet. Click + to add.'
                    : 'No matches found.'}
                </div>
              ) : (
                filteredFriends.map((friend) => {
                  const isOnline = onlineUserIds.has(friend.id);
                  const isSelected = activeChat?.id === friend.id;
                  const unread = unreadCounts[friend.id] || 0;
                  const ext = getFileExtension(friend.fileIcon);
                  const filename = `${friend.username}${ext}`;

                  const friendChat: ActiveChat = {
                    type: 'dm',
                    id: friend.id,
                    name: friend.username,
                    displayName: filename,
                    fileIcon: friend.fileIcon,
                    status: isOnline ? 'Online' : 'Offline',
                    bio: friend.bio,
                  };

                  return (
                    <div
                      key={friend.id}
                      className={`group flex items-center justify-between px-2 py-1.5 rounded-sm cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[var(--selection)] text-white font-semibold'
                          : 'hover:bg-[var(--line-highlight)] text-[var(--text)]'
                      }`}
                      onClick={() => onSelectChat(friendChat)}
                    >
                      <div className="flex items-center gap-2 truncate min-w-0">
                        <FileIcon
                          name={friend.fileIcon}
                          size={16}
                          status={isOnline ? 'Online' : 'Offline'}
                        />
                        <span className="truncate">{filename}</span>
                        {(typingUserIds?.has(friend.id) || typingUserIds?.has(friend.username)) && (
                          <span
                            className="inline-flex items-center text-[#007acc] font-bold text-xs animate-pulse tracking-widest ml-0.5"
                            title={`${friend.username} is typing...`}
                          >
                            ...
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                        {unread > 0 && (
                          <span className="min-w-[16px] h-4 px-1 bg-[#007acc] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                            {unread}
                          </span>
                        )}
                        {/* Remove friend quick action on hover */}
                        {activeTab === 'friends' && (
                          <button
                            type="button"
                            title={`Remove ${friend.username}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Remove ${friend.username} from friends?`)) {
                                onRemoveFriend(friend.id);
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-[#858585] hover:text-red-400 cursor-pointer"
                          >
                            <UserMinus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
