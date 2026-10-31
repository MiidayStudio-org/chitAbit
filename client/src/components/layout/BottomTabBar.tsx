import React from 'react';
import { NavigationTab } from '../../types';
import { Home, MessageSquare, Users, Settings } from 'lucide-react';

interface BottomTabBarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  unreadCount?: number;
  friendRequestsCount?: number;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onSelectTab,
  unreadCount = 0,
  friendRequestsCount = 0,
}) => {
  return (
    <div
      aria-label="Mobile Bottom Navigation Bar"
      className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-[#181b22]/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-around px-2 z-40 select-none shadow-lg transition-colors"
    >
      {/* 1. Home */}
      <button
        type="button"
        id="mobile-tab-home"
        onClick={() => onSelectTab('home')}
        className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors ${
          activeTab === 'home' ? 'text-[#06C755]' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px] font-medium mt-1">Home</span>
      </button>

      {/* 2. Chats */}
      <button
        type="button"
        id="mobile-tab-chats"
        onClick={() => onSelectTab('chats')}
        className={`flex flex-col items-center justify-center flex-1 py-1 relative cursor-pointer transition-colors ${
          activeTab === 'chats' ? 'text-[#06C755]' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
        }`}
      >
        <div className="relative">
          <MessageSquare className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 bg-[#06C755] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-medium mt-1">Chats</span>
      </button>

      {/* 3. Friends */}
      <button
        type="button"
        id="mobile-tab-friends"
        onClick={() => onSelectTab('friends')}
        className={`flex flex-col items-center justify-center flex-1 py-1 relative cursor-pointer transition-colors ${
          activeTab === 'friends' ? 'text-[#06C755]' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
        }`}
      >
        <div className="relative">
          <Users className="w-5 h-5" />
          {friendRequestsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#06C755] rounded-full ring-2 ring-white dark:ring-zinc-900" />
          )}
        </div>
        <span className="text-[10px] font-medium mt-1">Friends</span>
      </button>

      {/* 4. Settings */}
      <button
        type="button"
        id="mobile-tab-settings"
        onClick={() => onSelectTab('settings')}
        className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors ${
          activeTab === 'settings' ? 'text-[#06C755]' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
        }`}
      >
        <Settings className="w-5 h-5" />
        <span className="text-[10px] font-medium mt-1">Settings</span>
      </button>
    </div>
  );
};
