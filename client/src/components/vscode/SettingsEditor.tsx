import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Channel, ChatAbitSettings, KeyboardShortcutItem } from '../../types';
import { FILE_ICON_OPTIONS, FileIcon, getFileIconForLanguage } from '../../utils/fileIcons';
import { DualIdentityAvatar } from './DualIdentityAvatar';
import { COLOR_THEMES, ColorThemeDefinition, getTheme } from '../../utils/themeRegistry';
import { LANGUAGE_OPTIONS } from '../../utils/shikiHighlighter';
import {
  getStoredSettings,
  saveStoredSettings,
  getStoredKeybindings,
  saveStoredKeybindings,
  DEFAULT_SETTINGS,
  DEFAULT_KEYBINDINGS,
} from '../../utils/settingsStore';
import {
  playIncomingChime,
  playVsCodeBell,
  playMechanicalClick,
  playMentionChime,
  requestNotificationPermission,
} from '../../utils/notifications';
import {
  Check,
  Loader2,
  LogOut,
  Info,
  Palette,
  Code,
  Sliders,
  RotateCcw,
  Search,
  FileCode,
  Bell,
  Volume2,
  Shield,
  User as UserIcon,
  Keyboard,
  GitBranch,
  Monitor,
  VolumeX,
  Play,
  X,
  Plus,
  Trash2,
  ExternalLink,
  Laptop,
  Smartphone,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';

export interface SettingsEditorProps {
  currentUser: User | null;
  channels?: Channel[];
  onUpdateProfile: (updates: {
    displayName?: string;
    bio?: string;
    status?: string;
    avatarUrl?: string | null;
    fileIcon?: string;
    shareLiveTyping?: boolean;
    messageLanguage?: string;
    colorTheme?: string;
    customAccentColor?: string | null;
    highlightAllMessages?: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  currentColorTheme: string;
  onSelectTheme: (themeId: string) => void;
  customAccentColor: string | null;
  onSetCustomAccent: (color: string | null) => void;
  onLogout: () => void;
  onOpenProfile?: (user: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string | null;
    fileIcon?: string;
    status?: string;
    bio?: string;
  }) => void;
}

type SettingsTab =
  | 'profile'
  | 'chat'
  | 'notifications'
  | 'keybindings'
  | 'privacy'
  | 'appearance';

const PRESET_ACCENTS = [
  { name: 'VS Code Blue', color: '#007acc' },
  { name: 'Electric Violet', color: '#bd93f9' },
  { name: 'Emerald', color: '#89d185' },
  { name: 'Coral', color: '#f9826c' },
  { name: 'Teal', color: '#2aa198' },
  { name: 'Gold', color: '#cca700' },
  { name: 'Nord Frost', color: '#88c0d0' },
];

export const SettingsEditor: React.FC<SettingsEditorProps> = ({
  currentUser,
  channels = [],
  onUpdateProfile,
  currentColorTheme,
  onSelectTheme,
  customAccentColor,
  onSetCustomAccent,
  onLogout,
  onOpenProfile,
}) => {
  // Navigation & View mode
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [isJsonMode, setIsJsonMode] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Core App & Chat Settings
  const [settings, setSettings] = useState<ChatAbitSettings>(() => getStoredSettings());
  const [keybindings, setKeybindings] = useState<KeyboardShortcutItem[]>(() => getStoredKeybindings());

  // JSON Raw text state
  const [jsonText, setJsonText] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Status & notifications
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [desktopPermStatus, setDesktopPermStatus] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  // Avatar upload state
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Keybinding recording state
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [recordingBuffer, setRecordingBuffer] = useState<string>('');

  // New blocked user input
  const [blockedInput, setBlockedInput] = useState('');

  // Initialize settings from currentUser if not set
  useEffect(() => {
    if (currentUser) {
      setSettings((prev) => ({
        ...prev,
        'profile.displayName': currentUser.displayName || prev['profile.displayName'],
        'profile.bio': currentUser.bio || prev['profile.bio'],
        'profile.status': currentUser.status || prev['profile.status'],
        'profile.fileIcon': currentUser.fileIcon || prev['profile.fileIcon'],
        'profile.avatarUrl': currentUser.avatarUrl || prev['profile.avatarUrl'],
        'profile.useAvatarUrl': Boolean(currentUser.avatarUrl),
        'workbench.colorTheme': currentUser.colorTheme || currentColorTheme,
        'workbench.customAccent': currentUser.customAccentColor || customAccentColor,
        'chat.liveTypingStream': currentUser.shareLiveTyping !== false,
      }));
    }
  }, [currentUser, currentColorTheme, customAccentColor]);

  // Update JSON text when switching to JSON mode
  useEffect(() => {
    if (isJsonMode) {
      setJsonText(JSON.stringify(settings, null, 2));
      setJsonError(null);
    }
  }, [isJsonMode, settings]);

  // Save settings change
  const updateSetting = <K extends keyof ChatAbitSettings>(key: K, value: ChatAbitSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveStoredSettings(updated);

    // Sync theme if appearance changed
    if (key === 'workbench.colorTheme') {
      onSelectTheme(value as string);
    } else if (key === 'workbench.customAccent') {
      onSetCustomAccent(value as string | null);
    }
  };

  // Profile Save
  const handleSaveProfile = async () => {
    setIsSaving(true);
    setStatusMessage(null);

    const avatar = settings['profile.avatarUrl']?.trim()
      ? settings['profile.avatarUrl'].trim()
      : null;

    try {
      const res = await onUpdateProfile({
        displayName: settings['profile.displayName'].trim() || undefined,
        bio: settings['profile.bio'].trim() || undefined,
        status: settings['profile.status'].trim() || undefined,
        avatarUrl: avatar,
        fileIcon: settings['profile.fileIcon'],
        shareLiveTyping: settings['chat.liveTypingStream'],
        colorTheme: settings['workbench.colorTheme'],
        customAccentColor: settings['workbench.customAccent'],
      });

      if (res.success) {
        setStatusMessage({ text: 'Profile changes saved and synced across ChatAbit workspace.', type: 'success' });
      } else {
        setStatusMessage({ text: res.error || 'Failed to update profile.', type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: err?.message || 'Network error.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Select local avatar from device via FileReader
  const handleSelectAvatarFromDevice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image format (PNG, JPG, WEBP)
    const validMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validMimes.includes(file.type.toLowerCase()) && !file.type.startsWith('image/')) {
      setStatusMessage({
        text: 'Invalid file format. Please choose a PNG, JPG, or WEBP image.',
        type: 'error',
      });
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = '';
      return;
    }

    // Validate size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setStatusMessage({
        text: `Image exceeds 5MB size limit (${(file.size / (1024 * 1024)).toFixed(1)} MB). Please select a smaller file.`,
        type: 'error',
      });
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = '';
      return;
    }

    setIsUploadingAvatar(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64DataUrl = reader.result as string;
      updateSetting('profile.avatarUrl', base64DataUrl);
      updateSetting('profile.useAvatarUrl', true);

      // Instantly sync to backend and app-wide state
      try {
        await onUpdateProfile({
          avatarUrl: base64DataUrl,
          fileIcon: settings['profile.fileIcon'],
        });
        setStatusMessage({
          text: 'Photo loaded and synced instantly! Hover over the Dual-Identity card to test the 3D flip animation.',
          type: 'success',
        });
      } catch {
        setStatusMessage({
          text: 'Photo preview loaded. Click "Save Profile Changes" to persist.',
          type: 'success',
        });
      } finally {
        setIsUploadingAvatar(false);
      }
    };

    reader.onerror = () => {
      setStatusMessage({
        text: 'Failed to read image from device. Please try again.',
        type: 'error',
      });
      setIsUploadingAvatar(false);
    };

    reader.readAsDataURL(file);

    if (avatarFileInputRef.current) {
      avatarFileInputRef.current.value = '';
    }
  };

  // Remove local device avatar and revert to pure language symbol
  const handleRemoveAvatar = async () => {
    updateSetting('profile.avatarUrl', '');
    updateSetting('profile.useAvatarUrl', false);
    try {
      await onUpdateProfile({
        avatarUrl: null,
        fileIcon: settings['profile.fileIcon'],
      });
      setStatusMessage({
        text: 'Avatar image removed and synced across ChatAbit workspace.',
        type: 'success',
      });
    } catch {
      setStatusMessage({
        text: 'Avatar image removed from preview. Click "Save Profile Changes" to persist.',
        type: 'success',
      });
    }
    if (avatarFileInputRef.current) {
      avatarFileInputRef.current.value = '';
    }
  };

  // JSON editor text change
  const handleJsonChange = (newVal: string) => {
    setJsonText(newVal);
    try {
      const parsed = JSON.parse(newVal);
      setJsonError(null);
      setSettings(parsed);
      saveStoredSettings(parsed);
      if (parsed['workbench.colorTheme']) onSelectTheme(parsed['workbench.colorTheme']);
      if (parsed['workbench.customAccent'] !== undefined) onSetCustomAccent(parsed['workbench.customAccent']);
    } catch (err: any) {
      setJsonError(err.message);
    }
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch {
      // Keep existing error
    }
  };

  // Desktop notification permission request
  const handleRequestDesktopPermission = async () => {
    const granted = await requestNotificationPermission();
    setDesktopPermStatus(granted ? 'granted' : 'denied');
    updateSetting('notifications.desktop', granted);
    if (granted) {
      setStatusMessage({ text: 'Desktop web notifications enabled successfully!', type: 'success' });
    } else {
      setStatusMessage({ text: 'Notification permission was denied or blocked in your browser.', type: 'error' });
    }
  };

  // Test sound
  const handleTestSound = (type: 'message' | 'mention') => {
    if (type === 'message') {
      const snd = settings['sound.messageReceived'];
      if (snd === 'vscode-bell') playVsCodeBell();
      else if (snd === 'mechanical-click') playMechanicalClick();
      else if (snd === 'subtle-ping') playIncomingChime();
    } else {
      const snd = settings['sound.mentionReceived'];
      if (snd !== 'mute') playMentionChime();
    }
  };

  // Toggle channel mute
  const toggleChannelMute = (channelId: string) => {
    const current = new Set(settings['notifications.mutedChannels']);
    if (current.has(channelId)) current.delete(channelId);
    else current.add(channelId);
    updateSetting('notifications.mutedChannels', Array.from(current));
  };

  // Block/unblock users
  const handleAddBlockedUser = () => {
    const clean = blockedInput.trim().toLowerCase().replace(/^@/, '');
    if (!clean) return;
    if (settings['privacy.blockedUsers'].includes(clean)) return;
    updateSetting('privacy.blockedUsers', [...settings['privacy.blockedUsers'], clean]);
    setBlockedInput('');
  };

  const handleRemoveBlockedUser = (username: string) => {
    updateSetting(
      'privacy.blockedUsers',
      settings['privacy.blockedUsers'].filter((u) => u !== username)
    );
  };

  // Keybinding recording listener
  useEffect(() => {
    if (!recordingId) return;

    const handleKeydown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const parts: string[] = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.shiftKey) parts.push('Shift');
      if (e.altKey) parts.push('Alt');
      if (e.metaKey) parts.push('Meta');

      const key = e.key;
      if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
        parts.push(key.length === 1 ? key.toUpperCase() : key);
        const combo = parts.join('+');

        setKeybindings((prev) => {
          const next = prev.map((k) =>
            k.id === recordingId ? { ...k, keybinding: combo, source: 'User' as const } : k
          );
          saveStoredKeybindings(next);
          return next;
        });
        setRecordingId(null);
      } else {
        setRecordingBuffer(parts.join('+'));
      }
    };

    window.addEventListener('keydown', handleKeydown, true);
    return () => window.removeEventListener('keydown', handleKeydown, true);
  }, [recordingId]);

  const handleResetKeybinding = (id: string) => {
    setKeybindings((prev) => {
      const next = prev.map((k) =>
        k.id === id ? { ...k, keybinding: k.defaultKeybinding, source: 'Default' as const } : k
      );
      saveStoredKeybindings(next);
      return next;
    });
  };

  // Filter settings matching search query
  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase().trim());
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg)] text-[var(--text)] font-sans select-text">
      {/* 1. VS Code Settings Header Bar */}
      <div className="h-11 px-4 border-b border-[var(--border)] bg-[var(--tab-inactive)] flex items-center justify-between flex-shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            <Sliders className="w-3.5 h-3.5 text-[#007acc]" />
            <span>Settings</span>
          </div>

          {/* Search Bar with filter */}
          <div className="relative w-64 md:w-80">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#858585]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings (e.g. chat.sendOnEnter)..."
              className="w-full bg-[#1e1e1e] light-plus:bg-white text-xs text-[var(--text)] rounded border border-[#3c3c3c] light-plus:border-[#cccccc] pl-8 pr-7 py-1 outline-none focus:border-[#007acc] font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-[#858585] hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* View Switcher: GUI vs settings.json Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            title={isJsonMode ? 'Switch to Settings GUI' : 'Open Settings (JSON)'}
            onClick={() => setIsJsonMode(!isJsonMode)}
            className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 font-mono cursor-pointer transition-colors border ${
              isJsonMode
                ? 'bg-[#007acc] text-white border-[#007acc]'
                : 'bg-[#252526] light-plus:bg-white text-[var(--text)] border-[#3c3c3c] light-plus:border-[#cccccc] hover:border-[#007acc]'
            }`}
          >
            {isJsonMode ? (
              <>
                <Sliders className="w-3 h-3" />
                <span className="hidden sm:inline">UI View</span>
              </>
            ) : (
              <>
                <FileCode className="w-3 h-3 text-[#cca700]" />
                <span className="font-bold">{`{ }`}</span>
                <span className="hidden sm:inline">settings.json</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Main Content View: GUI vs JSON */}
      {isJsonMode ? (
        /* LIVE EDITABLE settings.json VIEW */
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#1e1e1e] light-plus:bg-[#ffffff] font-mono text-xs">
          <div className="h-8 px-4 border-b border-[#3c3c3c] light-plus:border-[#e7e7e7] bg-[#252526] light-plus:bg-[#f3f3f3] flex items-center justify-between text-[11px] text-[#858585] select-none">
            <span className="flex items-center gap-2">
              <FileCode className="w-3.5 h-3.5 text-[#cca700]" />
              <span>settings.json — ChatAbit User Configuration</span>
            </span>
            <button
              type="button"
              onClick={handleFormatJson}
              className="hover:text-white cursor-pointer"
            >
              Format Document
            </button>
          </div>

          {jsonError && (
            <div className="px-4 py-2 bg-red-950/80 border-b border-red-800 text-red-300 text-xs flex items-center gap-2 select-none">
              <Info className="w-3.5 h-3.5 flex-shrink-0 text-red-400" />
              <span>JSON Syntax Error: {jsonError}</span>
            </div>
          )}

          <div className="flex-1 relative overflow-hidden flex">
            {/* Sequential Line Numbers */}
            <div className="w-12 bg-[#1e1e1e] light-plus:bg-[#f8f8f8] border-r border-[#2d2d2d] light-plus:border-[#e0e0e0] py-3 text-right pr-3 select-none text-[#555] font-mono text-xs overflow-hidden">
              {jsonText.split('\n').map((_, i) => (
                <div key={i}>{String(i + 1).padStart(3, '0')}</div>
              ))}
            </div>

            {/* Editable JSON Area */}
            <textarea
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              spellCheck={false}
              className="flex-1 h-full p-3 bg-transparent text-[#9cdcfe] light-plus:text-[#001080] outline-none font-mono text-xs resize-none leading-relaxed overflow-y-auto"
            />
          </div>
        </div>
      ) : (
        /* STANDARD VS CODE GUI SETTINGS VIEW */
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sub-Sidebar (Category Nav) */}
          <div className="w-52 md:w-56 border-r border-[var(--border)] bg-[var(--sidebar)] p-2 space-y-0.5 overflow-y-auto select-none flex-shrink-0 text-xs font-mono">
            <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-[#858585] tracking-wider">
              Preferences
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`w-full px-3 py-1.5 rounded flex items-center gap-2.5 cursor-pointer text-left transition-colors ${
                activeTab === 'profile'
                  ? 'bg-[var(--selection)] text-white font-semibold'
                  : 'text-[var(--text)] hover:bg-[#2a2d2e] light-plus:hover:bg-[#e8e8e8]'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5 text-[#4fc1ff]" />
              <span>Account & Profile</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`w-full px-3 py-1.5 rounded flex items-center gap-2.5 cursor-pointer text-left transition-colors ${
                activeTab === 'chat'
                  ? 'bg-[var(--selection)] text-white font-semibold'
                  : 'text-[var(--text)] hover:bg-[#2a2d2e] light-plus:hover:bg-[#e8e8e8]'
              }`}
            >
              <Code className="w-3.5 h-3.5 text-[#007acc]" />
              <span>Chat & Messaging</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              className={`w-full px-3 py-1.5 rounded flex items-center gap-2.5 cursor-pointer text-left transition-colors ${
                activeTab === 'notifications'
                  ? 'bg-[var(--selection)] text-white font-semibold'
                  : 'text-[var(--text)] hover:bg-[#2a2d2e] light-plus:hover:bg-[#e8e8e8]'
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-[#cca700]" />
              <span>Notifications & Sounds</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('keybindings')}
              className={`w-full px-3 py-1.5 rounded flex items-center gap-2.5 cursor-pointer text-left transition-colors ${
                activeTab === 'keybindings'
                  ? 'bg-[var(--selection)] text-white font-semibold'
                  : 'text-[var(--text)] hover:bg-[#2a2d2e] light-plus:hover:bg-[#e8e8e8]'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5 text-[#89d185]" />
              <span>Keybindings</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`w-full px-3 py-1.5 rounded flex items-center gap-2.5 cursor-pointer text-left transition-colors ${
                activeTab === 'privacy'
                  ? 'bg-[var(--selection)] text-white font-semibold'
                  : 'text-[var(--text)] hover:bg-[#2a2d2e] light-plus:hover:bg-[#e8e8e8]'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-[#f9826c]" />
              <span>Privacy & Safety</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('appearance')}
              className={`w-full px-3 py-1.5 rounded flex items-center gap-2.5 cursor-pointer text-left transition-colors ${
                activeTab === 'appearance'
                  ? 'bg-[var(--selection)] text-white font-semibold'
                  : 'text-[var(--text)] hover:bg-[#2a2d2e] light-plus:hover:bg-[#e8e8e8]'
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-[#bd93f9]" />
              <span>Appearance & Theme</span>
            </button>

            <div className="pt-4 border-t border-[var(--border)] mt-4">
              <button
                type="button"
                onClick={onLogout}
                className="w-full px-3 py-1.5 rounded flex items-center gap-2.5 text-red-400 hover:bg-red-950/30 hover:text-red-300 cursor-pointer text-left transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>

          {/* Right Main Settings Form Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 font-sans max-w-4xl">
            {statusMessage && (
              <div
                className={`p-3 rounded text-xs flex items-center justify-between ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-950/50 border border-emerald-800 text-emerald-300'
                    : 'bg-red-950/50 border border-red-800 text-red-300'
                }`}
              >
                <span>{statusMessage.text}</span>
                <button
                  type="button"
                  onClick={() => setStatusMessage(null)}
                  className="hover:opacity-75"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* TAB 1: ACCOUNT & PROFILE */}
            {(activeTab === 'profile' || searchQuery) && matchesSearch('profile account avatar github') && (
              <section className="space-y-4">
                <div className="border-b border-[var(--border)] pb-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#4fc1ff]">
                    Account & Developer Profile
                  </h2>
                  <p className="text-xs text-[#858585] mt-0.5">
                    Configure your display name, developer file avatar, and GitHub activity presence.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-[var(--text)]">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={settings['profile.displayName']}
                      onChange={(e) => updateSetting('profile.displayName', e.target.value)}
                      placeholder="e.g. Vrushu (Frontend Lead)"
                      className="w-full px-3 py-1.5 rounded bg-[#252526] light-plus:bg-white border border-[#3c3c3c] light-plus:border-[#cccccc] text-xs outline-none focus:border-[#007acc]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-[var(--text)]">
                      Custom Status Message
                    </label>
                    <input
                      type="text"
                      value={settings['profile.status']}
                      onChange={(e) => updateSetting('profile.status', e.target.value)}
                      placeholder="e.g. Coding on branch feat/auth 🚀"
                      className="w-full px-3 py-1.5 rounded bg-[#252526] light-plus:bg-white border border-[#3c3c3c] light-plus:border-[#cccccc] text-xs outline-none focus:border-[#007acc]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-[var(--text)]">
                    Developer Bio / Readme
                  </label>
                  <textarea
                    rows={2}
                    value={settings['profile.bio']}
                    onChange={(e) => updateSetting('profile.bio', e.target.value)}
                    placeholder="Brief description of your stack, active projects, and timezone..."
                    className="w-full px-3 py-1.5 rounded bg-[#252526] light-plus:bg-white border border-[#3c3c3c] light-plus:border-[#cccccc] text-xs outline-none focus:border-[#007acc] resize-none"
                  />
                </div>

                {/* Dual-Identity Avatar Section */}
                <div className="p-4 rounded border border-[#313244] bg-[#181825] space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#313244] pb-3">
                    <div>
                      <div className="text-xs font-bold text-[#cdd6f4] flex items-center gap-2">
                        <span>Dual-Identity Developer Avatar</span>
                        {settings['profile.avatarUrl'] && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#a6e3a1]/15 text-[#a6e3a1] border border-[#a6e3a1]/30">
                            3D Flip Active
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#a6adc8] mt-0.5">
                        Your language badge (.ts, .rs, .py) is your default signature face. Add a local device photo to enable a smooth 3D flip card animation on hover.
                      </div>
                    </div>
                  </div>

                  {/* Dual-Identity Previews & Device File Actions */}
                  <div className="flex flex-col sm:flex-row items-center gap-5 p-3.5 rounded bg-[#11111b] border border-[#313244]">
                    {/* Visual Previews: Direct Photo (if uploaded) + 3D Flip Card */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      {/* Direct Uploaded Photo Thumbnail */}
                      {settings['profile.avatarUrl'] && (
                        <div
                          onClick={() =>
                            onOpenProfile?.({
                              id: currentUser?.id || 'me',
                              username: currentUser?.username || 'me',
                              displayName: settings['profile.displayName'] || currentUser?.displayName,
                              avatarUrl: settings['profile.avatarUrl'],
                              fileIcon: settings['profile.fileIcon'],
                              status: settings['profile.status'],
                              bio: settings['profile.bio'],
                            })
                          }
                          className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group/photo"
                          title="Click to preview your full profile card"
                        >
                          <div className="relative group-hover/photo:scale-105 transition-transform">
                            <img
                              src={settings['profile.avatarUrl']}
                              alt="Uploaded photo preview"
                              className="w-16 h-16 rounded-full object-cover border-2 border-[#a6e3a1] shadow-md group-hover/photo:border-[#cba6f7]"
                            />
                            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#a6e3a1] text-[#11111b]">
                              Photo
                            </span>
                          </div>
                          <span className="text-[10px] text-[#a6e3a1] font-mono font-medium group-hover/photo:underline">
                            Uploaded Photo
                          </span>
                        </div>
                      )}

                      {/* 3D Flip Card Interactive Preview */}
                      <div
                        onClick={() =>
                          onOpenProfile?.({
                            id: currentUser?.id || 'me',
                            username: currentUser?.username || 'me',
                            displayName: settings['profile.displayName'] || currentUser?.displayName,
                            avatarUrl: settings['profile.avatarUrl'],
                            fileIcon: settings['profile.fileIcon'],
                            status: settings['profile.status'],
                            bio: settings['profile.bio'],
                          })
                        }
                        className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group/flip"
                        title="Click to preview your full profile card"
                      >
                        <DualIdentityAvatar
                          avatarUrl={settings['profile.avatarUrl']}
                          fileIcon={settings['profile.fileIcon']}
                          size={64}
                          alt={settings['profile.displayName'] || 'Developer'}
                          showIndicatorDot={true}
                        />
                        <span className="text-[10px] font-mono text-[#a6adc8] flex items-center gap-1">
                          {settings['profile.avatarUrl'] ? (
                            <span className="text-[#cba6f7] font-semibold flex items-center gap-1 group-hover/flip:underline">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#a6e3a1] animate-pulse" />
                              3D Flip (Click to View)
                            </span>
                          ) : (
                            <span className="text-[#6c7086]">Default: .{settings['profile.fileIcon'] || 'ts'}</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Device Upload Controls */}
                    <div className="flex-1 space-y-2.5 text-center sm:text-left">
                      {/* Hidden file input */}
                      <input
                        ref={avatarFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleSelectAvatarFromDevice}
                        className="hidden"
                      />

                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                        <button
                          type="button"
                          onClick={() => avatarFileInputRef.current?.click()}
                          disabled={isUploadingAvatar}
                          className="px-3.5 py-1.5 bg-[#313244] hover:bg-[#45475a] text-[#cdd6f4] rounded text-xs flex items-center gap-2 cursor-pointer font-sans font-semibold border border-[#45475a] transition-all hover:border-[#cba6f7] shadow-sm disabled:opacity-50"
                        >
                          <Upload className="w-3.5 h-3.5 text-[#cba6f7]" />
                          <span>{isUploadingAvatar ? 'Loading Image...' : 'Choose from Device'}</span>
                        </button>

                        {settings['profile.avatarUrl'] && (
                          <button
                            type="button"
                            onClick={handleRemoveAvatar}
                            className="px-3 py-1.5 bg-[#313244] hover:bg-[#45475a] text-[#f38ba8] rounded text-xs flex items-center gap-1.5 cursor-pointer font-sans border border-[#45475a] transition-colors"
                            title="Remove uploaded photo and revert to language symbol only"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>

                      <p className="text-[11px] text-[#6c7086]">
                        Local Device Upload Only • Supports PNG, JPG, WEBP (Max 5MB) • Converted locally via FileReader for instant preview and offline persistence.
                      </p>
                    </div>
                  </div>

                  {/* Developer Signature Language Symbol Grid */}
                  <div className="pt-2 border-t border-[#313244]">
                    <div className="text-xs font-semibold text-[#cdd6f4] mb-2 flex items-center justify-between">
                      <span>Default Developer Language Badge:</span>
                      <span className="text-[11px] font-mono text-[#cba6f7]">
                        .{settings['profile.fileIcon']}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {FILE_ICON_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => updateSetting('profile.fileIcon', opt.id)}
                          className={`p-2 rounded border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                            settings['profile.fileIcon'] === opt.id
                              ? 'bg-[#cba6f7]/20 border-[#cba6f7] text-[#cdd6f4] font-bold shadow-sm ring-1 ring-[#cba6f7]/50'
                              : 'bg-[#11111b] border-[#313244] hover:border-[#45475a] text-[#a6adc8] hover:text-[#cdd6f4]'
                          }`}
                        >
                          <FileIcon name={opt.id} size={18} />
                          <span className="text-[10px] font-mono truncate">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="px-4 py-2 bg-[#007acc] hover:bg-[#0062a3] text-white text-xs font-semibold rounded flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Save Profile Changes</span>
                  </button>
                </div>
              </section>
            )}

            {/* TAB 2: CHAT & MESSAGING */}
            {(activeTab === 'chat' || searchQuery) && matchesSearch('chat messaging send enter tab formatting preview') && (
              <section className="space-y-4">
                <div className="border-b border-[var(--border)] pb-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#007acc]">
                    Chat & Messaging
                  </h2>
                  <p className="text-xs text-[#858585] mt-0.5">
                    Customize message dispatch keybindings, code tab sizes, link previews, and live typing streams.
                  </p>
                </div>

                {/* chat.sendOnEnter */}
                <div className="p-3.5 rounded border border-[var(--border)] bg-[#252526] light-plus:bg-[#f9f9f9] flex items-center justify-between">
                  <div className="pr-4">
                    <div className="text-xs font-bold text-[var(--text)] font-mono">chat.sendOnEnter</div>
                    <div className="text-xs text-[#858585] mt-0.5">
                      {settings['chat.sendOnEnter']
                        ? 'Press Enter to send message (Shift+Enter for newline)'
                        : 'Press Ctrl+Enter / Cmd+Enter to send message (Enter adds newline for multiline code)'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSetting('chat.sendOnEnter', !settings['chat.sendOnEnter'])}
                    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                      settings['chat.sendOnEnter'] ? 'bg-[#007acc]' : 'bg-[#3c3c3c]'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 bg-white rounded-full transition-transform transform ${
                        settings['chat.sendOnEnter'] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* chat.tabSize */}
                <div className="p-3.5 rounded border border-[var(--border)] bg-[#252526] light-plus:bg-[#f9f9f9] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[var(--text)] font-mono">chat.tabSize</div>
                    <div className="text-xs text-[#858585] mt-0.5">
                      Number of spaces inserted when pressing Tab key inside the message input.
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[2, 4].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => updateSetting('chat.tabSize', size)}
                        className={`px-3 py-1 rounded text-xs font-mono cursor-pointer border ${
                          settings['chat.tabSize'] === size
                            ? 'bg-[#007acc] text-white border-[#007acc]'
                            : 'bg-[#1e1e1e] light-plus:bg-white text-[var(--text)] border-[#3c3c3c]'
                        }`}
                      >
                        {size} spaces
                      </button>
                    ))}
                  </div>
                </div>

                {/* chat.formatOnPaste */}
                <div className="p-3.5 rounded border border-[var(--border)] bg-[#252526] light-plus:bg-[#f9f9f9] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[var(--text)] font-mono">chat.formatOnPaste</div>
                    <div className="text-xs text-[#858585] mt-0.5">
                      Automatically detect syntax and wrap pasted snippets in markdown code blocks.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSetting('chat.formatOnPaste', !settings['chat.formatOnPaste'])}
                    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                      settings['chat.formatOnPaste'] ? 'bg-[#007acc]' : 'bg-[#3c3c3c]'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 bg-white rounded-full transition-transform transform ${
                        settings['chat.formatOnPaste'] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* chat.inlineLinkPreviews */}
                <div className="p-3.5 rounded border border-[var(--border)] bg-[#252526] light-plus:bg-[#f9f9f9] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[var(--text)] font-mono">chat.inlineLinkPreviews</div>
                    <div className="text-xs text-[#858585] mt-0.5">
                      Render rich OpenGraph embed cards (title, thumbnail, description) for posted links.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSetting('chat.inlineLinkPreviews', !settings['chat.inlineLinkPreviews'])}
                    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                      settings['chat.inlineLinkPreviews'] ? 'bg-[#007acc]' : 'bg-[#3c3c3c]'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 bg-white rounded-full transition-transform transform ${
                        settings['chat.inlineLinkPreviews'] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* chat.liveTypingStream */}
                <div className="p-3.5 rounded border border-[var(--border)] bg-[#252526] light-plus:bg-[#f9f9f9] flex items-center justify-between">
                  <div className="pr-4">
                    <div className="text-xs font-bold text-[var(--text)] font-mono">chat.liveTypingStream</div>
                    <div className="text-xs text-[#858585] mt-0.5">
                      Broadcast real-time keystrokes as a ghost draft line in the editor feed (vs standard &quot;typing...&quot; indicator).
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSetting('chat.liveTypingStream', !settings['chat.liveTypingStream'])}
                    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                      settings['chat.liveTypingStream'] ? 'bg-[#007acc]' : 'bg-[#3c3c3c]'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 bg-white rounded-full transition-transform transform ${
                        settings['chat.liveTypingStream'] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </section>
            )}

            {/* TAB 3: NOTIFICATIONS & SOUNDS */}
            {(activeTab === 'notifications' || searchQuery) && matchesSearch('notifications sounds audio bell mute volume') && (
              <section className="space-y-4">
                <div className="border-b border-[var(--border)] pb-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#cca700]">
                    Notifications & Sounds
                  </h2>
                  <p className="text-xs text-[#858585] mt-0.5">
                    Configure web desktop push permissions, audio cue tones, and channel notification overrides.
                  </p>
                </div>

                {/* notifications.level */}
                <div className="p-3.5 rounded border border-[var(--border)] bg-[#252526] light-plus:bg-[#f9f9f9] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[var(--text)] font-mono">notifications.level</div>
                    <div className="text-xs text-[#858585] mt-0.5">
                      Determines which messages trigger audio alerts and desktop notifications.
                    </div>
                  </div>
                  <select
                    value={settings['notifications.level']}
                    onChange={(e) => updateSetting('notifications.level', e.target.value as any)}
                    className="px-3 py-1.5 rounded bg-[#1e1e1e] light-plus:bg-white border border-[#3c3c3c] text-xs outline-none font-mono"
                  >
                    <option value="all">All Messages</option>
                    <option value="mentions">Only Direct Mentions (@me)</option>
                    <option value="none">Nothing (Do Not Disturb)</option>
                  </select>
                </div>

                {/* notifications.desktop */}
                <div className="p-3.5 rounded border border-[var(--border)] bg-[#252526] light-plus:bg-[#f9f9f9] flex items-center justify-between">
                  <div className="pr-4">
                    <div className="text-xs font-bold text-[var(--text)] font-mono">notifications.desktop</div>
                    <div className="text-xs text-[#858585] mt-0.5">
                      Web desktop notifications when you receive mentions or messages while away from ChatAbit.
                    </div>
                    <div className="text-[11px] text-[#007acc] mt-1 font-mono">
                      Browser Permission: {desktopPermStatus}
                    </div>
                  </div>
                  {desktopPermStatus !== 'granted' ? (
                    <button
                      type="button"
                      onClick={handleRequestDesktopPermission}
                      className="px-3 py-1.5 bg-[#007acc] hover:bg-[#0062a3] text-white text-xs font-semibold rounded cursor-pointer flex-shrink-0"
                    >
                      Enable Desktop
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => updateSetting('notifications.desktop', !settings['notifications.desktop'])}
                      className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                        settings['notifications.desktop'] ? 'bg-[#007acc]' : 'bg-[#3c3c3c]'
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 bg-white rounded-full transition-transform transform ${
                          settings['notifications.desktop'] ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  )}
                </div>

                {/* sound.messageReceived */}
                <div className="p-3.5 rounded border border-[var(--border)] bg-[#252526] light-plus:bg-[#f9f9f9] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[var(--text)] font-mono">sound.messageReceived</div>
                    <div className="text-xs text-[#858585] mt-0.5">
                      Audio tone played when an incoming message arrives.
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={settings['sound.messageReceived']}
                      onChange={(e) => updateSetting('sound.messageReceived', e.target.value as any)}
                      className="px-3 py-1.5 rounded bg-[#1e1e1e] light-plus:bg-white border border-[#3c3c3c] text-xs outline-none font-mono"
                    >
                      <option value="subtle-ping">Subtle Ping (Sine wave)</option>
                      <option value="vscode-bell">VS Code Bell Chime</option>
                      <option value="mechanical-click">Mechanical Keyboard Click</option>
                      <option value="mute">Mute</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleTestSound('message')}
                      title="Test Audio Cue"
                      className="p-1.5 rounded bg-[#37373d] hover:bg-[#47474d] text-white cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* sound.mentionReceived */}
                <div className="p-3.5 rounded border border-[var(--border)] bg-[#252526] light-plus:bg-[#f9f9f9] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[var(--text)] font-mono">sound.mentionReceived</div>
                    <div className="text-xs text-[#858585] mt-0.5">
                      Priority dual chime played for direct @mentions.
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={settings['sound.mentionReceived']}
                      onChange={(e) => updateSetting('sound.mentionReceived', e.target.value as any)}
                      className="px-3 py-1.5 rounded bg-[#1e1e1e] light-plus:bg-white border border-[#3c3c3c] text-xs outline-none font-mono"
                    >
                      <option value="distinct-tone">Distinct High-Priority Tone</option>
                      <option value="mute">Mute</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleTestSound('mention')}
                      title="Test Mention Cue"
                      className="p-1.5 rounded bg-[#37373d] hover:bg-[#47474d] text-white cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* notifications.mutedChannels */}
                <div className="p-3.5 rounded border border-[var(--border)] bg-[#252526] light-plus:bg-[#f9f9f9] space-y-2">
                  <div className="text-xs font-bold text-[var(--text)] font-mono">notifications.mutedChannels</div>
                  <div className="text-xs text-[#858585]">
                    Select specific channels to mute completely from audio and push alerts.
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {channels.map((ch) => {
                      const isMuted = settings['notifications.mutedChannels'].includes(ch.id);
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => toggleChannelMute(ch.id)}
                          className={`px-2.5 py-1 rounded text-xs font-mono cursor-pointer flex items-center gap-1.5 border transition-colors ${
                            isMuted
                              ? 'bg-red-950/40 text-red-300 border-red-800'
                              : 'bg-[#1e1e1e] light-plus:bg-white text-[#858585] border-[#3c3c3c] hover:border-[#858585]'
                          }`}
                        >
                          {isMuted ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3" />}
                          <span>#{ch.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* TAB 4: KEYBINDINGS & SHORTCUTS */}
            {(activeTab === 'keybindings' || searchQuery) && matchesSearch('keybindings shortcuts keyboard keys') && (
              <section className="space-y-4">
                <div className="border-b border-[var(--border)] pb-2 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-[#89d185]">
                      Keyboard Shortcuts
                    </h2>
                    <p className="text-xs text-[#858585] mt-0.5">
                      Configure and remap keybindings. Click any shortcut to record new keys.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setKeybindings(DEFAULT_KEYBINDINGS);
                      saveStoredKeybindings(DEFAULT_KEYBINDINGS);
                    }}
                    className="px-2.5 py-1 bg-[#37373d] hover:bg-[#47474d] text-white text-xs rounded flex items-center gap-1.5 font-mono cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset All to Default</span>
                  </button>
                </div>

                {recordingId && (
                  <div className="p-3 bg-[#007acc]/20 border border-[#007acc] rounded text-xs flex items-center justify-between animate-pulse">
                    <span className="font-semibold text-white">
                      Press desired key combination (e.g. Ctrl+Alt+K)... {recordingBuffer}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRecordingId(null)}
                      className="px-2 py-0.5 bg-[#3c3c3c] text-white rounded text-[11px]"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <div className="border border-[var(--border)] rounded overflow-hidden">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#252526] light-plus:bg-[#e8e8e8] text-[#858585] border-b border-[var(--border)]">
                      <tr>
                        <th className="py-2 px-3">Command</th>
                        <th className="py-2 px-3">Keybinding</th>
                        <th className="py-2 px-3">Source</th>
                        <th className="py-2 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] bg-[#1e1e1e] light-plus:bg-white">
                      {keybindings.map((kb) => (
                        <tr key={kb.id} className="hover:bg-[#2a2d2e] light-plus:hover:bg-[#f0f0f0] transition-colors">
                          <td className="py-2 px-3 font-semibold text-[var(--text)]">
                            <div>{kb.title}</div>
                            <div className="text-[10px] text-[#858585]">{kb.command}</div>
                          </td>
                          <td className="py-2 px-3">
                            <button
                              type="button"
                              onClick={() => setRecordingId(kb.id)}
                              className="px-2 py-1 bg-[#2d2d2d] light-plus:bg-[#f0f0f0] border border-[#444] rounded text-white light-plus:text-black hover:border-[#007acc] font-bold text-[11px] cursor-pointer"
                            >
                              {recordingId === kb.id ? 'Recording...' : kb.keybinding}
                            </button>
                          </td>
                          <td className="py-2 px-3 text-[#858585] text-[11px]">{kb.source}</td>
                          <td className="py-2 px-3 text-right">
                            {kb.source === 'User' && (
                              <button
                                type="button"
                                onClick={() => handleResetKeybinding(kb.id)}
                                title="Reset to default"
                                className="p-1 hover:text-white text-[#858585] cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* TAB 5: PRIVACY & SAFETY */}
            {(activeTab === 'privacy' || searchQuery) && matchesSearch('privacy safety blocked sessions devices security') && (
              <section className="space-y-4">
                <div className="border-b border-[var(--border)] pb-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#f9826c]">
                    Privacy, Blocklist & Security
                  </h2>
                  <p className="text-xs text-[#858585] mt-0.5">
                    Control who can initiate direct chats with you and manage blocked accounts and devices.
                  </p>
                </div>

                {/* privacy.dmPolicy */}
                <div className="p-3.5 rounded border border-[var(--border)] bg-[#252526] light-plus:bg-[#f9f9f9] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[var(--text)] font-mono">privacy.dmPolicy</div>
                    <div className="text-xs text-[#858585] mt-0.5">
                      Specify who is permitted to send you unsolicited direct messages.
                    </div>
                  </div>
                  <select
                    value={settings['privacy.dmPolicy']}
                    onChange={(e) => updateSetting('privacy.dmPolicy', e.target.value as any)}
                    className="px-3 py-1.5 rounded bg-[#1e1e1e] light-plus:bg-white border border-[#3c3c3c] text-xs outline-none font-mono"
                  >
                    <option value="everyone">Everyone on ChatAbit</option>
                    <option value="friends">Only Confirmed Friends</option>
                    <option value="nobody">Nobody (Lock DMs)</option>
                  </select>
                </div>

                {/* Blocked Users Table */}
                <div className="p-3.5 rounded border border-[var(--border)] bg-[#252526] light-plus:bg-[#f9f9f9] space-y-3">
                  <div className="text-xs font-bold text-[var(--text)] font-mono">privacy.blockedUsers</div>
                  <div className="text-xs text-[#858585]">
                    Blocked developers cannot send you direct messages or mention you in channels.
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={blockedInput}
                      onChange={(e) => setBlockedInput(e.target.value)}
                      placeholder="Username to block (e.g. spammer404)"
                      className="flex-1 px-3 py-1.5 rounded bg-[#1e1e1e] light-plus:bg-white border border-[#3c3c3c] text-xs outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddBlockedUser}
                      className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-white text-xs font-mono rounded cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Block</span>
                    </button>
                  </div>

                  {settings['privacy.blockedUsers'].length === 0 ? (
                    <div className="text-xs text-[#858585] italic pt-1">
                      No users currently blocked.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#3c3c3c] pt-2">
                      {settings['privacy.blockedUsers'].map((user) => (
                        <div key={user} className="py-2 flex items-center justify-between text-xs font-mono">
                          <span className="text-red-300">@{user}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveBlockedUser(user)}
                            className="text-xs text-[#007acc] hover:underline cursor-pointer"
                          >
                            Unblock
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Active Sessions & Devices */}
                <div className="p-3.5 rounded border border-[var(--border)] bg-[#252526] light-plus:bg-[#f9f9f9] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[var(--text)]">Active Sessions & Workbenches</div>
                      <div className="text-xs text-[#858585]">
                        Logged in sessions authenticated to your ChatAbit user token.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStatusMessage({ text: 'All other browser sessions were revoked.', type: 'success' })}
                      className="px-2.5 py-1 border border-red-800 text-red-300 hover:bg-red-950/40 rounded text-[11px] font-mono cursor-pointer"
                    >
                      Revoke Other Sessions
                    </button>
                  </div>

                  <div className="divide-y divide-[#3c3c3c]">
                    <div className="py-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Laptop className="w-4 h-4 text-[#89d185]" />
                        <div>
                          <div className="font-semibold text-white light-plus:text-black">
                            This Device (Active Workbench)
                          </div>
                          <div className="text-[11px] text-[#858585]">
                            Windows PC • Chrome • 127.0.0.1
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded text-[10px] font-bold">
                        ONLINE NOW
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* TAB 6: APPEARANCE & THEME */}
            {(activeTab === 'appearance' || searchQuery) && matchesSearch('appearance theme colors workbench dark light accent') && (
              <section className="space-y-4">
                <div className="border-b border-[var(--border)] pb-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#bd93f9]">
                    Appearance & Workbench Themes
                  </h2>
                  <p className="text-xs text-[#858585] mt-0.5">
                    Select authentic VS Code color themes, custom syntax accents, and editor ligatures.
                  </p>
                </div>

                {/* Row: workbench.colorTheme */}
                <div className="p-3.5 rounded border border-[#313244] bg-[#181825] flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-[#cdd6f4] font-mono">workbench.colorTheme</div>
                    <div className="text-xs text-[#a6adc8] mt-0.5">
                      Specifies the active color theme applied to the workbench and editor canvas.
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Inline color preview dots */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1e1e2e] border border-[#313244]" title="Theme Palette Preview">
                      <span className="text-[10px] text-[#6c7086]">preview:</span>
                      <span
                        className="w-3 h-3 rounded-full border border-black/40 shadow-sm"
                        style={{ backgroundColor: getTheme(currentColorTheme).colors.bg }}
                      />
                      <span
                        className="w-3 h-3 rounded-full border border-black/40 shadow-sm"
                        style={{ backgroundColor: getTheme(currentColorTheme).colors.sidebar }}
                      />
                      <span
                        className="w-3 h-3 rounded-full border border-black/40 shadow-sm"
                        style={{ backgroundColor: getTheme(currentColorTheme).colors.accent }}
                      />
                    </div>

                    {/* Compact Select Dropdown */}
                    <select
                      value={currentColorTheme}
                      onChange={(e) => {
                        updateSetting('workbench.colorTheme', e.target.value);
                        onSelectTheme(e.target.value);
                      }}
                      className="bg-[#1e1e2e] text-[#cdd6f4] border border-[#313244] focus:border-[#cba6f7] rounded px-3 py-1.5 text-xs font-mono outline-none cursor-pointer"
                    >
                      {COLOR_THEMES.map((theme) => (
                        <option key={theme.id} value={theme.id} className="bg-[#1e1e2e] text-[#cdd6f4]">
                          {theme.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Custom Accent Color */}
                <div className="p-3.5 rounded border border-[var(--border)] bg-[#252526] light-plus:bg-[#f9f9f9] space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[var(--text)]">Custom UI Accent Color</div>
                      <div className="text-xs text-[#858585]">
                        Override the theme&apos;s active selection and highlight accent color.
                      </div>
                    </div>
                    {customAccentColor && (
                      <button
                        type="button"
                        onClick={() => {
                          updateSetting('workbench.customAccent', null);
                          onSetCustomAccent(null);
                        }}
                        className="text-xs text-[#858585] hover:text-white underline cursor-pointer"
                      >
                        Reset to theme default
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {PRESET_ACCENTS.map((acc) => (
                      <button
                        key={acc.name}
                        type="button"
                        title={acc.name}
                        onClick={() => {
                          updateSetting('workbench.customAccent', acc.color);
                          onSetCustomAccent(acc.color);
                        }}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          customAccentColor === acc.color ? 'scale-125 border-white' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: acc.color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Font Ligatures */}
                <div className="p-3.5 rounded border border-[var(--border)] bg-[#252526] light-plus:bg-[#f9f9f9] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[var(--text)] font-mono">editor.fontLigatures</div>
                    <div className="text-xs text-[#858585] mt-0.5">
                      Enable programming font ligatures (e.g. `===`, `!=`, `=&gt;`) in code blocks.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSetting('editor.fontLigatures', !settings['editor.fontLigatures'])}
                    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                      settings['editor.fontLigatures'] ? 'bg-[#007acc]' : 'bg-[#3c3c3c]'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 bg-white rounded-full transition-transform transform ${
                        settings['editor.fontLigatures'] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

