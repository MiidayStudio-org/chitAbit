import React from 'react';
import { NavigationTab, User } from '../../types';
import { Files, Users, Search, Settings, User as UserIcon, Terminal } from 'lucide-react';
import { FileIcon } from '../../utils/fileIcons';
import { DualIdentityAvatar } from './DualIdentityAvatar';

export interface ActivityBarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  currentUser: User | null;
  unreadCount?: number;
  friendRequestsCount?: number;
  onOpenSettingsTab?: () => void;
  onOpenProfile?: () => void;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  unreadCount = 0,
  friendRequestsCount = 0,
  onOpenSettingsTab,
  onOpenProfile,
}) => {
  return (
    <div
      aria-label="VS Code Activity Bar"
      className="w-12 flex-shrink-0 bg-[var(--activity-bar)] border-r border-[var(--border)] flex flex-col items-center justify-between select-none z-30 h-full"
    >
      {/* Top Icons */}
      <div className="flex flex-col items-center w-full">
        {/* ChatAbit Terminal Brand Logo */}
        <div
          title="ChatAbit — VS Code Real-Time Chat"
          className="w-12 h-11 flex items-center justify-center border-b border-[var(--border)] text-[#007acc] mb-1"
        >
          <div className="p-1.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] light-plus:bg-white light-plus:border-[#e0e0e0] shadow-sm flex items-center justify-center">
            <Terminal className="w-4 h-4 stroke-[2.4] text-[#007acc]" />
          </div>
        </div>
        {/* 1. Main / Explorer */}
        <button
          type="button"
          id="activity-bar-explorer"
          title="Main (Chats & Bots)"
          onClick={() => onSelectTab('explorer')}
          className={`w-12 h-12 flex items-center justify-center relative cursor-pointer transition-colors ${
            activeTab === 'explorer'
              ? 'text-white'
              : 'text-[#858585] hover:text-[#cccccc]'
          }`}
        >
          {activeTab === 'explorer' && (
            <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-white" />
          )}
          <Files className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 min-w-[16px] h-4 px-1 bg-[#007acc] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* 2. Search */}
        <button
          type="button"
          id="activity-bar-search"
          title="Search (Ctrl+Shift+F)"
          onClick={() => onSelectTab('search')}
          className={`w-12 h-12 flex items-center justify-center relative cursor-pointer transition-colors ${
            activeTab === 'search'
              ? 'text-white'
              : 'text-[#858585] hover:text-[#cccccc]'
          }`}
        >
          {activeTab === 'search' && (
            <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-white" />
          )}
          <Search className="w-5 h-5" />
        </button>

        {/* 3. Friends Directory */}
        <button
          type="button"
          id="activity-bar-friends"
          title="Friends & Contacts"
          onClick={() => onSelectTab('friends')}
          className={`w-12 h-12 flex items-center justify-center relative cursor-pointer transition-colors ${
            activeTab === 'friends'
              ? 'text-white'
              : 'text-[#858585] hover:text-[#cccccc]'
          }`}
        >
          {activeTab === 'friends' && (
            <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-white" />
          )}
          <Users className="w-5 h-5" />
          {friendRequestsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-[#cba6f7] text-[#11111b] font-extrabold text-[9px] rounded-full flex items-center justify-center shadow-md animate-pulse">
              {friendRequestsCount > 99 ? '99+' : friendRequestsCount}
            </span>
          )}
        </button>
      </div>

      {/* Bottom Icons: Account & Settings */}
      <div className="flex flex-col items-center w-full mb-1">
        {/* Account Profile Icon (Using User's File Icon!) */}
        <button
          type="button"
          id="activity-bar-account"
          title={`Signed in as @${currentUser?.username} • Click to view profile`}
          onClick={onOpenProfile || onOpenSettingsTab || (() => onSelectTab('settings'))}
          className="w-12 h-10 flex items-center justify-center relative cursor-pointer text-[#858585] hover:text-[#cccccc] transition-colors"
        >
          <DualIdentityAvatar
            avatarUrl={currentUser?.avatarUrl}
            fileIcon={currentUser?.fileIcon || 'ts'}
            size={22}
            alt={currentUser?.username}
          />
        </button>

        {/* Settings Gear */}
        <button
          type="button"
          id="activity-bar-settings"
          title="Settings (Ctrl+,)"
          onClick={onOpenSettingsTab || (() => onSelectTab('settings'))}
          className={`w-12 h-10 flex items-center justify-center relative cursor-pointer transition-colors ${
            activeTab === 'settings'
              ? 'text-white'
              : 'text-[#858585] hover:text-[#cccccc]'
          }`}
        >
          {activeTab === 'settings' && (
            <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-white" />
          )}
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
