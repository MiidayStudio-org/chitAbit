import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Message, User, ActiveChat, LiveDraft } from '../../types';
import { FileIcon, getLanguageForFileIcon } from '../../utils/fileIcons';
import { DualIdentityAvatar } from './DualIdentityAvatar';
import { ProfileModalUser } from './UserProfileModal';
import { HighlightedMessageBody } from './HighlightedMessageBody';
import {
  formatTime,
  getDateDividerLabel,
} from '../../utils/chatUtils';
import {
  Smile,
  Reply,
  Edit2,
  Trash2,
  Download,
  File,
  Check,
  Sparkles,
  Bot,
  ChevronDown,
  ChevronRight,
  Bookmark,
  GitCommit,
  GitPullRequest,
  MessageSquare,
  Share2,
  Copy,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';

export interface EditorMessageFeedProps {
  activeChat: ActiveChat | null;
  messages: Message[];
  currentUser: User | null;
  typingUsers: string[];
  isBotTyping: boolean;
  isLightMode?: boolean;
  colorTheme?: string;
  highlightAllMessages?: boolean;
  liveDrafts?: LiveDraft[];
  shareLiveTyping?: boolean;
  unreadCount?: number;
  highlightMessageId?: string | null;
  onEdit: (messageId: string, currentContent: string) => void;
  onDelete: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onAskBot?: (query: string) => void;
  onReply?: (message: Message) => void;
  onRetryMessage?: (message: Message) => void;
  onLoadOlderMessages?: () => void;
  hasMoreOlderMessages?: boolean;
  onOpenUserProfile?: (user: ProfileModalUser) => void;
}

function extractFirstUrl(text: string): string | null {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s<>"'`)]+/i);
  return match ? match[0] : null;
}

const LinkPreviewCard: React.FC<{ url: string }> = ({ url }) => {
  const [preview, setPreview] = useState<{
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/media/preview?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.preview && (d.preview.title || d.preview.description || d.preview.image)) {
          setPreview(d.preview);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!preview) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-2 mb-2 max-w-lg flex flex-col sm:flex-row gap-3 p-2.5 rounded bg-[#252526] light-plus:bg-[#f3f3f3] border border-[#3c3c3c] light-plus:border-[#e7e7e7] hover:border-[#007acc] transition-colors group text-left no-underline block"
    >
      {preview.image && (
        <img
          src={preview.image}
          alt={preview.title || 'preview'}
          className="w-full sm:w-28 h-20 object-cover rounded flex-shrink-0 bg-black/20"
        />
      )}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="text-[10px] text-[#858585] uppercase tracking-wider mb-0.5 flex items-center gap-1 font-sans">
            <span>{preview.siteName || new URL(url).hostname}</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
          </div>
          {preview.title && (
            <div className="text-xs font-semibold text-[#4fc1ff] group-hover:underline line-clamp-1 mb-1">
              {preview.title}
            </div>
          )}
          {preview.description && (
            <div className="text-[11px] text-[#cccccc] light-plus:text-[#444444] line-clamp-2 leading-relaxed">
              {preview.description}
            </div>
          )}
        </div>
      </div>
    </a>
  );
};

const QUICK_EMOJIS = ['👍', '❤️', '🚀', '😂', '🎉'];

export function prepareDraftContent(rawText: string): string {
  if (!rawText) return '';
  // Check for triple backtick fences count
  const fences = rawText.match(/```/g);
  if (fences && fences.length % 2 === 1) {
    // Incomplete code fence: append closing fence so markdown parser renders as code block without errors
    return `${rawText}\n\`\`\``;
  }
  return rawText;
}

export const EditorMessageFeed: React.FC<EditorMessageFeedProps> = ({
  activeChat,
  messages,
  currentUser,
  typingUsers,
  isBotTyping,
  isLightMode = false,
  colorTheme = 'dark-plus',
  highlightAllMessages = true,
  liveDrafts = [],
  shareLiveTyping = true,
  unreadCount = 0,
  highlightMessageId = null,
  onEdit,
  onDelete,
  onToggleReaction,
  onAskBot,
  onReply,
  onRetryMessage,
  onLoadOlderMessages,
  hasMoreOlderMessages = false,
  onOpenUserProfile,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Jump to highlighted message if specified
  useEffect(() => {
    if (highlightMessageId) {
      const el = document.getElementById(`msg-line-${highlightMessageId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightMessageId]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('chitabit_bookmarks');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [openReviewMessageId, setOpenReviewMessageId] = useState<string | null>(null);
  const [reviewInputText, setReviewInputText] = useState<Record<string, string>>({});
  const [isMinimapExpanded, setIsMinimapExpanded] = useState<boolean>(false);
  const [exportedMsgId, setExportedMsgId] = useState<string | null>(null);

  const getCommitHash = (msgId: string) => {
    let hash = 0;
    for (let i = 0; i < msgId.length; i++) {
      hash = (hash << 5) - hash + msgId.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).slice(0, 7).padStart(7, 'a');
  };

  const handleExportMessageAsMarkdown = (msg: Message) => {
    const md = `// [Line ${msg.id}] commit ${getCommitHash(msg.id)}\n// @${msg.sender_username} at ${formatTime(msg.created_at)}\n${msg.content}`;
    navigator.clipboard.writeText(md);
    setExportedMsgId(msg.id);
    setTimeout(() => setExportedMsgId(null), 2000);
  };

  const toggleBookmark = (id: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem('chitabit_bookmarks', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Compute relevant drafts for the active chat
  const relevantDrafts = useMemo(() => {
    if (!activeChat || shareLiveTyping === false || !liveDrafts) return [];
    if (activeChat.type === 'channel') {
      return liveDrafts.filter(
        (d) =>
          d.channelId === activeChat.id &&
          d.senderId !== currentUser?.id &&
          Boolean(d.text && d.text.length > 0)
      );
    } else if (activeChat.type === 'dm') {
      return liveDrafts.filter(
        (d) =>
          (d.dmRecipientId === currentUser?.id || !d.dmRecipientId) &&
          d.senderId === activeChat.id &&
          Boolean(d.text && d.text.length > 0)
      );
    }
    return [];
  }, [activeChat, shareLiveTyping, liveDrafts, currentUser]);

  const visibleDrafts = useMemo(() => relevantDrafts.slice(0, 3), [relevantDrafts]);
  const overflowDraftCount = Math.max(0, relevantDrafts.length - 3);
  const draftUsernames = useMemo(() => new Set(relevantDrafts.map((d) => d.senderUsername)), [relevantDrafts]);
  const nonDraftTypingUsers = useMemo(() => typingUsers.filter((u) => !draftUsernames.has(u)), [typingUsers, draftUsernames]);

  // Auto-scroll on new message or live draft update
  useEffect(() => {
    if (isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isBotTyping, liveDrafts, isAtBottom]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    setIsAtBottom(atBottom);

    if (el.scrollTop === 0 && hasMoreOlderMessages && onLoadOlderMessages) {
      const prevScrollHeight = el.scrollHeight;
      onLoadOlderMessages();
      requestAnimationFrame(() => {
        if (containerRef.current) {
          const newScrollHeight = containerRef.current.scrollHeight;
          containerRef.current.scrollTop = newScrollHeight - prevScrollHeight;
        }
      });
    }
  };

  /**
   * Replaces @mentions and /commands inside raw text with syntax highlighted spans
   */
  const formatTextWithSyntax = (text: string) => {
    if (!text) return text;
    // We format inline text directly in markdown custom renderer
    return text;
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden relative">
      {/* Scrollable Editor Feed */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-1 font-mono text-[13px] bg-[var(--bg)] text-[var(--text)] select-text transition-colors"
      >
        {/* Infinite Scroll trigger */}
        {hasMoreOlderMessages && (
          <div className="text-center py-2">
            <button
              type="button"
              onClick={onLoadOlderMessages}
              className="px-3 py-1 bg-[#252526] light-plus:bg-[#f3f3f3] border border-[#3c3c3c] light-plus:border-[#e7e7e7] text-[#858585] text-xs rounded hover:text-white cursor-pointer"
            >
              Load older messages...
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <div className="py-20 text-center select-none text-[#858585]">
            <div className="text-sm font-semibold">No messages in this file yet.</div>
            <div className="text-xs mt-1">Start typing below to append lines to the chat.</div>
          </div>
        )}

        {/* Render Message Lines (VS Code Comment/Thread format with Gutter & Line Numbers) */}
        {messages.map((msg, idx) => {
          const isMe = msg.sender_id === currentUser?.id;
          const prevMsg = idx > 0 ? messages[idx - 1] : null;
          const showDateDivider =
            !prevMsg ||
            new Date(msg.created_at).toDateString() !==
              new Date(prevMsg.created_at).toDateString();

          const isHovered = hoveredMessageId === msg.id;
          const isBookmarked = bookmarkedIds.has(msg.id);
          const isCollapsed = collapsedIds.has(msg.id);
          const isMultiLine = msg.content.includes('\n') || msg.content.includes('```');

          return (
            <React.Fragment key={msg.id}>
              {/* Date Divider (Styled as a VS Code region fold/divider) */}
              {showDateDivider && (
                <div className="flex items-center gap-3 my-3 select-none opacity-60">
                  <div className="h-[1px] flex-1 bg-[#3c3c3c] light-plus:bg-[#e7e7e7]" />
                  <span className="text-[11px] text-[#858585] uppercase tracking-wider font-semibold">
                    // --- {getDateDividerLabel(msg.created_at)} ---
                  </span>
                  <div className="h-[1px] flex-1 bg-[#3c3c3c] light-plus:bg-[#e7e7e7]" />
                </div>
              )}

              {/* VS Code Red Inline Unread Divider */}
              {unreadCount > 0 && idx === messages.length - unreadCount && (
                <div className="relative flex items-center justify-center my-3 select-none">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-red-500/60" />
                  </div>
                  <div className="relative px-3 py-0.5 bg-[var(--bg)] text-red-400 text-[10px] font-bold uppercase tracking-wider rounded border border-red-500/40 shadow-sm flex items-center gap-1.5 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span>─── NEW MESSAGES ({unreadCount}) ───</span>
                  </div>
                </div>
              )}

              {/* Message Row */}
              <div
                id={`msg-line-${msg.id}`}
                onMouseEnter={() => setHoveredMessageId(msg.id)}
                onMouseLeave={() => setHoveredMessageId(null)}
                className={`group relative flex items-start gap-1 py-1 px-1.5 rounded-sm transition-colors ${
                  highlightMessageId === msg.id
                    ? 'bg-yellow-500/20 ring-1 ring-yellow-400/80 animate-pulse'
                    : isMe
                    ? 'bg-[rgba(255,255,255,0.02)] light-plus:bg-[rgba(0,0,0,0.02)] border-l-2 border-[var(--accent)]'
                    : 'hover:bg-[rgba(255,255,255,0.02)] border-l-2 border-transparent'
                }`}
              >
                {/* VS Code Gutter: Glyph Margin (Bookmark/Breakpoint + Fold Arrow) + Line Number */}
                <div className="flex items-center gap-0.5 select-none flex-shrink-0 text-[#858585] text-xs font-mono mr-1.5 pt-0.5">
                  {/* Breakpoint / Bookmark Dot */}
                  <button
                    type="button"
                    title={isBookmarked ? 'Remove Bookmark (Breakpoint)' : 'Add Bookmark (Breakpoint)'}
                    onClick={() => toggleBookmark(msg.id)}
                    className="w-4 h-4 flex items-center justify-center cursor-pointer transition-all"
                  >
                    {isBookmarked ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#e51400] shadow-[0_0_6px_#e51400]" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-[#e51400]/40 opacity-0 group-hover:opacity-100 hover:!opacity-100" />
                    )}
                  </button>

                  {/* Folding Arrow */}
                  <div className="w-3.5 h-4 flex items-center justify-center">
                    {isMultiLine && (
                      <button
                        type="button"
                        title={isCollapsed ? 'Unfold code/message' : 'Fold message'}
                        onClick={() => toggleCollapse(msg.id)}
                        className="opacity-0 group-hover:opacity-100 text-[#858585] hover:text-white cursor-pointer"
                      >
                        {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>

                  {/* Sequential 3-Digit Line Number with Hover Metadata */}
                  <span
                    title={`Line ${String(idx + 1).padStart(3, '0')} • Sent at ${formatTime(msg.created_at)}`}
                    className={`w-8 text-right select-none text-[11px] font-mono leading-none transition-colors cursor-pointer ${
                      isHovered ? 'text-white light-plus:text-black font-semibold' : 'text-[#858585]/60'
                    }`}
                    onClick={() => setOpenReviewMessageId((prev) => (prev === msg.id ? null : msg.id))}
                  >
                    {String(idx + 1).padStart(3, '0')}
                  </span>
                </div>

                {/* Left Gutter: Dual-Identity Author Avatar */}
                <div
                  className="mt-0.5 flex-shrink-0 select-none mr-1.5 cursor-pointer"
                  onClick={() => {
                    if (onOpenUserProfile) {
                      if (isMe && currentUser) {
                        onOpenUserProfile({
                          id: currentUser.id,
                          username: currentUser.username,
                          displayName: currentUser.displayName,
                          avatarUrl: currentUser.avatarUrl,
                          fileIcon: currentUser.fileIcon,
                          status: currentUser.status,
                          bio: currentUser.bio,
                        });
                      } else {
                        onOpenUserProfile({
                          id: msg.sender_id,
                          username: msg.sender_username,
                          displayName: msg.sender_display_name,
                          avatarUrl: msg.sender_avatar_url,
                          fileIcon: msg.sender_file_icon || 'ts',
                          isBot: msg.sender_is_bot,
                          role: msg.sender_role,
                        });
                      }
                    }
                  }}
                  title={`View @${msg.sender_username}'s profile`}
                >
                  <DualIdentityAvatar
                    avatarUrl={isMe ? (currentUser?.avatarUrl || null) : (msg.sender_avatar_url || null)}
                    fileIcon={isMe ? (currentUser?.fileIcon || msg.sender_file_icon || 'ts') : (msg.sender_file_icon || 'ts')}
                    isBot={msg.sender_is_bot}
                    size={18}
                    alt={msg.sender_username}
                  />
                </div>

                {/* Main Column */}
                <div className="flex-1 min-w-0">
                  {/* Header: Username + Timestamp + Read Receipt + Git Blame Annotation */}
                  <div className="flex items-center gap-2 select-none mb-0.5 text-xs">
                    <span
                      onClick={() => {
                        if (onOpenUserProfile) {
                          if (isMe && currentUser) {
                            onOpenUserProfile({
                              id: currentUser.id,
                              username: currentUser.username,
                              displayName: currentUser.displayName,
                              avatarUrl: currentUser.avatarUrl,
                              fileIcon: currentUser.fileIcon,
                              status: currentUser.status,
                              bio: currentUser.bio,
                            });
                          } else {
                            onOpenUserProfile({
                              id: msg.sender_id,
                              username: msg.sender_username,
                              displayName: msg.sender_display_name,
                              avatarUrl: msg.sender_avatar_url,
                              fileIcon: msg.sender_file_icon || 'ts',
                              isBot: msg.sender_is_bot,
                              role: msg.sender_role,
                            });
                          }
                        }
                      }}
                      title={`Click to view @${msg.sender_username}'s profile`}
                      className={`font-bold cursor-pointer hover:underline ${
                        msg.sender_is_bot
                          ? 'text-[#cca700]'
                          : isMe
                          ? 'text-[#4fc1ff]'
                          : 'text-[#9cdcfe]'
                      }`}
                    >
                      {msg.sender_username}
                    </span>

                    {msg.sender_is_bot && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-[#cca700]/20 text-[#cca700] flex items-center gap-0.5 font-sans">
                        <Sparkles className="w-2.5 h-2.5" />
                        AI
                      </span>
                    )}

                    <span className="text-[11px] text-[#858585]">
                      {formatTime(msg.created_at)}
                    </span>

                    {/* Optimistic Status Indicators */}
                    {msg.status === 'pending' && (
                      <span className="text-[10px] text-[#858585] flex items-center gap-1 italic">
                        <Loader2 className="w-2.5 h-2.5 animate-spin text-[#007acc]" />
                        <span>sending...</span>
                      </span>
                    )}

                    {msg.status === 'failed' && (
                      <button
                        type="button"
                        onClick={() => onRetryMessage?.(msg)}
                        className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold underline cursor-pointer"
                        title="Click to retry sending"
                      >
                        <AlertCircle className="w-2.5 h-2.5 text-red-400" />
                        <span>Failed - Click to retry</span>
                      </button>
                    )}

                    {/* Read Receipt label */}
                    {isMe && msg.read_at && (
                      <span className="text-[10px] text-[#89d185] flex items-center gap-0.5 font-semibold">
                        <Check className="w-2.5 h-2.5" />
                        Read
                      </span>
                    )}

                    {/* Faded Git Blame Annotation on Row Hover */}
                    <div className="hidden md:flex items-center gap-1.5 text-[10px] text-[#858585]/40 group-hover:text-[#858585]/80 transition-colors ml-auto pr-2 font-mono flex-shrink-0">
                      <GitCommit className="w-2.5 h-2.5 text-[#007acc]/70" />
                      <span>{msg.sender_username}</span>
                      <span>•</span>
                      <span>{formatTime(msg.created_at)}</span>
                      <span>•</span>
                      <span className="text-[#9cdcfe]/70 font-semibold">{getCommitHash(msg.id)}</span>
                    </div>
                  </div>

                  {/* Quoted Reply Snippet */}
                  {msg.reply_to && (
                    <div className="mb-1.5 pl-2 border-l-2 border-[#007acc] text-[11px] text-[#858585] italic select-none">
                      <span className="font-semibold text-[#9cdcfe]">
                        @{msg.reply_to.sender_username}:
                      </span>{' '}
                      <span>{msg.reply_to.content.slice(0, 80)}</span>
                    </div>
                  )}

                  {/* Inline Attachment (Image, Video, or File Asset Card) */}
                  {msg.attachment_url && (
                    <div className="mb-2">
                      {msg.attachment_type?.startsWith('video/') || msg.attachment_url.match(/\.(mp4|webm|mov)$/i) ? (
                        <video
                          controls
                          src={msg.attachment_url}
                          className="max-h-72 max-w-full rounded border border-[#3c3c3c] light-plus:border-[#e7e7e7]"
                        />
                      ) : msg.attachment_type?.startsWith('image/') ? (
                        <a
                          href={msg.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block border border-[#3c3c3c] light-plus:border-[#e7e7e7] rounded overflow-hidden"
                        >
                          <img
                            src={msg.attachment_url}
                            alt={msg.attachment_name || 'attachment'}
                            className="max-h-72 object-contain"
                          />
                        </a>
                      ) : (
                        <a
                          href={msg.attachment_url}
                          download={msg.attachment_name || 'file'}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#252526] light-plus:bg-[#f3f3f3] border border-[#3c3c3c] light-plus:border-[#e7e7e7] rounded text-xs text-[#cccccc] light-plus:text-[#333333] hover:border-[#007acc] transition-colors"
                        >
                          <File className="w-4 h-4 text-[#007acc]" />
                          <span className="font-semibold">{msg.attachment_name || 'file'}</span>
                          {msg.attachment_size && (
                            <span className="text-[10px] text-[#858585]">
                              ({(msg.attachment_size / 1024).toFixed(1)} KB)
                            </span>
                          )}
                          <Download className="w-3.5 h-3.5 ml-1 text-[#858585]" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Message Body or Collapsed Code Banner */}
                  {isCollapsed ? (
                    <div
                      onClick={() => toggleCollapse(msg.id)}
                      className="flex items-center gap-2 py-1 px-2.5 my-1 bg-[#252526] light-plus:bg-[#e8e8e8] border border-dashed border-[#555] rounded text-xs text-[#858585] hover:text-[#cccccc] cursor-pointer select-none"
                    >
                      <span className="font-mono text-[11px] text-[#007acc]">
                        // &lt;folded message: {msg.content.slice(0, 50)}...&gt;
                      </span>
                      <ChevronRight className="w-3 h-3 ml-auto text-[#858585]" />
                    </div>
                  ) : (
                    <div className="text-[13px] leading-relaxed break-words">
                      <HighlightedMessageBody
                        rawContent={msg.content}
                        messageLanguage={
                          msg.message_language ||
                          msg.sender_message_language ||
                          getLanguageForFileIcon(msg.sender_file_icon)
                        }
                        theme={colorTheme}
                        highlightAllMessages={highlightAllMessages}
                        onAskBot={onAskBot}
                        isLightMode={isLightMode}
                      />
                    </div>
                  )}

                  {/* Inline Rich OpenGraph Preview for shared web links */}
                  {extractFirstUrl(msg.content) && (
                    <LinkPreviewCard url={extractFirstUrl(msg.content)!} />
                  )}

                  {/* Git Diff View for Edited Messages */}
                  {Boolean(msg.edited_at) && (
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono text-[#89d185] bg-[#89d185]/10 px-2 py-0.5 rounded border border-[#89d185]/20 select-none w-fit">
                      <GitCommit className="w-3 h-3 text-[#89d185]" />
                      <span className="font-bold">+</span>
                      <span>git diff: updated at commit {getCommitHash(msg.id + '_edit')}</span>
                    </div>
                  )}

                  {/* Streaming Cursor for DevBot */}
                  {msg.isStreaming && (
                    <span className="inline-block w-2 h-4 bg-[#007acc] animate-pulse ml-0.5 align-middle" />
                  )}

                  {/* Reaction Pills below message */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5 select-none">
                      {msg.reactions.map((r) => {
                        const hasReacted = currentUser && r.users.includes(currentUser.id);
                        return (
                          <button
                            key={r.emoji}
                            type="button"
                            onClick={() => onToggleReaction(msg.id, r.emoji)}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border transition-all cursor-pointer ${
                              hasReacted
                                ? 'bg-[#04395e] border-[#007acc] text-white'
                                : 'bg-[#252526] light-plus:bg-[#f3f3f3] border-[#3c3c3c] light-plus:border-[#e7e7e7] text-[#cccccc] light-plus:text-[#333333] hover:border-[#007acc]'
                            }`}
                          >
                            <span>{r.emoji}</span>
                            <span className="text-[10px] text-[#858585]">{r.count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Hover Action Toolbar on the right */}
                <div
                  className={`absolute right-2 top-2 flex items-center gap-1 bg-[#252526] light-plus:bg-[#f3f3f3] border border-[#3c3c3c] light-plus:border-[#e7e7e7] rounded px-1 py-0.5 shadow-md transition-opacity select-none ${
                    isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  {/* Quick Emoji Reaction Buttons */}
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => onToggleReaction(msg.id, emoji)}
                      className="p-1 hover:bg-[#37373d] light-plus:hover:bg-[#e0e0e0] rounded text-xs transition-transform hover:scale-125 cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}

                  {/* Inline Review Thread Toggle */}
                  <button
                    type="button"
                    title="Inline Review Comment"
                    onClick={() => setOpenReviewMessageId((prev) => (prev === msg.id ? null : msg.id))}
                    className="p-1 text-[#858585] hover:text-[#007acc] rounded hover:bg-[#37373d] cursor-pointer flex items-center gap-0.5 text-[11px]"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>

                  {/* Gist / Markdown Export */}
                  <button
                    type="button"
                    title="Export message as Gist / Markdown"
                    onClick={() => handleExportMessageAsMarkdown(msg)}
                    className="p-1 text-[#858585] hover:text-[#89d185] rounded hover:bg-[#37373d] cursor-pointer"
                  >
                    {exportedMsgId === msg.id ? <Check className="w-3.5 h-3.5 text-[#89d185]" /> : <Share2 className="w-3.5 h-3.5" />}
                  </button>

                  {/* Reply */}
                  {onReply && (
                    <button
                      type="button"
                      title="Reply to message"
                      onClick={() => onReply(msg)}
                      className="p-1 text-[#858585] hover:text-white rounded hover:bg-[#37373d] cursor-pointer"
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Edit & Delete for own messages */}
                  {isMe && (
                    <>
                      <button
                        type="button"
                        title="Edit message"
                        onClick={() => onEdit(msg.id, msg.content)}
                        className="p-1 text-[#858585] hover:text-white rounded hover:bg-[#37373d] cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Delete message"
                        onClick={() => onDelete(msg.id)}
                        className="p-1 text-[#858585] hover:text-red-400 rounded hover:bg-[#37373d] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Inline "Code Review" Comments Thread Block between lines */}
              {openReviewMessageId === msg.id && (
                <div className="my-1.5 ml-12 mr-3 p-2 bg-[#252526] light-plus:bg-[#f3f3f3] border-l-2 border-[#007acc] rounded-sm font-mono text-xs shadow-md">
                  <div className="flex items-center justify-between text-[11px] text-[#007acc] font-semibold mb-1.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <GitPullRequest className="w-3.5 h-3.5" />
                      <span>// INLINE REVIEW THREAD: Line {String(idx + 1).padStart(3, '0')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenReviewMessageId(null)}
                      className="p-0.5 text-[#858585] hover:text-white cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="text-[11px] text-[#cccccc] light-plus:text-[#333333] pl-2 border-l border-[#444] mb-2 py-0.5">
                    <span className="font-semibold text-[#9cdcfe]">@{msg.sender_username}:</span>{' '}
                    <span>{msg.content.slice(0, 120)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={reviewInputText[msg.id] || ''}
                      onChange={(e) =>
                        setReviewInputText((prev) => ({ ...prev, [msg.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && reviewInputText[msg.id]?.trim() && onReply) {
                          onReply({
                            ...msg,
                            content: `// [Review Line ${String(idx + 1).padStart(3, '0')}]: ${reviewInputText[msg.id]}`,
                          });
                          setReviewInputText((prev) => ({ ...prev, [msg.id]: '' }));
                          setOpenReviewMessageId(null);
                        }
                      }}
                      placeholder="Add inline review comment... (Press Enter to post)"
                      className="flex-1 bg-[#1e1e1e] light-plus:bg-white text-xs px-2.5 py-1 rounded border border-[#3c3c3c] light-plus:border-[#e0e0e0] text-[#cccccc] light-plus:text-[#333333] outline-none focus:border-[#007acc]"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (reviewInputText[msg.id]?.trim() && onReply) {
                          onReply({
                            ...msg,
                            content: `// [Review Line ${String(idx + 1).padStart(3, '0')}]: ${reviewInputText[msg.id]}`,
                          });
                          setReviewInputText((prev) => ({ ...prev, [msg.id]: '' }));
                          setOpenReviewMessageId(null);
                        }
                      }}
                      className="px-2.5 py-1 bg-[#007acc] hover:bg-[#0062a3] text-white text-[11px] font-semibold rounded cursor-pointer"
                    >
                      Comment
                    </button>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* Live Ghost Draft Messages */}
        {visibleDrafts.map((draft) => (
          <div
            key={`ghost-draft-${draft.senderId}`}
            id={`ghost-draft-${draft.senderId}`}
            className="group relative flex items-start gap-1 py-1 px-1.5 rounded border-l-2 border-dashed border-[#007acc] bg-[rgba(255,255,255,0.02)] light-plus:bg-[rgba(0,0,0,0.02)] opacity-85 transition-all select-text font-mono"
          >
            {/* Gutter placeholder for draft */}
            <div className="w-12 select-none text-right pr-2 text-[11px] text-[#007acc] font-bold">
              ...
            </div>

            {/* Left Gutter: User's File Icon */}
            <div className="mt-0.5 flex-shrink-0 select-none mr-1.5">
              <FileIcon
                name={draft.senderFileIcon || 'ts'}
                size={15}
                status="Online"
              />
            </div>

            {/* Main Column */}
            <div className="flex-1 min-w-0">
              {/* Header: Username is typing... */}
              <div className="flex items-center gap-2 select-none mb-0.5 text-xs">
                <span className="font-bold text-[#9cdcfe]">
                  {draft.senderUsername}
                </span>
                <span className="text-[11px] text-[#858585] italic font-sans flex items-center gap-1">
                  is typing...
                  <span className="w-1.5 h-1.5 rounded-full bg-[#007acc] animate-pulse" />
                </span>
              </div>

              {/* Live Draft Body with Token Highlighting & Blinking Cursor */}
              <div className="text-[13px] leading-relaxed break-words italic">
                <HighlightedMessageBody
                  rawContent={prepareDraftContent(draft.text)}
                  messageLanguage={
                    draft.messageLanguage ||
                    getLanguageForFileIcon(draft.senderFileIcon)
                  }
                  theme={colorTheme}
                  highlightAllMessages={highlightAllMessages}
                  onAskBot={onAskBot}
                  isDraft={true}
                  isLightMode={isLightMode}
                />
              </div>
            </div>
          </div>
        ))}

        {/* Overflow typing count (for >3 typing users in #general) */}
        {overflowDraftCount > 0 && (
          <div className="flex items-center gap-2 pl-12 py-1 text-xs text-[#858585] italic select-none font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#007acc] animate-pulse" />
            <span>+{overflowDraftCount} more typing...</span>
          </div>
        )}

        {/* Multi-Cursor Live Typing Indicators */}
        {(nonDraftTypingUsers.length > 0 || isBotTyping) && (
          <div className="flex items-center gap-4 pl-12 py-2 select-none font-mono">
            {nonDraftTypingUsers.map((username, uIdx) => {
              const cursorColors = ['#007acc', '#89d185', '#cca700', '#f48771', '#dcdcaa'];
              const color = cursorColors[uIdx % cursorColors.length];
              return (
                <div key={username} className="flex items-center">
                  <span
                    className="w-0.5 h-4.5 animate-pulse inline-block"
                    style={{ backgroundColor: color }}
                  />
                  <span
                    className="ml-1 px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-semibold text-white shadow-sm flex items-center gap-1"
                    style={{ backgroundColor: color }}
                  >
                    | {username}
                  </span>
                </div>
              );
            })}
            {isBotTyping && (
              <div className="flex items-center gap-1.5 text-[#cca700] text-xs animate-pulse font-mono font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>devbot.ai generating code stream...</span>
              </div>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* VS Code Functional Canvas Minimap (Right side) */}
      <div
        aria-label="Minimap"
        className={`border-l border-[var(--border)] bg-[#1e1e1e]/20 hidden lg:flex flex-col select-none py-2 px-1 relative overflow-hidden transition-all duration-150 ${
          isMinimapExpanded ? 'w-24' : 'w-14'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsMinimapExpanded((prev) => !prev)}
          title="Toggle Minimap Width"
          className="text-[9px] text-[#858585] hover:text-white uppercase tracking-wider mb-2 text-center font-bold cursor-pointer flex items-center justify-center gap-1"
        >
          <span>MAP</span>
          <span className="text-[8px] opacity-70">{isMinimapExpanded ? '«' : '»'}</span>
        </button>

        <div className="flex-1 flex flex-col gap-[3px] overflow-hidden">
          {messages.slice(-50).map((m) => {
            const isMeMinimap = m.sender_id === currentUser?.id;
            const isBookmarkedMinimap = bookmarkedIds.has(m.id);
            const isBotMinimap = m.sender_is_bot;
            const hasCode = m.content.includes('```');

            return (
              <div
                key={`minimap-${m.id}`}
                onClick={() => {
                  const el = document.getElementById(`msg-${m.id}`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                title={`${m.sender_username}: ${m.content.slice(0, 30)}`}
                className="h-[3px] w-full rounded-sm cursor-pointer transition-all hover:scale-x-110 flex items-center"
              >
                <div
                  className={`h-full rounded-sm ${
                    isBookmarkedMinimap
                      ? 'w-full bg-[#e51400]'
                      : hasCode
                      ? 'w-full bg-[#4fc1ff]'
                      : isBotMinimap
                      ? 'w-4/5 bg-[#cca700]/70'
                      : isMeMinimap
                      ? 'w-3/4 bg-[#007acc]'
                      : 'w-1/2 bg-[#858585]/40'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
