import { ChatAbitSettings, KeyboardShortcutItem } from '../types';

export const DEFAULT_SETTINGS: ChatAbitSettings = {
  // Chat & Messaging
  'chat.sendOnEnter': true,
  'chat.tabSize': 2,
  'chat.formatOnPaste': true,
  'chat.inlineLinkPreviews': true,
  'chat.liveTypingStream': true,

  // Notifications & Sound
  'notifications.level': 'all',
  'notifications.desktop': true,
  'notifications.mutedChannels': [],
  'sound.messageReceived': 'subtle-ping',
  'sound.mentionReceived': 'distinct-tone',

  // Appearance & Workbench
  'workbench.colorTheme': 'dark-plus',
  'workbench.customAccent': null,
  'editor.fontLigatures': true,
  'editor.fontSize': 13,

  // Privacy & Safety
  'privacy.dmPolicy': 'everyone',
  'privacy.blockedUsers': [],

  // Profile / Git Identity
  'profile.displayName': '',
  'profile.bio': '',
  'profile.status': 'Online',
  'profile.githubUsername': '',
  'profile.gitBranch': 'main',
  'profile.useAvatarUrl': false,
  'profile.avatarUrl': '',
  'profile.fileIcon': 'ts',
};

export const DEFAULT_KEYBINDINGS: KeyboardShortcutItem[] = [
  {
    id: 'workbench.action.toggleSidebar',
    title: 'View: Toggle Primary Side Bar',
    command: 'workbench.action.toggleSidebar',
    keybinding: 'Ctrl+B',
    defaultKeybinding: 'Ctrl+B',
    source: 'Default',
  },
  {
    id: 'workbench.action.toggleTerminal',
    title: 'View: Toggle Integrated Terminal & Panels',
    command: 'workbench.action.toggleTerminal',
    keybinding: 'Ctrl+~',
    defaultKeybinding: 'Ctrl+~',
    source: 'Default',
  },
  {
    id: 'workbench.action.splitEditor',
    title: 'View: Split Editor Right',
    command: 'workbench.action.splitEditor',
    keybinding: 'Ctrl+\\',
    defaultKeybinding: 'Ctrl+\\',
    source: 'Default',
  },
  {
    id: 'workbench.action.quickOpen',
    title: 'File: Quick Open / Command Palette',
    command: 'workbench.action.quickOpen',
    keybinding: 'Ctrl+P',
    defaultKeybinding: 'Ctrl+P',
    source: 'Default',
  },
  {
    id: 'workbench.action.findInFiles',
    title: 'Search: Find in Messages and Files',
    command: 'workbench.action.findInFiles',
    keybinding: 'Ctrl+Shift+F',
    defaultKeybinding: 'Ctrl+Shift+F',
    source: 'Default',
  },
  {
    id: 'workbench.action.nextEditorTab',
    title: 'View: Switch to Next Chat Tab',
    command: 'workbench.action.nextEditorTab',
    keybinding: 'Ctrl+Tab',
    defaultKeybinding: 'Ctrl+Tab',
    source: 'Default',
  },
  {
    id: 'workbench.action.closeActiveTab',
    title: 'View: Close Active Tab',
    command: 'workbench.action.closeActiveTab',
    keybinding: 'Ctrl+W',
    defaultKeybinding: 'Ctrl+W',
    source: 'Default',
  },
  {
    id: 'chat.action.sendMessage',
    title: 'Chat: Send Current Message',
    command: 'chat.action.sendMessage',
    keybinding: 'Enter',
    defaultKeybinding: 'Enter',
    source: 'Default',
  },
];

export function getStoredSettings(): ChatAbitSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem('chatabit_settings');
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: ChatAbitSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('chatabit_settings', JSON.stringify(settings, null, 2));
    window.dispatchEvent(new CustomEvent('chatabit:settings_changed', { detail: settings }));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

export function getStoredKeybindings(): KeyboardShortcutItem[] {
  if (typeof window === 'undefined') return DEFAULT_KEYBINDINGS;
  try {
    const raw = localStorage.getItem('chatabit_keybindings');
    if (!raw) return DEFAULT_KEYBINDINGS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_KEYBINDINGS;
    return parsed;
  } catch {
    return DEFAULT_KEYBINDINGS;
  }
}

export function saveStoredKeybindings(items: KeyboardShortcutItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('chatabit_keybindings', JSON.stringify(items, null, 2));
    window.dispatchEvent(new CustomEvent('chatabit:keybindings_changed', { detail: items }));
  } catch (err) {
    console.error('Failed to save keybindings:', err);
  }
}
