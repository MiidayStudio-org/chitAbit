import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Message,
  User,
  Channel,
  OnlineUser,
} from '../types';
import { CodeBlock } from './chat/CodeBlock';
import {
  Smile,
  Reply,
  MoreHorizontal,
  Copy,
  Check,
  Bot,
  Edit2,
  Trash2,
  ArrowDown,
  Sparkles,
  Terminal,
  Bug,
  CornerDownLeft,
} from 'lucide-react';
import {
  getInitials,
  getRoleBadge,
  formatTime,
  getDateDividerLabel,
} from '../utils/chatUtils';

export interface ChatAreaProps {
  messages: Message[];
  currentUser: User | null;
  activeChannel: Channel | null;
  activeDMUser: User | null;
  typingUsers: string[];
  isBotTyping: boolean;
  onlineUsers?: OnlineUser[];
  onEdit: (messageId: string, currentContent: string) => void;
  onDelete: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onAskBot?: (query: string) => void;
  onReply?: (message: Message) => void;
  onSendIcebreaker?: (text: string) => void;
}

const QUICK_EMOJIS = ['👍', '❤️', '🚀', '🔥'];
const ALL_PICKER_EMOJIS = ['👍', '❤️', '🚀', '🔥', '🐛', '👀', '💯', '🎉', '⚡', '👏', '💡', '✅'];

const HUMAN_ICEBREAKERS = [
  'Hey! Working on any projects?',
  'Take a look at this bug',
  'Can you review my PR?',
  'What tech stack are you building with?',
  'Got a quick minute to sync?',
];

const BOT_ICEBREAKERS = [
  'Can you help me debug a TypeScript error?',
  'Explain how WebSockets work',
  'Write a unit test for my React hook',
  'Take a look at this bug',
];

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  currentUser,
  activeChannel,
  activeDMUser,
  typingUsers,
  isBotTyping,
  onEdit,
  onDelete,
  onToggleReaction,
  onAskBot,
  onReply,
  onSendIcebreaker,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollBottomRef = useRef<HTMLDivElement>(null);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessagesScrolledUp, setHasNewMessagesScrolledUp] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);

  const prevMessagesCountRef = useRef(messages.length);

  // Scroll listener
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 80;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    setIsAtBottom(atBottom);
    if (atBottom) {
      setHasNewMessagesScrolledUp(false);
      setNewMessagesCount(0);
    }
  };

  // Auto-scroll when new messages arrive
  useEffect(() => {
    const isNewMessage = messages.length > prevMessagesCountRef.current;
    prevMessagesCountRef.current = messages.length;

    if (isAtBottom) {
      scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (isNewMessage) {
      setHasNewMessagesScrolledUp(true);
      setNewMessagesCount((prev) => prev + 1);
    }
  }, [messages.length, isAtBottom]);

  // Keep streaming bot messages in view
  const lastMsgContent = messages[messages.length - 1]?.content;
  useEffect(() => {
    if (isAtBottom && isBotTyping) {
      scrollBottomRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [lastMsgContent, isBotTyping, isAtBottom]);

  const handleScrollToBottom = () => {
    scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setHasNewMessagesScrolledUp(false);
    setNewMessagesCount(0);
    setIsAtBottom(true);
  };

  const isDM = Boolean(activeDMUser);
  const icebreakers = activeDMUser?.id === 'devbot' ? BOT_ICEBREAKERS : HUMAN_ICEBREAKERS;

  return (
    <div className="flex-1 flex flex-col min-h-0 relative bg-[#131720]">
      {/* Scrollable Chat Feed Canvas */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-[#131720] text-zinc-300 select-text"
      >
        {/* Welcome / Icebreaker Banner for DMs */}
        {isDM && (
          <div className="px-5 py-6 mb-4 rounded-3xl bg-[#161b26]/70 border border-zinc-800/80 text-zinc-300 max-w-2xl mx-auto text-center shadow-lg">
            <div
              className="w-14 h-14 rounded-full border-2 border-zinc-700 bg-zinc-900 mx-auto flex items-center justify-center text-zinc-100 font-mono text-xl font-bold shadow-lg mb-3"
              style={{
                borderColor: activeDMUser?.avatarColor ? `${activeDMUser.avatarColor}60` : undefined,
                color: activeDMUser?.avatarColor || undefined,
              }}
            >
              {activeDMUser?.id === 'devbot' ? (
                <Bot className="w-7 h-7 text-indigo-400" />
              ) : (
                getInitials(activeDMUser?.displayName, activeDMUser?.username)
              )}
            </div>

            <h3 className="text-base font-bold text-zinc-100 font-sans tracking-tight">
              {activeDMUser?.displayName || activeDMUser?.username}
            </h3>
            <p className="text-xs font-mono text-zinc-400 mt-0.5">
              @{activeDMUser?.username}
            </p>
            <p className="text-xs text-zinc-400 mt-2 max-w-md mx-auto">
              This is the start of your direct message history with{' '}
              <span className="font-mono text-zinc-200 font-semibold">@{activeDMUser?.username}</span>.
              Messages are real-time and end-to-end synchronized.
            </p>

            {/* Icebreaker chips */}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {icebreakers.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => onSendIcebreaker?.(chip)}
                  className="px-3 py-1.5 rounded-full bg-[#1c2230] border border-zinc-800 hover:border-indigo-500/60 hover:bg-zinc-800 text-zinc-300 hover:text-indigo-200 text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>{chip}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State when channel has 0 messages */}
        {!isDM && messages.length === 0 && (
          <div className="py-16 text-center text-zinc-500 text-xs font-mono max-w-md mx-auto">
            <Terminal className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-zinc-300">
              Welcome to #{activeChannel?.name}
            </p>
            <p className="mt-1 text-zinc-500">
              {activeChannel?.description || 'No messages yet. Send a message to start the thread!'}
            </p>
          </div>
        )}

        {/* LINE-Style Chat Bubbles & Date Separators */}
        {messages.map((message, index) => {
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const currDateLabel = getDateDividerLabel(message.created_at);
          const prevDateLabel = prevMessage ? getDateDividerLabel(prevMessage.created_at) : null;
          const showDateDivider = currDateLabel !== prevDateLabel;

          const isSentByMe = currentUser && message.sender_id === currentUser.id;

          return (
            <React.Fragment key={message.id}>
              {/* Centered Date Badges: rounded-full bg-black/25 px-3 py-1 text-[11px] text-zinc-400 */}
              {showDateDivider && (
                <div className="flex justify-center my-4 select-none">
                  <span className="rounded-full bg-black/25 px-3 py-1 text-[11px] text-zinc-400 font-mono shadow-sm backdrop-blur-sm border border-zinc-800/40">
                    {currDateLabel}
                  </span>
                </div>
              )}

              {/* Chat Bubble Row with Outside Metadata */}
              <ChatBubbleRow
                message={message}
                isSentByMe={Boolean(isSentByMe)}
                currentUser={currentUser}
                activeChannel={activeChannel}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleReaction={onToggleReaction}
                onAskBot={onAskBot}
                onReply={onReply}
              />
            </React.Fragment>
          );
        })}

        <div ref={scrollBottomRef} />
      </div>

      {/* Floating "↓ New messages" Badge */}
      {hasNewMessagesScrolledUp && (
        <button
          type="button"
          onClick={handleScrollToBottom}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-medium shadow-xl shadow-indigo-950/60 border border-indigo-400/30 transition-all hover:scale-105 active:scale-95 animate-bounce cursor-pointer"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>New messages{newMessagesCount > 1 ? ` (${newMessagesCount})` : ''}</span>
        </button>
      )}

      {/* Live Typing Indicator Bar Right Above Composer */}
      <div
        className={`px-4 py-1 border-t border-zinc-800/40 bg-[#131720]/95 backdrop-blur-sm transition-all duration-150 flex items-center min-h-[26px] ${
          typingUsers.length > 0 || isBotTyping ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {isBotTyping ? (
          <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs">
            <Bot className="w-3.5 h-3.5 animate-pulse" />
            <span className="font-medium">DevBot is typing...</span>
            <span className="inline-flex items-center gap-1 ml-0.5">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
            </span>
          </div>
        ) : typingUsers.length > 0 ? (
          <div className="flex items-center gap-2 text-zinc-400 font-mono text-xs">
            <span className="text-zinc-300 font-medium">
              {typingUsers.length === 1
                ? `${typingUsers[0]} is typing...`
                : typingUsers.length === 2
                ? `${typingUsers[0]} and ${typingUsers[1]} are typing...`
                : `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`}
            </span>
            <span className="inline-flex items-center gap-1 ml-0.5">
              <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Individual Chat Bubble Row (LINE-Style with Outside Metadata)
// -------------------------------------------------------------

interface ChatBubbleRowProps {
  message: Message;
  isSentByMe: boolean;
  currentUser: User | null;
  activeChannel: Channel | null;
  onEdit: (messageId: string, currentContent: string) => void;
  onDelete: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onAskBot?: (query: string) => void;
  onReply?: (message: Message) => void;
}

const ChatBubbleRow: React.FC<ChatBubbleRowProps> = ({
  message,
  isSentByMe,
  currentUser,
  activeChannel,
  onEdit,
  onDelete,
  onToggleReaction,
  onAskBot,
  onReply,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const isBot = Boolean(message.sender_is_bot || message.sender_id === 'devbot');
  const role = getRoleBadge(message, activeChannel);
  const initials = getInitials(message.sender_display_name, message.sender_username);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopiedText(true);
    setTimeout(() => {
      setCopiedText(false);
      setShowMoreMenu(false);
    }, 1500);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(message.id);
    setShowMoreMenu(false);
  };

  // Hover Action Toolbar Component
  const renderActionToolbar = () => (
    <div
      className="absolute -top-3.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center bg-[#14171f] border border-zinc-700/80 rounded-xl shadow-2xl px-1 py-0.5 gap-0.5 z-20 right-2"
    >
      {/* Quick Emojis */}
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onToggleReaction(message.id, emoji)}
          title={`React ${emoji}`}
          className="p-1 hover:bg-zinc-800 rounded text-xs transition-transform hover:scale-115 text-zinc-400 hover:text-zinc-200 cursor-pointer"
        >
          {emoji}
        </button>
      ))}

      {/* Full Emoji Picker */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          title="Add reaction"
          className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <Smile className="w-3.5 h-3.5" />
        </button>

        {showEmojiPicker && (
          <div className="absolute right-0 bottom-full mb-1 grid grid-cols-6 gap-1 p-1.5 bg-[#14171f] border border-zinc-800 rounded-2xl shadow-2xl z-30 min-w-[180px]">
            {ALL_PICKER_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onToggleReaction(message.id, emoji);
                  setShowEmojiPicker(false);
                }}
                className="p-1.5 hover:bg-zinc-800 rounded text-sm transition-transform hover:scale-125 flex items-center justify-center cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-[1px] h-3 bg-zinc-800 my-auto mx-0.5" />

      {/* Reply Button */}
      {onReply && (
        <button
          type="button"
          onClick={() => onReply(message)}
          title="Reply"
          className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <Reply className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Edit & Delete for current user */}
      {isSentByMe && (
        <>
          <button
            type="button"
            onClick={() => onEdit(message.id, message.content)}
            title="Edit message"
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Edit2 className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(message.id)}
            title="Delete message"
            className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </>
      )}

      {/* More Menu */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          title="More actions"
          className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>

        {showMoreMenu && (
          <div className="absolute right-0 bottom-full mb-1 w-44 bg-[#14171f] border border-zinc-800 rounded-2xl shadow-2xl py-1 z-30 font-mono text-xs text-zinc-300 divide-y divide-zinc-800/60">
            <div className="py-0.5">
              <button
                type="button"
                onClick={handleCopyMessage}
                className="w-full px-3 py-1.5 text-left hover:bg-zinc-800 flex items-center justify-between text-zinc-300 hover:text-zinc-100 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Copy className="w-3 h-3 text-zinc-500" />
                  Copy Text
                </span>
                {copiedText && <Check className="w-3 h-3 text-emerald-400" />}
              </button>

              {onReply && (
                <button
                  type="button"
                  onClick={() => {
                    onReply(message);
                    setShowMoreMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-zinc-800 flex items-center gap-2 text-zinc-300 hover:text-zinc-100 cursor-pointer"
                >
                  <CornerDownLeft className="w-3 h-3 text-indigo-400" />
                  Quote in Reply
                </button>
              )}
            </div>

            <div className="py-0.5">
              <button
                type="button"
                onClick={handleCopyId}
                className="w-full px-3 py-1.5 text-left hover:bg-zinc-800 flex items-center gap-2 text-zinc-400 hover:text-zinc-200 text-[11px] cursor-pointer"
              >
                Copy Message ID
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Markdown renderer configuration
  const renderMarkdownContent = () => (
    <div className="prose prose-invert max-w-none text-sm leading-relaxed break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node: _node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            if (!inline && (match || codeString.includes('\n'))) {
              return (
                <CodeBlock
                  language={match ? match[1] : undefined}
                  code={codeString}
                  onAskBot={onAskBot}
                />
              );
            }
            return (
              <code
                className="px-1.5 py-0.5 rounded font-mono text-xs bg-black/30 text-pink-300 border border-white/10"
                {...props}
              >
                {children}
              </code>
            );
          },
          p({ children }) {
            return <p className="mb-1 last:mb-0">{children}</p>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="my-1.5 pl-3 border-l-2 border-white/40 text-zinc-300 text-xs italic bg-black/20 py-1 rounded-r">
                {children}
              </blockquote>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2 font-medium"
              >
                {children}
              </a>
            );
          },
          table({ children }) {
            return (
              <div className="my-2 overflow-x-auto">
                <table className="border-collapse border border-zinc-700/60 text-xs w-full">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="border border-zinc-700/60 px-3 py-1 bg-black/30 text-left font-semibold text-zinc-300">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border border-zinc-700/60 px-3 py-1 text-zinc-300">
                {children}
              </td>
            );
          },
        }}
      >
        {message.content}
      </ReactMarkdown>
    </div>
  );

  // 1. Outgoing Messages (Current User): Aligned Right with Electric Indigo bubble
  // LINE Signature Feature: Read status & timestamp are OUTSIDE the bubble on bottom-left flank
  if (isSentByMe) {
    return (
      <div className="flex items-end justify-end my-1 px-2 gap-2">
        {/* Outside Metadata: Bottom-Left flank */}
        <div className="flex flex-col items-end text-[10px] font-mono text-zinc-500 select-none pb-0.5 flex-shrink-0">
          <span className="text-indigo-400 font-medium text-[9px] leading-tight">Read</span>
          <span className="text-[10px] text-zinc-500 leading-tight">{formatTime(message.created_at)}</span>
        </div>

        {/* Outgoing Message Bubble */}
        <div className="relative group max-w-[80%] sm:max-w-[70%]">
          {renderActionToolbar()}

          <div className="bg-indigo-600 text-white shadow-sm rounded-2xl rounded-tr-sm px-4 py-2.5 transition-colors">
            {/* Content */}
            {renderMarkdownContent()}

            {/* Reactions attached to bubble */}
            {message.reactions && message.reactions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-1 border-t border-indigo-400/30">
                {message.reactions.map((r) => {
                  const hasReacted = currentUser && r.users.includes(currentUser.id);
                  return (
                    <button
                      key={r.emoji}
                      type="button"
                      onClick={() => onToggleReaction(message.id, r.emoji)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors border cursor-pointer ${
                        hasReacted
                          ? 'bg-white/20 border-white/50 text-white shadow-sm'
                          : 'bg-black/20 border-white/10 text-zinc-200 hover:bg-black/30'
                      }`}
                    >
                      <span>{r.emoji}</span>
                      <span className="font-mono text-[11px] font-medium">{r.count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. Incoming Messages (Peers / Bot): Aligned Left with Crisp dark surface #212631
  // LINE Signature Feature: Timestamp is OUTSIDE the bubble on bottom-right flank
  return (
    <div className="flex items-end justify-start my-1 px-2 gap-2">
      {/* Circular Avatar on Left */}
      <div className="flex-shrink-0 mb-0.5">
        {isBot ? (
          <div className="w-8 h-8 rounded-full bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400 shadow-sm">
            <Bot className="w-4 h-4" />
          </div>
        ) : (
          <div
            className="w-8 h-8 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center text-zinc-200 font-mono text-xs font-bold shadow-inner"
            style={{
              borderColor: message.sender_avatar_color ? `${message.sender_avatar_color}60` : undefined,
              color: message.sender_avatar_color || undefined,
            }}
          >
            {initials}
          </div>
        )}
      </div>

      {/* Incoming Message Bubble */}
      <div className="relative group max-w-[80%] sm:max-w-[70%]">
        {renderActionToolbar()}

        <div className="bg-[#212631] text-[#e4e4e7] border border-zinc-700/50 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm transition-colors hover:border-zinc-600">
          {/* Sender Header */}
          {isBot ? (
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-xs text-indigo-300 font-sans">DevBot</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold tracking-wider uppercase bg-indigo-950 text-indigo-400 border border-indigo-800/50">
                AI Assistant
              </span>
            </div>
          ) : activeChannel ? (
            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-semibold text-xs text-indigo-400 font-sans">
                @{message.sender_username}
              </span>
              {role === 'Core' && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-950/70 text-amber-300 border border-amber-800/50 uppercase">
                  Core
                </span>
              )}
            </div>
          ) : null}

          {/* Content */}
          {renderMarkdownContent()}

          {/* DevBot Quick Action Pills */}
          {isBot && onAskBot && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-700/40">
              <button
                type="button"
                onClick={() => onAskBot('Can you explain this code in simple terms?')}
                className="px-2.5 py-1 rounded-xl bg-indigo-950/60 border border-indigo-800/50 hover:bg-indigo-900 text-indigo-300 hover:text-white text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Explain Code</span>
              </button>
              <button
                type="button"
                onClick={() => onAskBot('Find potential bugs or edge cases in this code snippet')}
                className="px-2.5 py-1 rounded-xl bg-amber-950/60 border border-amber-800/50 hover:bg-amber-900 text-amber-300 hover:text-white text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Bug className="w-3 h-3 text-amber-400" />
                <span>Find Bug</span>
              </button>
            </div>
          )}

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {message.reactions.map((r) => {
                const hasReacted = currentUser && r.users.includes(currentUser.id);
                return (
                  <button
                    key={r.emoji}
                    type="button"
                    onClick={() => onToggleReaction(message.id, r.emoji)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors border cursor-pointer ${
                      hasReacted
                        ? 'bg-indigo-500/25 border-indigo-400/50 text-indigo-200 shadow-sm'
                        : 'bg-[#181d26] border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <span>{r.emoji}</span>
                    <span className="font-mono text-[11px] font-medium">{r.count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Outside Metadata: Bottom-Right flank */}
      <div className="text-[10px] font-mono text-zinc-500 select-none pb-0.5 flex-shrink-0">
        {formatTime(message.created_at)}
      </div>
    </div>
  );
};

export default ChatArea;
