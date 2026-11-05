import React from 'react';
import { Channel, User, OnlineUser } from '../types';
import { Hash, Plus, Sun, Moon, LogOut, Terminal, Bot, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export interface SidebarProps {
  channels: Channel[];
  users: User[];
  onlineUsers: OnlineUser[];
  activeChannelId: string | null;
  activeDMUserId: string | null;
  unreadCounts: Record<string, number>;
  onSelectChannel: (channelId: string) => void;
  onSelectDM: (userId: string) => void;
  onOpenCreateChannel: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  channels,
  users,
  onlineUsers,
  activeChannelId,
  activeDMUserId,
  unreadCounts,
  onSelectChannel,
  onSelectDM,
  onOpenCreateChannel,
  isOpenMobile = false,
  onCloseMobile = () => {},
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  // Filter out current user from DM list, keep DevBot at top
  const otherUsers = users.filter((u) => u.id !== user?.id);
  const devbotUser = otherUsers.find((u) => u.id === 'devbot');
  const humanUsers = otherUsers.filter((u) => u.id !== 'devbot');

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[#090b0d] border-r border-zinc-800/80 flex flex-col transition-transform duration-200 ease-in-out select-none ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* 1. Header: Sticky / Docked */}
        <div className="h-14 px-3.5 border-b border-zinc-800/80 flex items-center justify-between flex-shrink-0 bg-[#090b0d]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-indigo-400 shadow-sm">
              <Terminal className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm tracking-tight text-zinc-100">ChatAbit</span>
                <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-zinc-800/70 text-zinc-400 border border-zinc-700/40">
                  v1.0
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono tracking-wider -mt-0.5">
                dev-chat
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 lg:hidden transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Scrollable Body: Channels & Direct Messages */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
          {/* Channels Section */}
          <div>
            <div className="px-2 mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-wider">
                Channels
              </span>
              <button
                id="create-channel-btn"
                type="button"
                onClick={onOpenCreateChannel}
                title="Create Channel"
                className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-0.5">
              {channels.map((c) => {
                const isActive = activeChannelId === c.id;
                const unread = unreadCounts[`channel_${c.id}`] || 0;
                return (
                  <button
                    key={c.id}
                    id={`channel-${c.name}`}
                    type="button"
                    onClick={() => {
                      onSelectChannel(c.id);
                      onCloseMobile();
                    }}
                    className={`relative w-full py-1.5 px-2.5 rounded-md flex items-center justify-between text-left transition-all text-xs group ${
                      isActive
                        ? 'bg-indigo-500/15 text-indigo-300 font-medium'
                        : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                    }`}
                  >
                    {/* Absolute Left Accent Indicator for Active Item */}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-indigo-500 rounded-r" />
                    )}

                    <div className="flex items-center gap-2 truncate">
                      <Hash
                        className={`w-3.5 h-3.5 flex-shrink-0 font-mono ${
                          isActive ? 'text-indigo-400' : 'text-zinc-600 group-hover:text-zinc-400'
                        }`}
                      />
                      <span className="font-mono truncate">{c.name}</span>
                    </div>

                    {unread > 0 && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold ${
                          isActive
                            ? 'bg-indigo-500 text-white'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Direct Messages Section */}
          <div>
            <div className="px-2 mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-wider">
                Direct Messages
              </span>
            </div>

            <div className="space-y-0.5">
              {/* Pinned DevBot Entry */}
              {devbotUser && (
                <button
                  id="dm-devbot"
                  type="button"
                  onClick={() => {
                    onSelectDM(devbotUser.id);
                    onCloseMobile();
                  }}
                  className={`relative w-full py-1.5 px-2.5 rounded-md flex items-center justify-between text-left transition-all text-xs group ${
                    activeDMUserId === 'devbot'
                      ? 'bg-indigo-500/15 text-indigo-300 font-medium'
                      : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                  }`}
                >
                  {/* Left accent indicator */}
                  {activeDMUserId === 'devbot' && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-indigo-500 rounded-r" />
                  )}

                  <div className="flex items-center gap-2 truncate">
                    <div className="relative flex-shrink-0">
                      <div className="w-4 h-4 rounded bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
                        <Bot className="w-2.5 h-2.5" />
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    </div>
                    <span className="font-mono truncate">DevBot</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/50 uppercase font-bold tracking-wider">
                      AI
                    </span>
                  </div>

                  {(unreadCounts['dm_devbot'] || 0) > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold bg-indigo-500 text-white">
                      {unreadCounts['dm_devbot']}
                    </span>
                  )}
                </button>
              )}

              {/* Teammates List */}
              {humanUsers.map((u) => {
                const isActive = activeDMUserId === u.id;
                const isOnline = onlineUsers.some((ou) => ou.id === u.id);
                const unread = unreadCounts[`dm_${u.id}`] || 0;
                return (
                  <button
                    key={u.id}
                    id={`dm-${u.username}`}
                    type="button"
                    onClick={() => {
                      onSelectDM(u.id);
                      onCloseMobile();
                    }}
                    className={`relative w-full py-1.5 px-2.5 rounded-md flex items-center justify-between text-left transition-all text-xs group ${
                      isActive
                        ? 'bg-indigo-500/15 text-indigo-300 font-medium'
                        : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-indigo-500 rounded-r" />
                    )}

                    <div className="flex items-center gap-2 truncate">
                      {/* Presence Dot: green if online, zinc-600 if offline */}
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${
                          isOnline ? 'bg-emerald-500' : 'bg-zinc-600'
                        }`}
                      />
                      <span className="font-mono text-zinc-500 text-xs">@</span>
                      <span className="font-mono truncate -ml-1 text-zinc-300 group-hover:text-zinc-100">
                        {u.username}
                      </span>
                    </div>

                    {unread > 0 && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold ${
                          isActive
                            ? 'bg-indigo-500 text-white'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. User Footer: Docked at bottom */}
        <div className="p-3 border-t border-zinc-800/80 bg-[#090b0d] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 truncate">
            {/* Rounded square avatar fallback */}
            <div
              className="w-8 h-8 rounded-lg border border-zinc-800 bg-zinc-900/80 flex items-center justify-center text-zinc-200 font-mono font-medium text-xs shadow-inner flex-shrink-0"
              style={{
                borderColor: user?.avatarColor ? `${user.avatarColor}40` : undefined,
                color: user?.avatarColor || undefined,
              }}
            >
              {user?.username ? user.username.slice(0, 2).toUpperCase() : '??'}
            </div>

            <div className="truncate">
              <div className="text-xs font-medium text-zinc-100 truncate leading-tight">
                {user?.displayName || user?.username || 'Guest Developer'}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono truncate leading-tight">
                @{user?.username || 'guest'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              id="theme-toggle-btn"
              type="button"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400/90" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-zinc-400" />
              )}
            </button>

            <button
              id="logout-btn"
              type="button"
              onClick={logout}
              title="Log out / switch persona"
              className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-zinc-800/60 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
