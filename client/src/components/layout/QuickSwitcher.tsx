import React, { useState, useEffect, useRef } from 'react';
import { Channel, User, OnlineUser } from '../../types';
import { Hash, User as UserIcon, Bot, Search, X } from 'lucide-react';

interface QuickSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  channels: Channel[];
  users: User[];
  onlineUsers: OnlineUser[];
  onSelectChannel: (channelId: string) => void;
  onSelectDM: (userId: string) => void;
}

export const QuickSwitcher: React.FC<QuickSwitcherProps> = ({
  isOpen,
  onClose,
  channels,
  users,
  onlineUsers,
  onSelectChannel,
  onSelectDM,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(query.toLowerCase()) ||
    u.displayName.toLowerCase().includes(query.toLowerCase())
  );

  const totalItems = filteredChannels.length + filteredUsers.length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (totalItems > 0 ? (prev + 1) % totalItems : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (totalItems > 0 ? (prev - 1 + totalItems) % totalItems : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < filteredChannels.length) {
        onSelectChannel(filteredChannels[selectedIndex].id);
        onClose();
      } else {
        const u = filteredUsers[selectedIndex - filteredChannels.length];
        if (u) {
          onSelectDM(u.id);
          onClose();
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/80 backdrop-blur-md select-none">
      <div className="bg-[#090b0d] border border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-zinc-800 gap-3">
          <Search className="w-4 h-4 text-zinc-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a channel name or teammate to jump to... (Esc to close)"
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none font-mono"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {/* Channels Section */}
          {filteredChannels.length > 0 && (
            <div className="mb-2">
              <div className="px-3 py-1 text-[10px] font-mono font-medium text-zinc-500 uppercase tracking-wider">
                Channels
              </div>
              {filteredChannels.map((c, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onSelectChannel(c.id);
                      onClose();
                    }}
                    className={`w-full px-3 py-2 rounded-lg flex items-center justify-between text-left transition-colors text-xs font-mono ${
                      isSelected
                        ? 'bg-indigo-500/15 text-indigo-300'
                        : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Hash className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-400' : 'text-zinc-500'}`} />
                      <span className="font-semibold">{c.name}</span>
                    </div>
                    {c.description && (
                      <span className="text-[11px] truncate max-w-xs text-zinc-500">
                        {c.description}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Users Section */}
          {filteredUsers.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-mono font-medium text-zinc-500 uppercase tracking-wider">
                Direct Messages
              </div>
              {filteredUsers.map((u, idx) => {
                const itemIndex = filteredChannels.length + idx;
                const isSelected = selectedIndex === itemIndex;
                const isOnline = onlineUsers.some((ou) => ou.id === u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      onSelectDM(u.id);
                      onClose();
                    }}
                    className={`w-full px-3 py-2 rounded-lg flex items-center justify-between text-left transition-colors text-xs font-mono ${
                      isSelected
                        ? 'bg-indigo-500/15 text-indigo-300'
                        : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {u.isBot ? (
                        <Bot className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-300' : 'text-indigo-400'}`} />
                      ) : (
                        <div className="relative">
                          <UserIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-300' : 'text-zinc-500'}`} />
                          {isOnline && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          )}
                        </div>
                      )}
                      <span className="font-medium">{u.displayName || u.username}</span>
                      {u.isBot && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-indigo-950 text-indigo-400 border border-indigo-800/50">
                          AI
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-500">
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {totalItems === 0 && (
            <div className="py-8 text-center text-xs text-zinc-500 font-mono">
              No channels or users match "{query}"
            </div>
          )}
        </div>

        {/* Footer shortcuts info */}
        <div className="px-4 py-2 bg-[#0d0f12] border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span>Navigate with ↑ ↓</span>
          <span>Press Enter to select</span>
        </div>
      </div>
    </div>
  );
};
