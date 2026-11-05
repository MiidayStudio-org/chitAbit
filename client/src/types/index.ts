export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  avatarUrl?: string | null;
  fileIcon?: string;
  messageLanguage?: string;
  colorTheme?: string;
  customAccentColor?: string | null;
  highlightAllMessages?: boolean;
  shareLiveTyping?: boolean;
  isBot?: boolean;
  createdAt?: number;
  role?: 'Core' | 'Bot' | 'Member';
  status?: 'Online' | 'Idle' | 'Offline';
  bio?: string;
  githubUsername?: string;
}

export interface LiveDraft {
  senderId: string;
  senderUsername: string;
  senderFileIcon?: string;
  messageLanguage?: string;
  channelId?: string | null;
  dmRecipientId?: string | null;
  text: string;
  cursorPos?: number;
  updatedAt: number;
}

export type NavigationTab = 'explorer' | 'friends' | 'search' | 'settings' | 'home' | 'chats';

export interface OpenTab {
  id: string;
  type: 'channel' | 'dm' | 'settings';
  name: string;
  displayName: string;
  fileIcon?: string;
  isBot?: boolean;
  status?: 'Online' | 'Idle' | 'Offline';
}

export interface ActiveChat {
  type: 'dm' | 'channel' | 'settings';
  id: string;
  name: string;
  displayName?: string;
  avatar?: string;
  avatarColor?: string;
  avatarUrl?: string | null;
  fileIcon?: string;
  handle?: string;
  isBot?: boolean;
  status?: 'Online' | 'Idle' | 'Offline';
  bio?: string;
  description?: string;
  roomId?: string;
}

export interface Channel {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: number;
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  users: string[];
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: number;
  sender_username?: string;
  sender_display_name?: string;
  sender_avatar_color?: string;
  sender_avatar_url?: string | null;
  receiver_username?: string;
  receiver_display_name?: string;
  receiver_avatar_color?: string;
}

export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

export interface Message {
  id: string;
  channel_id: string | null;
  dm_recipient_id: string | null;
  sender_id: string;
  sender_username: string;
  sender_display_name?: string;
  sender_avatar_color?: string;
  sender_avatar_url?: string | null;
  sender_file_icon?: string | null;
  sender_message_language?: string | null;
  message_language?: string | null;
  sender_is_bot?: boolean;
  sender_role?: 'Core' | 'Bot' | 'Member';
  content: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  attachment_size?: number | null;
  read_at?: number | null;
  edited_at: number | null;
  deleted_at: number | null;
  created_at: number;
  reactions: ReactionGroup[];
  isStreaming?: boolean;
  status?: 'pending' | 'delivered' | 'failed';
  localTempId?: string;
  linkPreview?: LinkPreview | null;
  reply_to?: {
    id: string;
    sender_username: string;
    content: string;
  } | null;
}

export interface OnlineUser {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  channelId: string | null;
  status?: 'Online' | 'Idle' | 'Offline';
}

export interface LastMessage {
  content: string;
  timestamp: number;
  senderId: string;
  senderUsername: string;
  status?: 'sent' | 'delivered' | 'read';
}

export interface ConversationItem {
  id: string;
  type: 'channel' | 'dm';
  name: string;
  displayName: string;
  avatarColor?: string;
  description?: string | null;
  isBot?: boolean;
  status?: 'Online' | 'Idle' | 'Offline';
  unreadCount?: number;
  lastMessage?: LastMessage;
  isPinned?: boolean;
}

export interface ChatAbitSettings {
  // Chat & Messaging
  'chat.sendOnEnter': boolean;
  'chat.tabSize': number;
  'chat.formatOnPaste': boolean;
  'chat.inlineLinkPreviews': boolean;
  'chat.liveTypingStream': boolean;

  // Notifications & Sound
  'notifications.level': 'all' | 'mentions' | 'none';
  'notifications.desktop': boolean;
  'notifications.mutedChannels': string[];
  'sound.messageReceived': 'subtle-ping' | 'vscode-bell' | 'mechanical-click' | 'mute';
  'sound.mentionReceived': 'distinct-tone' | 'mute';

  // Appearance & Workbench
  'workbench.colorTheme': string;
  'workbench.customAccent': string | null;
  'editor.fontLigatures': boolean;
  'editor.fontSize': number;

  // Privacy & Safety
  'privacy.dmPolicy': 'everyone' | 'friends' | 'nobody';
  'privacy.blockedUsers': string[];

  // Profile / Git Identity
  'profile.displayName': string;
  'profile.bio': string;
  'profile.status': string;
  'profile.githubUsername': string;
  'profile.gitBranch': string;
  'profile.useAvatarUrl': boolean;
  'profile.avatarUrl': string;
  'profile.fileIcon': string;
}

export interface KeyboardShortcutItem {
  id: string;
  title: string;
  command: string;
  keybinding: string;
  defaultKeybinding: string;
  source: 'User' | 'Default';
}
