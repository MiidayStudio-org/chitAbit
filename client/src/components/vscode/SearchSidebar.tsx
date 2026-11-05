import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Hash, AtSign, Paperclip, Loader2, X, ChevronRight } from 'lucide-react';
import { Message, ActiveChat, Channel, User } from '../../types';

export interface SearchSidebarProps {
  channels: Channel[];
  friends: User[];
  onJumpToMessage: (chat: ActiveChat, messageId: string) => void;
  onClose?: () => void;
}

export const SearchSidebar: React.FC<SearchSidebarProps> = ({
  channels,
  friends,
  onJumpToMessage,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Message[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/messages/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setResults(data.messages || []);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 250);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query]);

  const addFilter = (filterPrefix: string) => {
    setQuery((prev) => (prev ? `${prev.trim()} ${filterPrefix}` : filterPrefix));
  };

  const handleResultClick = (msg: Message) => {
    if (msg.channel_id) {
      const ch = channels.find((c) => c.id === msg.channel_id);
      const chat: ActiveChat = {
        type: 'channel',
        id: msg.channel_id,
        name: ch?.name || msg.channel_id,
        displayName: ch?.name || msg.channel_id,
        fileIcon: 'folder',
      };
      onJumpToMessage(chat, msg.id);
    } else {
      // DM: determine recipient vs sender
      const otherUserId = msg.dm_recipient_id;
      const friend = friends.find((f) => f.id === msg.sender_id || f.id === otherUserId);
      const targetId = friend ? friend.id : (otherUserId || msg.sender_id);
      const targetName = friend ? friend.username : (msg.sender_username || 'Direct Message');

      const chat: ActiveChat = {
        type: 'dm',
        id: targetId,
        name: targetName,
        displayName: `${targetName}.json`,
        fileIcon: 'json',
      };
      onJumpToMessage(chat, msg.id);
    }
  };

  return (
    <aside
      aria-label="VS Code Search Side Bar"
      className="w-72 md:w-80 flex-shrink-0 bg-[var(--sidebar)] text-[var(--text)] border-r border-[var(--border)] flex flex-col h-full select-none text-[13px] font-sans transition-all fixed md:relative left-12 md:left-0 top-0 bottom-0 z-30 md:z-auto shadow-2xl md:shadow-none"
    >
      {/* Title Bar */}
      <div className="h-9 px-4 flex items-center justify-between text-[11px] font-bold tracking-wider uppercase text-[#bbbbbb] light-plus:text-[#555555]">
        <span>SEARCH</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-[#37373d] light-plus:hover:bg-[#e0e0e0] rounded text-[#cccccc] light-plus:text-[#555555] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Search Input Box */}
      <div className="p-3 border-b border-[#3c3c3c] light-plus:border-[#e7e7e7] space-y-2">
        <div className="relative flex items-center">
          <span className="absolute left-2.5 text-[#858585]">
            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#007acc]" /> : <Search className="w-3.5 h-3.5" />}
          </span>
          <input
            id="vscode-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages (e.g. from:@user in:#gen)..."
            className="w-full bg-[#3c3c3c] light-plus:bg-white text-[#cccccc] light-plus:text-[#333333] border border-[#3c3c3c] focus:border-[#007acc] rounded-sm pl-8 pr-7 py-1 text-xs outline-none font-mono"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 text-[#858585] hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-[10px] font-mono">
          <button
            type="button"
            onClick={() => addFilter('from:@')}
            className="px-1.5 py-0.5 rounded bg-[#2a2d2e] light-plus:bg-[#e8e8e8] text-[#858585] hover:text-[#007acc] border border-[#3c3c3c] light-plus:border-[#e0e0e0] flex items-center gap-1 cursor-pointer"
          >
            <AtSign className="w-2.5 h-2.5" />
            <span>from:</span>
          </button>
          <button
            type="button"
            onClick={() => addFilter('in:#')}
            className="px-1.5 py-0.5 rounded bg-[#2a2d2e] light-plus:bg-[#e8e8e8] text-[#858585] hover:text-[#007acc] border border-[#3c3c3c] light-plus:border-[#e0e0e0] flex items-center gap-1 cursor-pointer"
          >
            <Hash className="w-2.5 h-2.5" />
            <span>in:</span>
          </button>
          <button
            type="button"
            onClick={() => addFilter('has:file')}
            className="px-1.5 py-0.5 rounded bg-[#2a2d2e] light-plus:bg-[#e8e8e8] text-[#858585] hover:text-[#007acc] border border-[#3c3c3c] light-plus:border-[#e0e0e0] flex items-center gap-1 cursor-pointer"
          >
            <Paperclip className="w-2.5 h-2.5" />
            <span>has:file</span>
          </button>
        </div>
      </div>

      {/* Results Header */}
      {hasSearched && (
        <div className="px-4 py-2 text-[11px] font-mono text-[#858585] border-b border-[var(--border)] flex items-center justify-between">
          <span>{results.length} {results.length === 1 ? 'result' : 'results'} found</span>
        </div>
      )}

      {/* Results List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs">
        {!hasSearched && !query && (
          <div className="p-4 text-center text-xs text-[#858585]">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Type keywords to search across channels and DMs.</p>
            <p className="text-[10px] mt-2 opacity-70">Filters: from:@user, in:#channel, has:file</p>
          </div>
        )}

        {hasSearched && results.length === 0 && !isSearching && (
          <div className="p-4 text-center text-xs text-[#858585]">
            No matching messages found for &quot;{query}&quot;
          </div>
        )}

        {results.map((msg) => {
          const locName = msg.channel_id ? `#${msg.channel_id}` : `@${msg.sender_username}`;
          const dateStr = new Date(msg.created_at).toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={msg.id}
              onClick={() => handleResultClick(msg)}
              className="p-2 rounded hover:bg-[#2a2d2e] light-plus:hover:bg-[#f0f0f0] cursor-pointer border border-transparent hover:border-[#3c3c3c] transition-colors group"
            >
              <div className="flex items-center justify-between text-[11px] text-[#4fc1ff] mb-1">
                <div className="flex items-center gap-1 truncate">
                  <ChevronRight className="w-3 h-3 text-[#858585] group-hover:text-[#4fc1ff]" />
                  <span className="font-semibold truncate">{locName}</span>
                </div>
                <span className="text-[10px] text-[#858585]">{dateStr}</span>
              </div>
              <div className="pl-4 text-xs text-[#cccccc] light-plus:text-[#333333] line-clamp-2">
                <span className="text-[#858585] mr-1.5">{msg.sender_username}:</span>
                <span>{msg.content}</span>
              </div>
              {msg.attachment_url && (
                <div className="pl-4 mt-1 flex items-center gap-1 text-[10px] text-[#007acc]">
                  <FileText className="w-3 h-3" />
                  <span>{msg.attachment_name || 'Attachment'}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};
