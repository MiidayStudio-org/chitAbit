import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Message, User, ActiveChat, LiveDraft } from '../../types';
import { FileIcon, getLanguageForFileIcon } from '../../utils/fileIcons';
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
  onEdit: (messageId: string, currentContent: string) => void;
  onDelete: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onAskBot?: (query: string) => void;
  onReply?: (message: Message) => void;
  onLoadOlderMessages?: () => void;
  hasMoreOlderMessages?: boolean;
}

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
  onEdit,
  onDelete,
  onToggleReaction,
  onAskBot,
  onReply,
  onLoadOlderMessages,
  hasMoreOlderMessages = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

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
      onLoadOlderMessages();
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
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-3 space-y-2 font-mono text-[13px] bg-[var(--bg)] text-[var(--text)] select-text transition-colors"
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

      {/* Render Message Lines (VS Code Comment/Thread format) */}
      {messages.map((msg, idx) => {
        const isMe = msg.sender_id === currentUser?.id;
        const prevMsg = idx > 0 ? messages[idx - 1] : null;
        const showDateDivider =
          !prevMsg ||
          new Date(msg.created_at).toDateString() !==
            new Date(prevMsg.created_at).toDateString();

        const isHovered = hoveredMessageId === msg.id;

        return (
          <React.Fragment key={msg.id}>
            {/* Date Divider (Styled as a VS Code region fold/divider) */}
            {showDateDivider && (
              <div className="flex items-center gap-3 my-4 select-none opacity-60">
                <div className="h-[1px] flex-1 bg-[#3c3c3c] light-plus:bg-[#e7e7e7]" />
                <span className="text-[11px] text-[#858585] uppercase tracking-wider font-semibold">
                  // --- {getDateDividerLabel(msg.created_at)} ---
                </span>
                <div className="h-[1px] flex-1 bg-[#3c3c3c] light-plus:bg-[#e7e7e7]" />
              </div>
            )}

            {/* Message Row */}
            <div
              id={`msg-${msg.id}`}
              onMouseEnter={() => setHoveredMessageId(msg.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
              className={`group relative flex items-start gap-3 p-2 rounded transition-colors ${
                isMe
                  ? 'bg-[rgba(255,255,255,0.02)] light-plus:bg-[rgba(0,0,0,0.02)] border-l-2 border-[var(--accent)]'
                  : 'hover:bg-[rgba(255,255,255,0.015)] border-l-2 border-transparent'
              }`}
            >
              {/* Left Gutter: User's File Icon */}
              <div className="mt-0.5 flex-shrink-0 select-none">
                <FileIcon
                  name={msg.sender_file_icon || 'ts'}
                  isBot={msg.sender_is_bot}
                  size={16}
                />
              </div>

              {/* Main Column */}
              <div className="flex-1 min-w-0">
                {/* Header: Username + Timestamp + Read Receipt */}
                <div className="flex items-center gap-2 select-none mb-1 text-xs">
                  <span
                    className={`font-bold ${
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

                  {/* Read Receipt label */}
                  {isMe && msg.read_at && (
                    <span className="text-[10px] text-[#89d185] flex items-center gap-0.5 font-semibold">
                      <Check className="w-2.5 h-2.5" />
                      Read
                    </span>
                  )}
                </div>

                {/* Quoted Reply Snippet */}
                {msg.reply_to && (
                  <div className="mb-2 pl-2 border-l-2 border-[#007acc] text-[11px] text-[#858585] italic select-none">
                    <span className="font-semibold text-[#9cdcfe]">
                      @{msg.reply_to.sender_username}:
                    </span>{' '}
                    <span>{msg.reply_to.content.slice(0, 80)}</span>
                  </div>
                )}

                {/* Inline Attachment (Image or File) */}
                {msg.attachment_url && (
                  <div className="mb-2">
                    {msg.attachment_type?.startsWith('image/') ? (
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

                {/* Message Body with Token Highlighting and Shiki CodeBlocks */}
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
          </React.Fragment>
        );
      })}

      {/* Live Ghost Draft Messages */}
      {visibleDrafts.map((draft) => (
        <div
          key={`ghost-draft-${draft.senderId}`}
          id={`ghost-draft-${draft.senderId}`}
          className="group relative flex items-start gap-3 p-2 rounded border-l-2 border-dashed border-[#007acc] bg-[rgba(255,255,255,0.02)] light-plus:bg-[rgba(0,0,0,0.02)] opacity-85 transition-all select-text font-mono"
        >
          {/* Left Gutter: User's File Icon */}
          <div className="mt-0.5 flex-shrink-0 select-none">
            <FileIcon
              name={draft.senderFileIcon || 'ts'}
              size={16}
              status="Online"
            />
          </div>

          {/* Main Column */}
          <div className="flex-1 min-w-0">
            {/* Header: Username is typing... */}
            <div className="flex items-center gap-2 select-none mb-1 text-xs">
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
        <div className="flex items-center gap-2 pl-7 py-1 text-xs text-[#858585] italic select-none font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-[#007acc] animate-pulse" />
          <span>+{overflowDraftCount} more typing...</span>
        </div>
      )}

      {/* Typing indicator (for non-draft typers or bot) */}
      {(nonDraftTypingUsers.length > 0 || isBotTyping) && (
        <div className="flex items-center gap-2 pl-7 py-1 text-xs text-[#858585] italic select-none font-mono">
          <span className="w-2 h-2 rounded-full bg-[#007acc] animate-pulse" />
          <span>
            {isBotTyping
              ? 'devbot.ai is generating code reply...'
              : `${nonDraftTypingUsers.join(', ')} is typing...`}
          </span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
