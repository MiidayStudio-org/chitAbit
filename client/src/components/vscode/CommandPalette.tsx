import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, ActiveChat, Channel } from '../../types';
import { channelToChat } from '../../utils/chatUtils';
import { Search, Sparkles, Hash, Moon, Sun, UserPlus, LogOut, X, Terminal, Settings, Palette, Check } from 'lucide-react';
import { FileIcon, getFileExtension } from '../../utils/fileIcons';
import { COLOR_THEMES, ColorThemeDefinition, getTheme } from '../../utils/themeRegistry';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  friends: User[];
  channels?: Channel[];
  onCreateChannel?: () => void;
  onSelectChat: (chat: ActiveChat) => void;
  onToggleTheme: () => void;
  onOpenAddFriend: () => void;
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
  onCloseActiveTab: () => void;
  onLogout: () => void;
  isLightMode?: boolean;
  currentColorTheme?: string;
  onSelectColorTheme?: (themeId: string) => void;
  onPreviewColorTheme?: (themeId: string) => void;
  onCancelPreviewColorTheme?: () => void;
}

interface PaletteItem {
  id: string;
  category: 'file' | 'command' | 'theme';
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  fileIconName?: string;
  themeId?: string;
  onExecute: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  friends,
  channels,
  onCreateChannel,
  onSelectChat,
  onToggleTheme,
  onOpenAddFriend,
  onOpenSettings,
  onToggleSidebar,
  onCloseActiveTab,
  onLogout,
  isLightMode = false,
  currentColorTheme = 'dark-plus',
  onSelectColorTheme,
  onPreviewColorTheme,
  onCancelPreviewColorTheme,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isThemePickerMode, setIsThemePickerMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setIsThemePickerMode(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (isThemePickerMode && onCancelPreviewColorTheme) {
      onCancelPreviewColorTheme();
    }
    setIsThemePickerMode(false);
    onClose();
  };

  const normalItems: PaletteItem[] = useMemo(() => {
    const list: PaletteItem[] = [];

    // Commands first: Change Color Theme
    list.push({
      id: 'cmd_change_color_theme',
      category: 'command',
      title: 'Preferences: Change Color Theme',
      subtitle: `Select active theme (currently: ${getTheme(currentColorTheme).label})`,
      icon: <Palette className="w-4 h-4 text-[var(--accent)]" />,
      onExecute: () => {
        setIsThemePickerMode(true);
        setQuery('');
        setSelectedIndex(0);
      },
    });

    // Chats & Files
    const paletteChannels: Channel[] =
      channels && channels.length > 0
        ? channels
        : [{ id: 'general', name: 'general', description: null, created_by: 'system', created_at: 0 }];
    paletteChannels.forEach((channel) => {
      list.push({
        id: `chat_channel_${channel.id}`,
        category: 'file',
        title: channel.name,
        subtitle: `channels > ${channel.description || channel.name}`,
        fileIconName: 'folder',
        onExecute: () => onSelectChat(channelToChat(channel)),
      });
    });

    list.push({
      id: 'chat_devbot',
      category: 'file',
      title: 'devbot.ai',
      subtitle: 'bots > DevBot (Senior AI Assistant)',
      fileIconName: 'bot',
      onExecute: () => {
        onSelectChat({
          type: 'dm',
          id: 'devbot',
          name: 'devbot',
          displayName: 'devbot.ai',
          fileIcon: 'bot',
          isBot: true,
          status: 'Online',
        });
      },
    });

    friends.forEach((friend) => {
      const ext = getFileExtension(friend.fileIcon);
      const filename = `${friend.username}${ext}`;
      list.push({
        id: `chat_${friend.id}`,
        category: 'file',
        title: filename,
        subtitle: `direct > @${friend.username}`,
        fileIconName: friend.fileIcon,
        onExecute: () => {
          onSelectChat({
            type: 'dm',
            id: friend.id,
            name: friend.username,
            displayName: filename,
            fileIcon: friend.fileIcon,
            status: friend.status || 'Offline',
          });
        },
      });
    });

    // Standard Commands
    list.push({
      id: 'cmd_toggle_theme',
      category: 'command',
      title: 'Preferences: Toggle Dark+ / Light+ Theme',
      subtitle: `Currently ${isLightMode ? 'Light+' : 'Dark+'}`,
      icon: isLightMode ? <Moon className="w-4 h-4 text-[var(--accent)]" /> : <Sun className="w-4 h-4 text-[#cca700]" />,
      onExecute: onToggleTheme,
    });

    if (onCreateChannel) {
      list.push({
        id: 'cmd_create_channel',
        category: 'command',
        title: 'ChatAbit: Create Channel',
        subtitle: 'Start a new topic channel for everyone',
        icon: <Hash className="w-4 h-4 text-[var(--accent)]" />,
        onExecute: onCreateChannel,
      });
    }

    list.push({
      id: 'cmd_add_friend',
      category: 'command',
      title: 'ChatAbit: Add Friend / Search Members',
      subtitle: 'Find developer by username or ID',
      icon: <UserPlus className="w-4 h-4 text-[#89d185]" />,
      onExecute: onOpenAddFriend,
    });

    list.push({
      id: 'cmd_open_settings',
      category: 'command',
      title: 'Preferences: Open Settings & Appearance',
      subtitle: 'Change display name, theme, and language',
      icon: <Settings className="w-4 h-4 text-[var(--text)]" />,
      onExecute: onOpenSettings,
    });

    list.push({
      id: 'cmd_toggle_sidebar',
      category: 'command',
      title: 'View: Toggle Primary Side Bar',
      subtitle: 'Shortcut: Ctrl+B',
      icon: <Terminal className="w-4 h-4 text-[var(--accent)]" />,
      onExecute: onToggleSidebar,
    });

    list.push({
      id: 'cmd_close_tab',
      category: 'command',
      title: 'View: Close Active Editor Tab',
      subtitle: 'Shortcut: Ctrl+W',
      icon: <X className="w-4 h-4 text-[#f88070]" />,
      onExecute: onCloseActiveTab,
    });

    list.push({
      id: 'cmd_export_chat',
      category: 'command',
      title: 'ChatAbit: Export Chat as Markdown (.md)',
      subtitle: 'Copy full chat transcript to clipboard formatted as markdown',
      icon: <Terminal className="w-4 h-4 text-[#89d185]" />,
      onExecute: () => {
        const text = `# ChatAbit Export — ${new Date().toLocaleString()}\nExported from active developer workspace.`;
        navigator.clipboard.writeText(text);
        onClose();
      },
    });

    list.push({
      id: 'cmd_logout',
      category: 'command',
      title: 'Account: Log Out of ChatAbit',
      subtitle: 'Clear local session credentials',
      icon: <LogOut className="w-4 h-4 text-red-400" />,
      onExecute: onLogout,
    });

    return list;
  }, [friends, channels, onCreateChannel, onSelectChat, onToggleTheme, onOpenAddFriend, onOpenSettings, onToggleSidebar, onCloseActiveTab, onLogout, isLightMode, currentColorTheme]);

  // Theme list for theme picker mode
  const themeItems: PaletteItem[] = useMemo(() => {
    return COLOR_THEMES.map((t) => ({
      id: `theme_${t.id}`,
      category: 'theme',
      title: t.label,
      subtitle: t.type === 'light' ? 'Light Theme' : 'Dark Theme',
      themeId: t.id,
      icon: (
        <span
          className="w-3.5 h-3.5 rounded border border-black/30 flex-shrink-0"
          style={{ backgroundColor: t.colors.accent }}
        />
      ),
      onExecute: () => {
        onSelectColorTheme?.(t.id);
      },
    }));
  }, [onSelectColorTheme]);

  const items = isThemePickerMode ? themeItems : normalItems;

  // Filter items by query, with support for # (channels), @ (dms), and > (commands)
  const filtered = useMemo(() => {
    const raw = query.trim();
    if (!raw) return items;

    // 1. Prefix '#' -> only search channels
    if (raw.startsWith('#')) {
      const term = raw.slice(1).trim().toLowerCase();
      return normalItems.filter(
        (item) => item.id.startsWith('chat_channel_') && (!term || item.title.toLowerCase().includes(term))
      );
    }

    // 2. Prefix '@' -> only search DMs / members
    if (raw.startsWith('@')) {
      const term = raw.slice(1).trim().toLowerCase();
      return normalItems.filter(
        (item) =>
          (item.id.startsWith('chat_') && !item.id.startsWith('chat_channel_')) &&
          (!term || item.title.toLowerCase().includes(term) || item.subtitle?.toLowerCase().includes(term))
      );
    }

    // 3. Prefix '>' -> only search IDE commands
    if (raw.startsWith('>')) {
      const term = raw.slice(1).trim().toLowerCase();
      return normalItems.filter(
        (item) =>
          item.category === 'command' &&
          (!term || item.title.toLowerCase().includes(term) || item.subtitle?.toLowerCase().includes(term))
      );
    }

    // Default fuzzy match
    const clean = raw.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(clean) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(clean))
    );
  }, [items, normalItems, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, isThemePickerMode]);

  // Live preview when arrowing in theme picker mode
  useEffect(() => {
    if (isThemePickerMode && filtered[selectedIndex]?.themeId && onPreviewColorTheme) {
      onPreviewColorTheme(filtered[selectedIndex].themeId!);
    }
  }, [selectedIndex, isThemePickerMode, filtered, onPreviewColorTheme]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = (selectedIndex + 1) % Math.max(1, filtered.length);
      setSelectedIndex(nextIdx);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIdx = (selectedIndex - 1 + filtered.length) % Math.max(1, filtered.length);
      setSelectedIndex(nextIdx);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].onExecute();
        if (!isThemePickerMode) {
          onClose();
        } else {
          onClose();
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (isThemePickerMode) {
        if (onCancelPreviewColorTheme) onCancelPreviewColorTheme();
        setIsThemePickerMode(false);
        setQuery('');
      } else {
        handleClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4 bg-black/50 select-none animate-in fade-in duration-100"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-xl bg-[var(--sidebar)] border border-[var(--border)] shadow-2xl rounded overflow-hidden text-[var(--text)] font-mono text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input bar */}
        <div className="p-2 border-b border-[var(--border)] flex items-center gap-2 bg-[var(--bg)]">
          {isThemePickerMode ? (
            <Palette className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />
          ) : (
            <Search className="w-4 h-4 text-[var(--muted)] flex-shrink-0" />
          )}
          <input
            ref={inputRef}
            id="vscode-command-palette-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isThemePickerMode
                ? 'Select Color Theme (up/down arrow to preview, Enter to select, Esc to cancel)...'
                : 'Type a command or filename to jump to (Esc to exit)...'
            }
            className="w-full bg-transparent text-[13px] text-[var(--text)] placeholder-[var(--muted)] outline-none border-none py-1"
          />
          {isThemePickerMode && (
            <button
              type="button"
              onClick={() => {
                if (onCancelPreviewColorTheme) onCancelPreviewColorTheme();
                setIsThemePickerMode(false);
                setQuery('');
              }}
              className="text-[10px] px-2 py-0.5 rounded bg-[var(--input-bg)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
            >
              Back
            </button>
          )}
        </div>

        {/* Results list */}
        <div className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-[var(--muted)] italic">
              No matching commands or themes found
            </div>
          ) : (
            filtered.map((item, index) => {
              const isSelected = index === selectedIndex;
              const isCurrentTheme = item.themeId && (currentColorTheme === item.themeId);

              return (
                <div
                  key={item.id}
                  id={`palette-item-${index}`}
                  onClick={() => {
                    item.onExecute();
                    onClose();
                  }}
                  onMouseEnter={() => {
                    setSelectedIndex(index);
                    if (isThemePickerMode && item.themeId && onPreviewColorTheme) {
                      onPreviewColorTheme(item.themeId);
                    }
                  }}
                  className={`flex items-center justify-between px-3 py-1.5 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[var(--selection)] text-white font-semibold'
                      : 'hover:bg-[var(--line-highlight)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {item.fileIconName ? (
                      <FileIcon name={item.fileIconName} size={15} />
                    ) : item.icon ? (
                      item.icon
                    ) : (
                      <Terminal className="w-3.5 h-3.5 text-[var(--accent)]" />
                    )}
                    <span className="truncate">{item.title}</span>
                    {isCurrentTheme && (
                      <span className="text-[10px] text-[var(--accent)] font-bold ml-1 flex items-center gap-0.5">
                        <Check className="w-3 h-3" />
                        (current)
                      </span>
                    )}
                  </div>
                  {item.subtitle && (
                    <span className="text-[10px] text-[var(--muted)] truncate ml-3 flex-shrink-0">
                      {item.subtitle}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
