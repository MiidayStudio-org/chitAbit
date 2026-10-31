import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, User, Channel } from '../../types';
import { CodeBlock } from './CodeBlock';
import {
  Smile,
  Reply,
  MoreHorizontal,
  Copy,
  Check,
  Edit2,
  Trash2,
  Bot,
  CornerDownLeft,
} from 'lucide-react';
import { getInitials, getRoleBadge, formatTime } from '../../utils/chatUtils';

interface MessageItemProps {
  message: Message;
  currentUser: User | null;
  activeChannel?: Channel | null;
  isGrouped?: boolean;
  onEdit: (messageId: string, currentContent: string) => void;
  onDelete: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onAskBot?: (query: string) => void;
  onReply?: (message: Message) => void;
}

const QUICK_EMOJIS = ['👍', '❤️', '🚀'];
const ALL_PICKER_EMOJIS = ['👍', '❤️', '🚀', '🔥', '🐛', '👀', '💯', '🎉', '⚡', '👏', '💡', '✅'];

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUser,
  activeChannel,
  isGrouped = false,
  onEdit,
  onDelete,
  onToggleReaction,
  onAskBot,
  onReply,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const isOwnMessage = currentUser?.id === message.sender_id;
  const isBot = Boolean(message.sender_is_bot || message.sender_id === 'devbot');
  const role = getRoleBadge(message, activeChannel);
  const initials = getInitials(message.sender_display_name, message.sender_username);
  const timeStr = formatTime(message.created_at);

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

  return (
    <div
      className={`group relative flex gap-3 px-3 rounded-lg transition-colors ${
        isGrouped ? 'py-1 hover:bg-zinc-900/40' : 'py-2 hover:bg-zinc-900/50 mt-1'
      }`}
    >
      {/* Avatar Column */}
      <div className="flex-shrink-0 w-9 pt-0.5">
        {!isGrouped ? (
          isBot ? (
            <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400 shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
          ) : (
            <div
              className="w-9 h-9 rounded-xl border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-200 font-mono text-xs font-semibold shadow-inner"
              style={{
                borderColor: message.sender_avatar_color ? `${message.sender_avatar_color}50` : undefined,
                color: message.sender_avatar_color || undefined,
              }}
            >
              {initials}
            </div>
          )
        ) : (
          /* Subtle timestamp on hover for compact grouped stream */
          <div className="flex items-center justify-end pr-1 h-full">
            <span className="text-[10px] text-zinc-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity select-none">
              {timeStr}
            </span>
          </div>
        )}
      </div>

      {/* Message Content Container */}
      <div className="flex-1 min-w-0">
        {/* Full Header (hidden if grouped) */}
        {!isGrouped && (
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {/* Sender display name */}
            <span className="font-semibold text-xs text-zinc-200 tracking-tight">
              {message.sender_display_name || message.sender_username}
            </span>

            {/* Handle in font-mono */}
            <span className="text-[11px] text-zinc-500 font-mono">
              @{message.sender_username}
            </span>

            {/* Role Badge: Core, Bot, or Member */}
            {role === 'Bot' ? (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold tracking-wider uppercase bg-indigo-950 text-indigo-400 border border-indigo-800/50">
                Bot
              </span>
            ) : role === 'Core' ? (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold tracking-wider uppercase bg-amber-950/70 text-amber-300 border border-amber-800/50">
                Core
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono text-zinc-400 bg-zinc-800/70 border border-zinc-700/50">
                Member
              </span>
            )}

            {/* Relative Timestamp */}
            <span className="text-[11px] text-zinc-500 font-mono">
              {timeStr}
            </span>

            {message.edited_at && (
              <span className="text-[10px] text-zinc-500 italic">
                (edited)
              </span>
            )}

            {message.isStreaming && (
              <span className="inline-flex items-center gap-1 text-[11px] text-indigo-400 font-mono animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                streaming...
              </span>
            )}
          </div>
        )}

        {/* Message Body with Markdown and Code Syntax Highlighting */}
        <div className="prose prose-invert max-w-none text-zinc-300 break-words text-sm leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
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
                    className="px-1.5 py-0.5 rounded font-mono text-xs bg-zinc-800/80 text-pink-400 border border-zinc-700/50"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              p({ children }) {
                return <p className="mb-1.5 last:mb-0 text-zinc-300">{children}</p>;
              },
              blockquote({ children }) {
                return (
                  <blockquote className="my-1.5 pl-3 border-l-2 border-indigo-500/60 text-zinc-400 text-xs italic bg-zinc-900/30 py-1 rounded-r">
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
                    className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 font-medium"
                  >
                    {children}
                  </a>
                );
              },
              table({ children }) {
                return (
                  <div className="my-2 overflow-x-auto">
                    <table className="border-collapse border border-zinc-800 text-xs w-full">
                      {children}
                    </table>
                  </div>
                );
              },
              th({ children }) {
                return (
                  <th className="border border-zinc-800 px-3 py-1.5 bg-zinc-900/80 text-left font-semibold text-zinc-300">
                    {children}
                  </th>
                );
              },
              td({ children }) {
                return (
                  <td className="border border-zinc-800 px-3 py-1.5 text-zinc-300">
                    {children}
                  </td>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Reactions Row */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {message.reactions.map((r) => {
              const hasReacted = currentUser && r.users.includes(currentUser.id);
              return (
                <button
                  key={r.emoji}
                  type="button"
                  onClick={() => onToggleReaction(message.id, r.emoji)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors border ${
                    hasReacted
                      ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 shadow-sm'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <span>{r.emoji}</span>
                  <span className="font-mono text-[11px] font-medium">{r.count}</span>
                </button>
              );
            })}

            {/* Quick reaction adder (+) button */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Add reaction"
              className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs bg-zinc-900/60 border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <Smile className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Hover Action Toolbar (Top-Right of message) */}
      <div className="absolute right-3 -top-3.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center bg-[#090b0d] border border-zinc-800 rounded-lg shadow-xl px-1 py-0.5 gap-0.5 z-20">
        {/* Quick Emojis (+, 👍, 🚀, ❤️) */}
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onToggleReaction(message.id, emoji)}
            title={`React ${emoji}`}
            className="p-1 hover:bg-zinc-800 rounded text-xs transition-transform hover:scale-115 text-zinc-400 hover:text-zinc-200"
          >
            {emoji}
          </button>
        ))}

        {/* Full Emoji Picker Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Pick reaction (+)"
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>

          {showEmojiPicker && (
            <div className="absolute right-0 bottom-full mb-1 grid grid-cols-6 gap-1 p-1.5 bg-[#090b0d] border border-zinc-800 rounded-xl shadow-2xl z-30 min-w-[180px]">
              {ALL_PICKER_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onToggleReaction(message.id, emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="p-1.5 hover:bg-zinc-800 rounded text-sm transition-transform hover:scale-125 flex items-center justify-center"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-[1px] h-3 bg-zinc-800 my-auto mx-0.5" />

        {/* Reply/Thread Button */}
        {onReply && (
          <button
            type="button"
            onClick={() => onReply(message)}
            title="Reply / Thread"
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Edit & Delete (if own message) */}
        {isOwnMessage && (
          <>
            <button
              type="button"
              onClick={() => onEdit(message.id, message.content)}
              title="Edit message"
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <Edit2 className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={() => onDelete(message.id)}
              title="Delete message"
              className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </>
        )}

        {/* More Options Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            title="More actions"
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {showMoreMenu && (
            <div className="absolute right-0 bottom-full mb-1 w-44 bg-[#090b0d] border border-zinc-800 rounded-xl shadow-2xl py-1 z-30 font-mono text-xs text-zinc-300 divide-y divide-zinc-800/60">
              <div className="py-0.5">
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="w-full px-3 py-1.5 text-left hover:bg-zinc-800 flex items-center justify-between text-zinc-300 hover:text-zinc-100"
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
                    className="w-full px-3 py-1.5 text-left hover:bg-zinc-800 flex items-center gap-2 text-zinc-300 hover:text-zinc-100"
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
                  className="w-full px-3 py-1.5 text-left hover:bg-zinc-800 flex items-center gap-2 text-zinc-400 hover:text-zinc-200 text-[11px]"
                >
                  Copy Message ID
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
