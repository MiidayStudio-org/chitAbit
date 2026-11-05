import React, { useState, useRef, useEffect } from 'react';
import { ActiveChat, Channel, User } from '../../types';
import { ChevronRight, ChevronDown, Hash, Bot, User as UserIcon } from 'lucide-react';
import { FileIcon } from '../../utils/fileIcons';
import { channelToChat } from '../../utils/chatUtils';

export interface BreadcrumbBarProps {
  activeChat: ActiveChat | null;
  channels?: Channel[];
  friends?: User[];
  onSelectChat?: (chat: ActiveChat) => void;
}

export const BreadcrumbBar: React.FC<BreadcrumbBarProps> = ({
  activeChat,
  channels = [],
  friends = [],
  onSelectChat,
}) => {
  const [openDropdown, setOpenDropdown] = useState<'category' | 'item' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!activeChat) return null;

  const isChannel = activeChat.type === 'channel';
  const isBot = Boolean(activeChat.isBot);
  const folderCategory = isChannel ? 'channels' : isBot ? 'bots' : 'direct';

  return (
    <div
      ref={dropdownRef}
      aria-label="Breadcrumb Bar"
      className="h-6 px-3 bg-[var(--bg)] border-b border-[var(--border)] flex items-center gap-1.5 text-[11px] font-mono text-[var(--muted)] select-none flex-shrink-0 relative z-20"
    >
      <span className="hover:text-[#cccccc] light-plus:hover:text-[#333333] cursor-pointer">
        ChatAbit
      </span>
      <ChevronRight className="w-3 h-3 text-[#555555]" />
      <span className="hover:text-[#cccccc] light-plus:hover:text-[#333333] cursor-pointer">
        src
      </span>
      <ChevronRight className="w-3 h-3 text-[#555555]" />

      {/* Category Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenDropdown((prev) => (prev === 'category' ? null : 'category'))}
          className="hover:text-[#cccccc] light-plus:hover:text-[#333333] cursor-pointer flex items-center gap-0.5"
        >
          <span>{folderCategory}</span>
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>

        {openDropdown === 'category' && (
          <div className="absolute top-6 left-0 bg-[#252526] light-plus:bg-white border border-[#3c3c3c] light-plus:border-[#e7e7e7] shadow-xl rounded py-1 min-w-[140px] z-50">
            <button
              type="button"
              onClick={() => {
                if (channels.length > 0 && onSelectChat) {
                  onSelectChat(channelToChat(channels[0]));
                }
                setOpenDropdown(null);
              }}
              className="w-full px-2 py-1 flex items-center gap-2 hover:bg-[#007acc] hover:text-white cursor-pointer text-left text-xs"
            >
              <Hash className="w-3 h-3 text-[#007acc]" />
              <span>channels</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectChat?.({
                  type: 'dm',
                  id: 'devbot',
                  name: 'devbot',
                  displayName: 'devbot.ai',
                  fileIcon: 'bot',
                  isBot: true,
                });
                setOpenDropdown(null);
              }}
              className="w-full px-2 py-1 flex items-center gap-2 hover:bg-[#007acc] hover:text-white cursor-pointer text-left text-xs"
            >
              <Bot className="w-3 h-3 text-[#cca700]" />
              <span>bots</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (friends.length > 0 && onSelectChat) {
                  onSelectChat({
                    type: 'dm',
                    id: friends[0].id,
                    name: friends[0].username,
                    displayName: friends[0].displayName || friends[0].username,
                    fileIcon: friends[0].fileIcon || 'ts',
                  });
                }
                setOpenDropdown(null);
              }}
              className="w-full px-2 py-1 flex items-center gap-2 hover:bg-[#007acc] hover:text-white cursor-pointer text-left text-xs"
            >
              <UserIcon className="w-3 h-3 text-[#89d185]" />
              <span>direct (dms)</span>
            </button>
          </div>
        )}
      </div>

      <ChevronRight className="w-3 h-3 text-[#555555]" />

      {/* Target Item Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenDropdown((prev) => (prev === 'item' ? null : 'item'))}
          className="flex items-center gap-1 text-[#cccccc] light-plus:text-[#333333] font-medium hover:text-white cursor-pointer"
        >
          <FileIcon
            name={activeChat.fileIcon}
            isFolder={isChannel}
            isOpenFolder={isChannel}
            isBot={isBot}
            size={13}
          />
          <span>{activeChat.displayName || activeChat.name}</span>
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>

        {openDropdown === 'item' && onSelectChat && (
          <div className="absolute top-6 left-0 bg-[#252526] light-plus:bg-white border border-[#3c3c3c] light-plus:border-[#e7e7e7] shadow-xl rounded py-1 min-w-[160px] max-h-56 overflow-y-auto z-50">
            {isChannel &&
              channels.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => {
                    onSelectChat(channelToChat(ch));
                    setOpenDropdown(null);
                  }}
                  className={`w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-[#007acc] hover:text-white cursor-pointer text-left text-xs ${
                    activeChat.id === ch.id ? 'bg-[#007acc]/20 text-[#007acc] font-bold' : ''
                  }`}
                >
                  <FileIcon isFolder={true} size={13} />
                  <span>#{ch.name}</span>
                </button>
              ))}

            {!isChannel &&
              friends.map((fr) => (
                <button
                  key={fr.id}
                  type="button"
                  onClick={() => {
                    onSelectChat({
                      type: 'dm',
                      id: fr.id,
                      name: fr.username,
                      displayName: fr.displayName || fr.username,
                      fileIcon: fr.fileIcon || 'ts',
                    });
                    setOpenDropdown(null);
                  }}
                  className={`w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-[#007acc] hover:text-white cursor-pointer text-left text-xs ${
                    activeChat.id === fr.id ? 'bg-[#007acc]/20 text-[#007acc] font-bold' : ''
                  }`}
                >
                  <FileIcon name={fr.fileIcon || 'ts'} size={13} />
                  <span>@{fr.username}</span>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
