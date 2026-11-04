import type { UserRow } from '../db/index.js';

const DEFAULT_BIO = 'Hey there! I am using chitAbit.';

// What anyone may see about a user (friends list, search, user list, DM lookup)
export function toPublicUser(u: UserRow) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    avatarColor: u.avatar_color,
    avatarUrl: u.avatar_url || null,
    fileIcon: u.file_icon || 'ts',
    bio: u.bio || DEFAULT_BIO,
    status: u.status || 'Online',
    isBot: Boolean(u.is_bot),
    createdAt: u.created_at,
  };
}

// Full profile incl. personal settings: only ever sent to the user themself
export function toUserDTO(u: UserRow) {
  return {
    ...toPublicUser(u),
    messageLanguage: u.message_language || 'typescript',
    colorTheme: u.color_theme || 'dark-plus',
    customAccentColor: u.custom_accent_color || null,
    highlightAllMessages: Boolean(u.highlight_all_messages ?? 1),
    shareLiveTyping: Boolean(u.share_live_typing ?? 1),
  };
}
