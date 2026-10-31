import React, { useState, useEffect, useRef } from 'react';
import { User } from '../../types';
import { Search, UserPlus, Check, X, Loader2 } from 'lucide-react';
import { FileIcon, getFileExtension } from '../../utils/fileIcons';

export interface AddFriendDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  onFriendAdded?: () => void;
}

export const AddFriendDialog: React.FC<AddFriendDialogProps> = ({
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSuccessMap({});
      setErrorMap({});
      setTimeout(() => inputRef.current?.focus(), 50);
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
        setSearchResults(
          data.users.filter((u: User) => u.id !== currentUserId && u.id !== 'devbot')
        );
      }
    } catch (err) {
      console.error('Search failed:', err);
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
        onFriendAdded?.();
      }
    } catch (err: any) {
      setErrorMap((prev) => ({ ...prev, [targetUser.id]: err?.message || 'Network error' }));
    } finally {
      setSendingMap((prev) => ({ ...prev, [targetUser.id]: false }));
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4 bg-black/50 select-none animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#252526] light-plus:bg-white border border-[#3c3c3c] light-plus:border-[#e7e7e7] shadow-2xl rounded overflow-hidden text-[#cccccc] light-plus:text-[#333333] font-mono text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Search Box */}
        <div className="p-2 border-b border-[#3c3c3c] light-plus:border-[#e7e7e7] flex items-center gap-2 bg-[#1e1e1e] light-plus:bg-[#f8f8f8]">
          <Search className="w-4 h-4 text-[#858585] flex-shrink-0" />
          <input
            ref={inputRef}
            id="vscode-add-friend-input"
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
            }}
            placeholder="Search username to add to direct messages..."
            className="w-full bg-transparent text-[13px] text-white light-plus:text-[#333333] placeholder-[#858585] outline-none border-none py-1"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#858585] hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto py-1">
          {isSearching && (
            <div className="p-4 flex items-center justify-center text-[#858585] gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#007acc]" />
              <span>Searching directory...</span>
            </div>
          )}

          {!isSearching && searchQuery.trim() && searchResults.length === 0 && (
            <div className="p-4 text-center text-[#858585] italic">
              No registered user found matching "{searchQuery}"
            </div>
          )}

          {!isSearching && !searchQuery.trim() && (
            <div className="p-4 text-center text-[#858585] italic">
              Type a username above to search registered members
            </div>
          )}

          {!isSearching &&
            searchResults.map((user) => {
              const isSending = sendingMap[user.id];
              const successText = successMap[user.id];
              const errorText = errorMap[user.id];
              const ext = getFileExtension(user.fileIcon);

              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-[#2a2d2e] light-plus:hover:bg-[#f0f0f0] transition-colors border-b border-[#2d2d2d] light-plus:border-[#f5f5f5]"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FileIcon name={user.fileIcon} size={16} />
                    <div>
                      <div className="font-bold text-white light-plus:text-[#222222]">
                        {user.username}
                        <span className="text-[#858585] font-normal ml-1">{ext}</span>
                      </div>
                      <div className="text-[10px] text-[#858585] truncate">
                        {user.displayName || user.username}
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0 ml-2">
                    {successText ? (
                      <span className="flex items-center gap-1 text-[11px] text-[#89d185] font-semibold">
                        <Check className="w-3.5 h-3.5" />
                        {successText}
                      </span>
                    ) : (
                      <button
                        type="button"
                        id={`btn-add-dialog-${user.username}`}
                        onClick={() => handleSendRequest(user)}
                        disabled={isSending}
                        className="flex items-center gap-1 px-2.5 py-1 bg-[#007acc] hover:bg-[#0062a3] disabled:opacity-50 text-white rounded text-[11px] font-semibold cursor-pointer"
                      >
                        {isSending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <UserPlus className="w-3 h-3" />
                        )}
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                  {errorText && (
                    <div className="w-full text-[10px] text-red-400 mt-1">{errorText}</div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
