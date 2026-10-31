import React, { useState, useMemo } from 'react';
import { User, Channel, OnlineUser } from '../../types';
import {
  Search,
  UserPlus,
  MessageSquare,
  Bot,
  Hash,
  X,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { getInitials } from '../../utils/chatUtils';

export interface FriendsListProps {
  currentUser: User | null;
  users: User[];
  channels: Channel[];
  onlineUsers: OnlineUser[];
  onStartDM: (targetUser: User) => void;
  onSelectChannel: (channelId: string) => void;
  onOpenAddFriend: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const FriendsList: React.FC<FriendsListProps> = ({
  currentUser,
  users,
  channels,
  onlineUsers,
  onStartDM,
  onSelectChannel,
  onOpenAddFriend,
  isOpenMobile = false,
  onCloseMobile = () => {},
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [peopleSectionOpen, setPeopleSectionOpen] = useState(true);
  const [channelsSectionOpen, setChannelsSectionOpen] = useState(true);

  // Filter out current user from directory
  const directFriends = useMemo(() => {
    return users.filter((u) => u.id !== currentUser?.id);
  }, [users, currentUser?.id]);

  // Online status helper
  const getUserStatus = (u: User): 'Online' | 'Idle' | 'Offline' => {
    if (u.id === 'devbot') return 'Online';
    const found = onlineUsers.find((ou) => ou.id === u.id);
    if (found) {
      return found.status || 'Online';
    }
    return u.status || 'Offline';
  };

  // Filtered lists based on search
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return directFriends;
    const q = searchQuery.toLowerCase().trim();
    return directFriends.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        (u.bio && u.bio.toLowerCase().includes(q))
    );
  }, [directFriends, searchQuery]);

  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return channels;
    const q = searchQuery.toLowerCase().trim();
    return channels.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [channels, searchQuery]);

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
        {/* Top Header: "Friends" + counter + "Add Friend" Button */}
        <div className="h-14 px-4 bg-[#161a23] border-b border-zinc-800/80 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-zinc-100 font-sans tracking-tight">
              Friends
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-[#0f1218] text-zinc-400 border border-zinc-800">
              {directFriends.length}
            </span>
          </div>

          {/* Add Friend Action Button */}
          <button
            id="add-friend-top-btn"
            type="button"
            onClick={onOpenAddFriend}
            title="Add Friend or Create Group"
            className="p-2 rounded-xl text-zinc-400 hover:text-[#06c755] hover:bg-zinc-800/60 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar: "Search friends by name or handle" */}
        <div className="p-3 bg-[#161a23]">
          <div className="relative flex items-center bg-[#0f1218] border border-zinc-800 focus-within:border-indigo-500 rounded-full px-3 py-1.5 transition-all">
            <Search className="w-4 h-4 text-zinc-500 flex-shrink-0 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends by name or handle"
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

        {/* Scrollable Directory Content */}
        <div className="flex-1 overflow-y-auto px-2 space-y-3 pb-4">
          {/* My Profile Card at Top (LINE Specification) */}
          {currentUser && (
            <div className="p-3 rounded-2xl bg-[#0f1218]/90 border border-zinc-800/80 shadow-sm flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <div
                  className="w-12 h-12 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center font-mono font-bold text-sm text-zinc-100 shadow-inner"
                  style={{
                    borderColor: currentUser.avatarColor ? `${currentUser.avatarColor}70` : undefined,
                    color: currentUser.avatarColor || undefined,
                  }}
                >
                  {getInitials(currentUser.displayName, currentUser.username)}
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0f1218]" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-bold text-xs text-zinc-100 truncate">
                    {currentUser.displayName || currentUser.username}
                  </span>
                  <span className="text-[10px] font-mono text-indigo-400 font-semibold px-1.5 py-0.2 rounded bg-indigo-950/60 border border-indigo-900/40">
                    You
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-sans truncate mt-0.5">
                  {currentUser.bio || 'Building cool stuff 💻'}
                </p>
              </div>
            </div>
          )}

          {/* Section 1: "Direct Friends / People" */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setPeopleSectionOpen(!peopleSectionOpen)}
              className="w-full px-2 py-1 flex items-center justify-between text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors uppercase tracking-wider font-semibold cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                {peopleSectionOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                <span>Direct Friends / People</span>
              </div>
              <span>{filteredFriends.length}</span>
            </button>

            {peopleSectionOpen && (
              <div className="space-y-0.5">
                {filteredFriends.length === 0 ? (
                  <div className="py-6 text-center text-xs text-zinc-500 font-mono">
                    No friends found matching "{searchQuery}"
                  </div>
                ) : (
                  filteredFriends.map((friend) => {
                    const status = getUserStatus(friend);
                    const isDevBot = friend.id === 'devbot' || friend.isBot;

                    return (
                      <div
                        key={friend.id}
                        id={`friend-card-${friend.username}`}
                        onDoubleClick={() => {
                          onStartDM(friend);
                          onCloseMobile();
                        }}
                        className="group w-full p-2.5 rounded-2xl flex items-center justify-between gap-2.5 hover:bg-white/[0.04] transition-all cursor-pointer border border-transparent hover:border-zinc-800/80"
                      >
                        {/* Friend Avatar & Info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative flex-shrink-0">
                            {isDevBot ? (
                              <div className="w-11 h-11 rounded-full bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400 shadow-sm">
                                <Bot className="w-5 h-5" />
                              </div>
                            ) : (
                              <div
                                className="w-11 h-11 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center font-mono font-bold text-xs text-zinc-200 shadow-inner"
                                style={{
                                  borderColor: friend.avatarColor ? `${friend.avatarColor}60` : undefined,
                                  color: friend.avatarColor || undefined,
                                }}
                              >
                                {getInitials(friend.displayName, friend.username)}
                              </div>
                            )}

                            {/* Active Presence Status Dot */}
                            <span
                              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#161a23] ${
                                status === 'Online'
                                  ? 'bg-emerald-500'
                                  : status === 'Idle'
                                  ? 'bg-amber-500'
                                  : 'bg-zinc-600'
                              }`}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-semibold text-xs text-zinc-100 truncate">
                                {friend.displayName || friend.username}
                              </span>
                              {isDevBot && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-indigo-950 text-indigo-400 border border-indigo-800/50">
                                  AI
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-zinc-500 truncate">
                              @{friend.username}
                            </div>
                            {friend.bio && (
                              <div className="text-[11px] text-zinc-400 font-sans truncate mt-0.5 max-w-[170px]">
                                {friend.bio}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* "Chat" Action Button */}
                        <button
                          type="button"
                          onClick={() => {
                            onStartDM(friend);
                            onCloseMobile();
                          }}
                          title={`Chat with ${friend.displayName || friend.username}`}
                          className="px-3 py-1.5 rounded-full bg-indigo-600/15 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 hover:border-transparent text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0 opacity-90 group-hover:opacity-100 shadow-sm"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Chat</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Section 2: "Channels / Groups" */}
          <div className="space-y-1 pt-2 border-t border-zinc-800/60">
            <button
              type="button"
              onClick={() => setChannelsSectionOpen(!channelsSectionOpen)}
              className="w-full px-2 py-1 flex items-center justify-between text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors uppercase tracking-wider font-semibold cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                {channelsSectionOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                <span>Channels / Groups</span>
              </div>
              <span>{filteredChannels.length}</span>
            </button>

            {channelsSectionOpen && (
              <div className="space-y-0.5">
                {filteredChannels.map((channel) => (
                  <div
                    key={channel.id}
                    id={`channel-card-${channel.name}`}
                    onClick={() => {
                      onSelectChannel(channel.id);
                      onCloseMobile();
                    }}
                    className="group w-full p-2.5 rounded-2xl flex items-center justify-between gap-2.5 hover:bg-white/[0.04] transition-all cursor-pointer border border-transparent hover:border-zinc-800/80"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-indigo-400 flex-shrink-0 shadow-inner">
                        <Hash className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-zinc-100 truncate">
                          #{channel.name}
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate max-w-[170px]">
                          {channel.description || 'Public channel'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectChannel(channel.id);
                        onCloseMobile();
                      }}
                      className="px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-indigo-600 text-zinc-300 hover:text-white border border-zinc-700 hover:border-transparent text-xs font-mono transition-all flex items-center gap-1 cursor-pointer flex-shrink-0"
                    >
                      <span>Open</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default FriendsList;
