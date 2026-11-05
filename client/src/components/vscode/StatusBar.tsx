import React, { useState, useRef, useEffect } from 'react';
import { ActiveChat, User, FriendRequest } from '../../types';
import { Bot, Wifi, WifiOff, Sparkles, Terminal, GitBranch, Bell, Check, X, UserPlus } from 'lucide-react';
import { getTheme } from '../../utils/themeRegistry';
import { DualIdentityAvatar } from './DualIdentityAvatar';

export interface StatusBarProps {
  socketConnected: boolean;
  currentUser: User | null;
  activeChat: ActiveChat | null;
  onlineCount: number;
  isBotTyping: boolean;
  onOpenCommandPalette: () => void;
  onToggleTheme: () => void;
  onToggleBottomPanel?: () => void;
  isLightMode?: boolean;
  currentColorTheme?: string;
  channelCount?: number;
  friendRequests?: FriendRequest[];
  onRespondFriendRequest?: (requestId: string, action: 'accept' | 'decline') => void;
  onOpenSettings?: () => void;
  onOpenProfile?: (user: User) => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  socketConnected,
  currentUser,
  activeChat,
  onlineCount,
  isBotTyping,
  onOpenCommandPalette,
  onToggleTheme: _onToggleTheme,
  onToggleBottomPanel,
  currentColorTheme = 'dark-plus',
  channelCount = 0,
  friendRequests = [],
  onRespondFriendRequest,
  onOpenSettings,
  onOpenProfile,
}) => {
  const currentTheme = getTheme(currentColorTheme);
  const [encoding, setEncoding] = useState('UTF-8');
  const [selectedLang, setSelectedLang] = useState('TypeScript');
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const trayRef = useRef<HTMLDivElement>(null);

  const pendingCount = friendRequests.length;

  // Close notification tray on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (trayRef.current && !trayRef.current.contains(event.target as Node)) {
        setIsTrayOpen(false);
      }
    };
    if (isTrayOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTrayOpen]);

  const langLabel = currentUser?.messageLanguage
    ? currentUser.messageLanguage.charAt(0).toUpperCase() + currentUser.messageLanguage.slice(1)
    : selectedLang;

  const toggleEncoding = () => {
    setEncoding((prev) => (prev === 'UTF-8' ? 'UTF-16 LE' : 'UTF-8'));
  };

  const toggleLanguage = () => {
    setSelectedLang((prev) => (prev === 'TypeScript' ? 'Markdown' : 'TypeScript'));
  };

  return (
    <footer
      aria-label="VS Code Status Bar"
      className="h-[22px] bg-[#11111b] text-[#cdd6f4] border-t border-[#313244] flex items-center justify-between px-2 text-[11px] font-mono select-none z-30 flex-shrink-0 relative"
    >
      {/* Floating Notification Tray Popover */}
      {isTrayOpen && (
        <div
          ref={trayRef}
          className="absolute bottom-7 left-24 sm:left-48 z-50 w-80 bg-[#1e1e2e] border-2 border-[#cba6f7] rounded-lg shadow-2xl p-3 text-xs text-[#cdd6f4] animate-in slide-in-from-bottom-2 duration-150"
        >
          <div className="flex items-center justify-between pb-2 border-b border-[#313244] mb-2 font-sans font-bold">
            <div className="flex items-center gap-1.5 text-[#cba6f7]">
              <Bell className="w-3.5 h-3.5" />
              <span>Pending Invites ({pendingCount})</span>
            </div>
            <button
              type="button"
              onClick={() => setIsTrayOpen(false)}
              className="p-0.5 text-[#6c7086] hover:text-[#cdd6f4] rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {pendingCount === 0 ? (
              <div className="py-4 text-center text-[#6c7086] italic text-[11px]">
                No pending invites or notifications.
              </div>
            ) : (
              friendRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-2 rounded bg-[#181825] border border-[#313244] flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 truncate min-w-0">
                    <UserPlus className="w-3.5 h-3.5 text-[#89b4fa] flex-shrink-0" />
                    <div className="truncate">
                      <span className="font-bold text-[#cdd6f4]">@{req.sender_username}</span>
                      <p className="text-[10px] text-[#6c7086] truncate">Sent a friend request</p>
                    </div>
                  </div>

                  {onRespondFriendRequest && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => onRespondFriendRequest(req.id, 'accept')}
                        className="p-1 rounded bg-[#cba6f7] hover:bg-[#b4befe] text-[#11111b] cursor-pointer"
                        title="Accept Invite"
                      >
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRespondFriendRequest(req.id, 'decline')}
                        className="p-1 rounded bg-[#313244] hover:bg-[#45475a] text-[#f38ba8] cursor-pointer"
                        title="Decline Invite"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Left Items */}
      <div className="flex items-center gap-3">
        {/* Remote Host Item */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          title="Command Palette (Ctrl+Shift+P)"
          className="flex items-center gap-1 hover:bg-white/15 px-1.5 py-0.5 rounded cursor-pointer"
        >
          <span className="font-bold tracking-tighter">{'><'}</span>
          <span className="hidden sm:inline">ChatAbit: Connected</span>
        </button>

        {/* Git Branch Item */}
        <div
          title="Git repository branch"
          className="flex items-center gap-1 hover:bg-white/15 px-1.5 py-0.5 rounded cursor-pointer"
          onClick={onOpenCommandPalette}
        >
          <GitBranch className="w-3 h-3" />
          <span className="font-semibold">main</span>
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-1">
          {socketConnected ? (
            <Wifi className="w-3 h-3 text-[#89d185]" />
          ) : (
            <WifiOff className="w-3 h-3 text-red-300 animate-pulse" />
          )}
          <span className="hidden sm:inline">
            {socketConnected ? 'Connected' : 'Reconnecting...'}
          </span>
        </div>

        {/* Notification Bell Counter Button */}
        <button
          type="button"
          onClick={() => setIsTrayOpen((prev) => !prev)}
          title={`Notifications (${pendingCount} pending)`}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
            pendingCount > 0
              ? 'bg-[#cba6f7] text-[#11111b] font-bold shadow-sm'
              : 'hover:bg-white/15 text-[#cdd6f4]'
          }`}
        >
          <Bell className="w-3 h-3" />
          {pendingCount > 0 && (
            <span className="text-[10px] font-extrabold">{pendingCount}</span>
          )}
        </button>

        {/* DevBot status */}
        <div className="flex items-center gap-1">
          <Bot className="w-3 h-3" />
          <span>
            {isBotTyping ? (
              <span className="text-amber-200 animate-pulse flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                DevBot: Streaming...
              </span>
            ) : (
              'DevBot: Standby'
            )}
          </span>
        </div>

        {/* Bottom Panel (Terminal / Channels) Toggle */}
        {onToggleBottomPanel && (
          <button
            type="button"
            onClick={onToggleBottomPanel}
            title="Toggle Bottom Terminal & Channels (Ctrl+~)"
            className="flex items-center gap-1 hover:bg-[#313244] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
          >
            <Terminal className="w-3 h-3 text-[#a6e3a1]" />
            <span className="hidden sm:inline">Terminal / Channels (4)</span>
          </button>
        )}
      </div>

      {/* Right Items */}
      <div className="flex items-center gap-3">
        {/* Active Chat info */}
        {activeChat && (
          <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1e1e2e] text-[#cba6f7] border border-[#313244]">
            <span className="text-[10px] text-[#6c7086]">active:</span>
            <span className="font-semibold text-xs">
              {activeChat.type === 'channel'
                ? `#${activeChat.name}`
                : activeChat.id === 'devbot'
                ? '✨ devbot.ai'
                : `@${activeChat.name}`}
            </span>
          </div>
        )}

        {/* Clickable Line Encoding */}
        <span
          onClick={toggleEncoding}
          title="Select Encoding (Click to toggle)"
          className="hidden sm:inline opacity-80 hover:bg-white/15 px-1 rounded cursor-pointer"
        >
          {encoding}
        </span>

        {/* Clickable Syntax Highlighter in Status Bar */}
        <span
          id="status-bar-language"
          onClick={toggleLanguage}
          className="hidden md:inline opacity-90 cursor-pointer hover:bg-white/15 px-1 rounded"
          title={`Language Mode: ${langLabel} (Click to toggle)`}
        >
          {langLabel}
        </span>

        {/* Online Count */}
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#89d185]" />
          <span>Online: {onlineCount}</span>
        </span>

        {/* Current User Profile Indicator */}
        {currentUser && (
          <div
            onClick={() => (onOpenProfile && currentUser ? onOpenProfile(currentUser) : onOpenSettings?.())}
            title={`Signed in as @${currentUser.username}${
              currentUser.avatarUrl ? ' • Dual-Identity Active' : ''
            } • Click to view profile card`}
            className="flex items-center gap-1.5 px-1.5 py-0.5 rounded transition-colors hover:bg-white/10 cursor-pointer"
          >
            <DualIdentityAvatar
              avatarUrl={currentUser.avatarUrl}
              fileIcon={currentUser.fileIcon || 'ts'}
              size={15}
              alt={currentUser.displayName || currentUser.username}
            />
            <span className="font-semibold text-xs text-[#cdd6f4]">
              @{currentUser.username}
            </span>
          </div>
        )}

        {/* Active Theme indicator / switcher button */}
        <button
          type="button"
          id="status-bar-theme-btn"
          onClick={onOpenCommandPalette}
          title={`Current Theme: ${currentTheme.label} (Click to open theme switcher)`}
          className="hover:bg-white/15 px-1.5 py-0.5 rounded cursor-pointer hidden sm:flex items-center gap-1"
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: currentTheme.colors.accent }}
          />
          <span>{currentTheme.label}</span>
        </button>
      </div>
    </footer>
  );
};
