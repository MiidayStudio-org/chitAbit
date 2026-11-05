import React from 'react';
import { User, NavigationTab } from '../../types';
import { Home, MessageSquare, Users, Settings } from 'lucide-react';
import { getInitials } from '../../utils/chatUtils';

export interface NavigationRailProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  currentUser: User | null;
  unreadCount?: number;
  friendRequestsCount?: number;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  unreadCount = 0,
  friendRequestsCount = 0,
}) => {
  return (
    <nav
      aria-label="LINE Desktop Navigation Rail"
      className="w-16 flex-shrink-0 bg-[#f7f7f8] dark:bg-[#181b22] border-r border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-between py-4 select-none z-30 h-full transition-colors"
    >
      {/* Top: Brand Logo + Primary Tabs */}
      <div className="flex flex-col items-center w-full gap-6">
        {/* ChatAbit LINE Brand Icon */}
        <div
          title="ChatAbit LINE"
          onClick={() => onSelectTab('home')}
          className="w-10 h-10 rounded-2xl bg-[#06C755] flex items-center justify-center text-white shadow-md shadow-[#06C755]/30 cursor-pointer transition-transform hover:scale-105 active:scale-95"
        >
          <MessageSquare className="w-5 h-5 fill-white" />
        </div>

        {/* Vertical Tabs */}
        <div className="flex flex-col items-center w-full gap-2">
          {/* 1. Home */}
          <div className="relative w-full flex items-center justify-center">
            {activeTab === 'home' && (
              <span className="w-1 h-7 rounded-r-full bg-[#06C755] absolute left-0" />
            )}
            <button
              id="rail-tab-home"
              type="button"
              onClick={() => onSelectTab('home')}
              title="Home"
              className={`p-3 rounded-2xl relative transition-all cursor-pointer ${
                activeTab === 'home'
                  ? 'text-[#06C755] bg-[#06C755]/15'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <Home className="w-5 h-5" />
            </button>
          </div>

          {/* 2. Chats */}
          <div className="relative w-full flex items-center justify-center">
            {activeTab === 'chats' && (
              <span className="w-1 h-7 rounded-r-full bg-[#06C755] absolute left-0" />
            )}
            <button
              id="rail-tab-chats"
              type="button"
              onClick={() => onSelectTab('chats')}
              title="Chats"
              className={`p-3 rounded-2xl relative transition-all cursor-pointer ${
                activeTab === 'chats'
                  ? 'text-[#06C755] bg-[#06C755]/15'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#06C755] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* 3. Friends */}
          <div className="relative w-full flex items-center justify-center">
            {activeTab === 'friends' && (
              <span className="w-1 h-7 rounded-r-full bg-[#06C755] absolute left-0" />
            )}
            <button
              id="rail-tab-friends"
              type="button"
              onClick={() => onSelectTab('friends')}
              title="Friends"
              className={`p-3 rounded-2xl relative transition-all cursor-pointer ${
                activeTab === 'friends'
                  ? 'text-[#06C755] bg-[#06C755]/15'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <Users className="w-5 h-5" />
              {friendRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#06C755] rounded-full ring-2 ring-white dark:ring-zinc-900" />
              )}
            </button>
          </div>

          {/* 4. Settings */}
          <div className="relative w-full flex items-center justify-center">
            {activeTab === 'settings' && (
              <span className="w-1 h-7 rounded-r-full bg-[#06C755] absolute left-0" />
            )}
            <button
              id="rail-tab-settings"
              type="button"
              onClick={() => onSelectTab('settings')}
              title="Settings"
              className={`p-3 rounded-2xl relative transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'text-[#06C755] bg-[#06C755]/15'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom: Current User Mini Avatar */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => onSelectTab('settings')}
          title={currentUser?.displayName || currentUser?.username || 'My Profile'}
          className="relative cursor-pointer transition-transform hover:scale-105"
        >
          {currentUser?.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.displayName}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-zinc-300 dark:ring-zinc-700"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
              style={{ backgroundColor: currentUser?.avatarColor || '#06C755' }}
            >
              {getInitials(currentUser?.displayName || currentUser?.username || '?')}
            </div>
          )}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#06C755] ring-2 ring-white dark:ring-zinc-900" />
        </button>
      </div>
    </nav>
  );
};

export default NavigationRail;
