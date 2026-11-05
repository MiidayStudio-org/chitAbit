import React from 'react';
import { OpenTab } from '../../types';
import { X, Sparkles, Hash, Sliders, PanelLeft } from 'lucide-react';
import { FileIcon } from '../../utils/fileIcons';

export interface EditorTabsBarProps {
  tabs: OpenTab[];
  activeTabId: string | null;
  unreadCounts: Record<string, number>;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onToggleSplit?: () => void;
  isSplitOpen?: boolean;
  onToggleBottomPanel?: () => void;
  isBottomPanelOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const EditorTabsBar: React.FC<EditorTabsBarProps> = ({
  tabs,
  activeTabId,
  unreadCounts,
  onSelectTab,
  onCloseTab,
  onToggleSplit: _onToggleSplit,
  isSplitOpen: _isSplitOpen = false,
  onToggleBottomPanel: _onToggleBottomPanel,
  isBottomPanelOpen: _isBottomPanelOpen = false,
  onToggleSidebar,
}) => {
  const getTabLabel = (tab: OpenTab) => {
    if (tab.id === 'settings') return 'settings.json';
    if (tab.id === 'devbot' || tab.isBot) return 'devbot.ai';
    if (tab.type === 'channel') {
      const cleanName = tab.name.replace(/^#\s*/, '').replace(/\.chat$/, '');
      return `# ${cleanName}.chat`;
    }
    const cleanDm = tab.name.replace(/^@\s*/, '').replace(/\.chat$/, '');
    return `@${cleanDm}.chat`;
  };

  const renderTabIcon = (tab: OpenTab, isActive: boolean) => {
    if (tab.id === 'settings') {
      return <Sliders className="w-3.5 h-3.5 text-[#f9e2af] flex-shrink-0" />;
    }
    if (tab.id === 'devbot' || tab.isBot) {
      return <Sparkles className="w-3.5 h-3.5 text-[#f9e2af] flex-shrink-0" />;
    }
    if (tab.type === 'channel') {
      return <Hash className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-[#cba6f7]' : 'text-[#89b4fa]'}`} />;
    }
    return (
      <FileIcon
        name={tab.fileIcon || 'ts'}
        isFolder={false}
        size={14}
      />
    );
  };

  return (
    <div
      aria-label="Editor Tabs"
      className="h-9 bg-[#181825] border-b border-[#313244] flex items-center justify-between select-none z-10 flex-shrink-0 text-xs font-mono"
    >
      {/* Mobile Sidebar Toggle Button */}
      {onToggleSidebar && (
        <button
          type="button"
          onClick={onToggleSidebar}
          title="Toggle Sidebar (Ctrl+B)"
          className="md:hidden flex items-center justify-center px-2.5 h-full text-[#a6adc8] hover:text-[#cdd6f4] hover:bg-[#313244] border-r border-[#313244] cursor-pointer flex-shrink-0"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      )}

      {/* Scrollable Tabs Strip */}
      <div className="flex items-center h-full overflow-x-auto flex-1">
        {tabs.map((tab) => {
          const isActive = activeTabId === tab.id;
          const unread = unreadCounts[tab.id] || 0;
          const label = getTabLabel(tab);

          return (
            <div
              key={tab.id}
              id={`editor-tab-${tab.id}`}
              onClick={() => onSelectTab(tab.id)}
              onAuxClick={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  onCloseTab(tab.id);
                }
              }}
              className={`h-full flex items-center gap-2 px-3.5 border-r border-[#313244] cursor-pointer group transition-colors relative flex-shrink-0 max-w-[220px] ${
                isActive
                  ? 'bg-[#1e1e2e] text-[#cdd6f4] font-medium'
                  : 'bg-[#181825] text-[#6c7086] hover:bg-[#1e1e2e]/50 hover:text-[#a6adc8]'
              }`}
            >
              {/* Active Tab Top Accent Border (VS Code Signature) */}
              {isActive && (
                <span className="absolute top-0 left-0 right-0 h-[2px] bg-[#cba6f7]" />
              )}

              {/* Chat File Icon */}
              {renderTabIcon(tab, isActive)}

              {/* Tab Filename Label */}
              <span className="truncate">{label}</span>

              {/* Unread dot indicator */}
              {unread > 0 && !isActive && (
                <span className="w-2 h-2 rounded-full bg-[#cba6f7] flex-shrink-0" />
              )}

              {/* Hover Close Button ('×') */}
              <button
                type="button"
                title="Close Tab (Ctrl+W)"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className={`p-0.5 rounded text-[#6c7086] hover:text-[#f38ba8] hover:bg-[#313244] transition-all cursor-pointer ml-1 ${
                  isActive ? 'opacity-70 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        {tabs.length === 0 && (
          <div className="px-4 text-xs text-[#6c7086] italic">
            No chats open. Select a channel from the Explorer.
          </div>
        )}
      </div>
    </div>
  );
};
