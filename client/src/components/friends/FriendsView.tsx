import React, { useState } from 'react';
import { User, ActiveChat, FriendRequest } from '../../types';
import { Search, UserPlus, MessageSquare, Check, X, UserMinus, ShieldAlert } from 'lucide-react';
import { getInitials } from '../../utils/chatUtils';

interface FriendsViewProps {
  currentUser: User | null;
  friends: User[];
  friendRequests: FriendRequest[];
  onlineUsers: { id: string }[];
  onSelectChat: (chat: ActiveChat) => void;
  onOpenAddFriend: () => void;
  onRespondFriendRequest: (requestId: string, action: 'accept' | 'decline') => void;
  onRemoveFriend: (friendId: string) => void;
}

export const FriendsView: React.FC<FriendsViewProps> = ({
  currentUser,
  friends,
  friendRequests,
  onlineUsers,
  onSelectChat,
  onOpenAddFriend,
  onRespondFriendRequest,
  onRemoveFriend,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const onlineFriendIds = new Set(onlineUsers.map((u) => u.id));

  const filteredFriends = friends.filter((f) => {
    const q = filterQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      f.username.toLowerCase().includes(q) ||
      (f.displayName && f.displayName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-80 md:w-96 flex-shrink-0 h-full bg-white dark:bg-[#161920] border-r border-zinc-200 dark:border-zinc-800 flex flex-col select-none transition-colors">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Friends</h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
            {friends.length}
          </span>
        </div>
        <button
          type="button"
          id="btn-open-add-friend"
          onClick={onOpenAddFriend}
          title="Add Friend"
          className="p-2 rounded-xl bg-[#06C755]/10 hover:bg-[#06C755]/20 text-[#06C755] cursor-pointer transition-all"
        >
          <UserPlus className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="px-4 py-2.5">
        <div className="relative">
          <span className="absolute left-3 top-2.5 text-zinc-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            id="friends-search-input"
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search friends..."
            className="w-full bg-zinc-100 dark:bg-zinc-850 border-0 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#06C755]/30 transition-all"
          />
        </div>
      </div>

      {/* Scrollable Friends Directory */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {/* 1. My Profile Card (LINE Style) */}
        <div>
          <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            My Profile
          </span>
          <div className="mt-1 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center gap-3">
            <div className="relative flex-shrink-0">
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.displayName}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm"
                  style={{ backgroundColor: currentUser?.avatarColor || '#06C755' }}
                >
                  {getInitials(currentUser?.displayName || currentUser?.username || '?')}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#06C755] ring-2 ring-white dark:ring-zinc-800" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                {currentUser?.displayName || currentUser?.username}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {currentUser?.bio || 'Available'}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Pending Friend Requests (if any) */}
        {friendRequests.length > 0 && (
          <div>
            <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-[#06C755] flex items-center gap-1">
              Friend Requests ({friendRequests.length})
            </span>
            <div className="mt-1 space-y-2">
              {friendRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: req.sender_avatar_color || '#06C755' }}
                    >
                      {getInitials(req.sender_display_name || req.sender_username || '?')}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                        {req.sender_display_name || req.sender_username}
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate">
                        @{req.sender_username}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      id={`btn-accept-request-${req.id}`}
                      onClick={() => onRespondFriendRequest(req.id, 'accept')}
                      title="Accept"
                      className="p-1.5 rounded-full bg-[#06C755] text-white hover:bg-[#05b34c] cursor-pointer shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      id={`btn-decline-request-${req.id}`}
                      onClick={() => onRespondFriendRequest(req.id, 'decline')}
                      title="Decline"
                      className="p-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Real Friends List */}
        <div>
          <div className="px-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            <span>Friends ({filteredFriends.length})</span>
          </div>

          {filteredFriends.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              {friends.length === 0
                ? 'No friends yet. Click the + button above to add someone!'
                : 'No friends match your search.'}
            </div>
          ) : (
            <div className="mt-1 space-y-1">
              {filteredFriends.map((f) => {
                const isOnline = onlineFriendIds.has(f.id);
                return (
                  <div
                    key={f.id}
                    className="group flex items-center justify-between p-2.5 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-all cursor-pointer"
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
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex-shrink-0">
                        {f.avatarUrl ? (
                          <img
                            src={f.avatarUrl}
                            alt={f.displayName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                            style={{ backgroundColor: f.avatarColor || '#06C755' }}
                          >
                            {getInitials(f.displayName || f.username)}
                          </div>
                        )}
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-zinc-800 ${
                            isOnline ? 'bg-[#06C755]' : 'bg-zinc-400'
                          }`}
                        />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-zinc-900 dark:text-white truncate group-hover:text-[#06C755] transition-colors">
                          {f.displayName || f.username}
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate">
                          {f.bio || (isOnline ? 'Online' : 'Offline')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectChat({
                            type: 'dm',
                            id: f.id,
                            name: f.username,
                            displayName: f.displayName || f.username,
                            avatarColor: f.avatarColor,
                            avatarUrl: f.avatarUrl,
                            status: isOnline ? 'Online' : 'Offline',
                            bio: f.bio,
                          });
                        }}
                        title="Open Chat"
                        className="p-1.5 rounded-full bg-[#06C755]/15 text-[#06C755] hover:bg-[#06C755] hover:text-white cursor-pointer transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Remove ${f.displayName || f.username} from your friends?`)) {
                            onRemoveFriend(f.id);
                          }
                        }}
                        title="Remove Friend"
                        className="p-1.5 rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-all"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
