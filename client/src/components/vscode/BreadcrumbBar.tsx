import React from 'react';
import { ActiveChat } from '../../types';
import { ChevronRight } from 'lucide-react';
import { FileIcon } from '../../utils/fileIcons';

export interface BreadcrumbBarProps {
  activeChat: ActiveChat | null;
}

export const BreadcrumbBar: React.FC<BreadcrumbBarProps> = ({ activeChat }) => {
  if (!activeChat) return null;

  const isChannel = activeChat.type === 'channel';
  const isBot = Boolean(activeChat.isBot);
  const folderCategory = isChannel ? 'channels' : isBot ? 'bots' : 'direct';

  return (
    <div
      aria-label="Breadcrumb Bar"
      className="h-6 px-4 bg-[var(--bg)] border-b border-[var(--border)] flex items-center gap-1.5 text-[11px] font-mono text-[var(--muted)] select-none flex-shrink-0"
    >
      <span className="hover:text-[#cccccc] light-plus:hover:text-[#333333] cursor-pointer">
        chitAbit
      </span>
      <ChevronRight className="w-3 h-3 text-[#555555]" />
      <span className="hover:text-[#cccccc] light-plus:hover:text-[#333333] cursor-pointer">
        chats
      </span>
      <ChevronRight className="w-3 h-3 text-[#555555]" />
      <span className="hover:text-[#cccccc] light-plus:hover:text-[#333333] cursor-pointer">
        {folderCategory}
      </span>
      <ChevronRight className="w-3 h-3 text-[#555555]" />
      <div className="flex items-center gap-1.5 text-[#cccccc] light-plus:text-[#333333] font-medium">
        <FileIcon
          name={activeChat.fileIcon}
          isFolder={isChannel}
          isOpenFolder={isChannel}
          isBot={isBot}
          size={13}
        />
        <span>{activeChat.displayName || activeChat.name}</span>
      </div>
    </div>
  );
};
