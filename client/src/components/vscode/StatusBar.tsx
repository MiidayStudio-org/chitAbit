import React from 'react';
import { ActiveChat, User } from '../../types';
import { Bot, Wifi, WifiOff, Sparkles } from 'lucide-react';
import { getTheme } from '../../utils/themeRegistry';

export interface StatusBarProps {
  socketConnected: boolean;
  currentUser: User | null;
  activeChat: ActiveChat | null;
  onlineCount: number;
  isBotTyping: boolean;
  onOpenCommandPalette: () => void;
  onToggleTheme: () => void;
  isLightMode?: boolean;
  currentColorTheme?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  socketConnected,
  currentUser,
  activeChat,
  onlineCount,
  isBotTyping,
  onOpenCommandPalette,
  onToggleTheme,
  currentColorTheme = 'dark-plus',
}) => {
  const currentTheme = getTheme(currentColorTheme);
  const langLabel = currentUser?.messageLanguage
    ? currentUser.messageLanguage.charAt(0).toUpperCase() + currentUser.messageLanguage.slice(1)
    : 'TypeScript';

  return (
    <footer
      aria-label="VS Code Status Bar"
      className="h-[22px] bg-[var(--status-bar)] text-[var(--status-bar-fg)] flex items-center justify-between px-2 text-[11px] font-mono select-none z-30 flex-shrink-0"
    >
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
          <span className="hidden sm:inline">chitAbit: Local</span>
        </button>

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
              'DevBot: Ready'
            )}
          </span>
        </div>
      </div>

      {/* Right Items */}
      <div className="flex items-center gap-3">
        {/* Active Chat info */}
        {activeChat && (
          <span className="hidden md:inline opacity-90">
            {activeChat.displayName || activeChat.name}
          </span>
        )}

        <span className="hidden sm:inline opacity-80">UTF-8</span>
        {/* User's Message Language in Status Bar */}
        <span
          id="status-bar-language"
          className="hidden md:inline opacity-90 cursor-pointer hover:bg-white/10 px-1 rounded"
          title={`My Message Language: ${langLabel}`}
        >
          {langLabel}
        </span>

        {/* Online Count */}
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#89d185]" />
          <span>Online: {onlineCount}</span>
        </span>

        {/* Current User */}
        {currentUser && (
          <span className="font-semibold">
            @{currentUser.username}
          </span>
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
