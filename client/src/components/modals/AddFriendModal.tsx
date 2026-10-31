import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { Search, UserPlus, Check, X, Loader2 } from 'lucide-react';
import { getInitials } from '../../utils/chatUtils';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  onFriendAdded?: () => void;
}

export const AddFriendModal: React.FC<AddFriendModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  onFriendAdded,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sendingMap, setSendingMap] = useState<Record<string, boolean>>({});
  const [successMap, setSuccessMap] = useState<Record<string, string>>({});
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSuccessMap({});
      setErrorMap({});
      return;
    }
  }, [isOpen]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    const clean = query.trim();
    if (!clean) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/friends/search?q=${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (data.users) {
        // filter out current user and devbot
        setSearchResults(data.users.filter((u: User) => u.id !== currentUserId && u.id !== 'devbot'));
      }
    } catch (err) {
      console.error('Search friends failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (targetUser: User) => {
    setSendingMap((prev) => ({ ...prev, [targetUser.id]: true }));
    setErrorMap((prev) => ({ ...prev, [targetUser.id]: '' }));

    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUserId,
          targetUsername: targetUser.username,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMap((prev) => ({ ...prev, [targetUser.id]: data.error || 'Failed to send request' }));
      } else {
        const msg = data.autoAccepted ? 'Friend added!' : 'Request sent!';
        setSuccessMap((prev) => ({ ...prev, [targetUser.id]: msg }));
        if (onFriendAdded) onFriendAdded();
      }
    } catch (err: any) {
      setErrorMap((prev) => ({ ...prev, [targetUser.id]: err?.message || 'Network error' }));
    } finally {
      setSendingMap((prev) => ({ ...prev, [targetUser.id]: false }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#06C755]/15 text-[#06C755] flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-base text-zinc-900 dark:text-white">Add Friend</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="mt-4 relative">
          <span className="absolute left-3.5 top-3 text-zinc-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            id="add-friend-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by username or ID..."
            className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl pl-10 pr-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-[#06C755] focus:ring-2 focus:ring-[#06C755]/20 transition-all"
            autoFocus
          />
        </div>

        {/* Search Results */}
        <div className="mt-4 max-h-72 overflow-y-auto space-y-2">
          {isSearching && (
            <div className="flex items-center justify-center py-8 text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}

          {!isSearching && searchQuery.trim() && searchResults.length === 0 && (
            <div className="text-center py-8 text-xs text-zinc-400">
              No registered user found matching "{searchQuery}"
            </div>
          )}

          {!isSearching && !searchQuery.trim() && (
            <div className="text-center py-8 text-xs text-zinc-400">
              Type a username above to find and add real users
            </div>
          )}

          {!isSearching &&
            searchResults.map((user) => {
              const isSending = sendingMap[user.id];
              const successText = successMap[user.id];
              const errorText = errorMap[user.id];

              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.displayName}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: user.avatarColor || '#06C755' }}
                      >
                        {getInitials(user.displayName || user.username)}
                      </div>
                    )}
                    <div className="truncate">
                      <div className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                        {user.displayName || user.username}
                      </div>
                      <div className="text-xs text-zinc-400 truncate">@{user.username}</div>
                    </div>
                  </div>

                  <div className="flex-shrink-0 ml-2">
                    {successText ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-[#06C755] bg-[#06C755]/10 px-3 py-1.5 rounded-full">
                        <Check className="w-3.5 h-3.5" />
                        {successText}
                      </span>
                    ) : (
                      <button
                        type="button"
                        id={`btn-add-friend-${user.username}`}
                        onClick={() => handleSendRequest(user)}
                        disabled={isSending}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#06C755] hover:bg-[#05b34c] disabled:opacity-50 text-white text-xs font-semibold rounded-full transition-all cursor-pointer shadow-sm shadow-[#06C755]/20"
                      >
                        {isSending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="w-3.5 h-3.5" />
                        )}
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                  {errorText && (
                    <div className="w-full text-[10px] text-red-500 mt-1">{errorText}</div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
