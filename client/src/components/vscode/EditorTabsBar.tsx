import React from 'react';
import { OpenTab } from '../../types';
import { X } from 'lucide-react';
import { FileIcon } from '../../utils/fileIcons';

export interface EditorTabsBarProps {
  tabs: OpenTab[];
  activeTabId: string | null;
  unreadCounts: Record<string, number>;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
}

export const EditorTabsBar: React.FC<EditorTabsBarProps> = ({
  tabs,
  activeTabId,
  unreadCounts,
  onSelectTab,
  onCloseTab,
}) => {
  return (
    <div
      aria-label="Editor Tabs"
      className="h-9 bg-[var(--tab-inactive)] border-b border-[var(--border)] flex items-center overflow-x-auto select-none z-10 flex-shrink-0 text-xs font-mono"
    >
      {tabs.map((tab) => {
        const isActive = activeTabId === tab.id;
        const unread = unreadCounts[tab.id] || 0;

        return (
          <div
            key={tab.id}
            id={`editor-tab-${tab.id}`}
            onClick={() => onSelectTab(tab.id)}
            onAuxClick={(e) => {
              if (e.button === 1) {
                // Middle click closes tab
                e.preventDefault();
                onCloseTab(tab.id);
              }
            }}
            className={`h-full flex items-center gap-2 px-3 border-r border-[var(--border)] cursor-pointer group transition-colors relative flex-shrink-0 max-w-[200px] ${
              isActive
                ? 'bg-[var(--tab-active)] text-[var(--text)]'
                : 'bg-[var(--tab-inactive)] text-[var(--muted)] hover:opacity-90'
            }`}
          >
            {/* Active Tab Top Accent Border (VS Code Signature) */}
            {isActive && (
              <span className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--accent)]" />
            )}

            {/* File Icon */}
            <FileIcon
              name={tab.fileIcon}
              isFolder={tab.type === 'channel'}
              isOpenFolder={tab.type === 'channel' && isActive}
              isBot={tab.isBot}
              size={14}
            />

            {/* Tab Name Label */}
            <span className="truncate">{tab.displayName}</span>

            {/* Unread indicator */}
            {unread > 0 && !isActive && (
              <span className="w-2 h-2 rounded-full bg-[#007acc] flex-shrink-0" />
            )}

            {/* Close "x" button */}
            <button
              type="button"
              title="Close (Ctrl+W)"
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              className="p-0.5 rounded text-[#858585] hover:text-white hover:bg-[#3c3c3c] light-plus:hover:bg-[#d0d0d0] light-plus:hover:text-black transition-colors opacity-0 group-hover:opacity-100 cursor-pointer ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}

      {tabs.length === 0 && (
        <div className="px-4 text-xs text-[#858585] italic">
          No files open. Select a chat from the Explorer.
        </div>
      )}
    </div>
  );
};
