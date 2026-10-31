import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Message,
  User,
  OnlineUser,
  ActiveChat,
} from '../../types';
import { CodeBlock } from './CodeBlock';
import {
  Search,
  ArrowLeft,
  Smile,
  Reply,
  Edit2,
  Trash2,
  ArrowDown,
  Sparkles,
  Bot,
  Hash,
  Download,
  File,
  X,
  Users,
} from 'lucide-react';
import {
  getInitials,
  formatTime,
  getDateDividerLabel,
} from '../../utils/chatUtils';

export interface ChatRoomProps {
  activeChat: ActiveChat | null;
  messages: Message[];
  currentUser: User | null;
  typingUsers: string[];
  isBotTyping: boolean;
  onlineUsers?: OnlineUser[];
  onBackMobile?: () => void;
  onEdit: (messageId: string, currentContent: string) => void;
  onDelete: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onAskBot?: (query: string) => void;
  onReply?: (message: Message) => void;
  onLoadOlderMessages?: () => void;
  hasMoreOlderMessages?: boolean;
}

const QUICK_EMOJIS = ['👍', '❤️', '🚀', '😂', '🎉'];

export const ChatRoom: React.FC<ChatRoomProps> = ({
  activeChat,
  messages,
  currentUser,
  typingUsers,
  isBotTyping,
  onlineUsers = [],
  onBackMobile,
  onEdit,
  onDelete,
  onToggleReaction,
  onAskBot,
  onReply,
  onLoadOlderMessages,
  hasMoreOlderMessages = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollBottomRef = useRef<HTMLDivElement>(null);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showSearchInChat, setShowSearchInChat] = useState(false);
  const [searchInChatQuery, setSearchInChatQuery] = useState('');
  const [showMembersDrawer, setShowMembersDrawer] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [activeEmojiPickerMsgId, setActiveEmojiPickerMsgId] = useState<string | null>(null);

  const isGroup = activeChat?.type === 'channel';

  // Filter messages by in-chat search query
  const displayedMessages = useMemo(() => {
    if (!searchInChatQuery.trim()) return messages;
    const q = searchInChatQuery.toLowerCase().trim();
    return messages.filter((m) =>
      m.content.toLowerCase().includes(q) ||
      m.sender_username.toLowerCase().includes(q) ||
      (m.attachment_name && m.attachment_name.toLowerCase().includes(q))
    );
  }, [messages, searchInChatQuery]);

  // Handle auto-scroll on new messages
  useEffect(() => {
    if (isAtBottom) {
      scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isBotTyping, isAtBottom]);

  // Handle scroll events (detect top for infinite scroll, detect bottom for auto-scroll)
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    setIsAtBottom(atBottom);

    if (el.scrollTop === 0 && hasMoreOlderMessages && onLoadOlderMessages) {
      onLoadOlderMessages();
    }
  };

  const scrollToBottom = () => {
    scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsAtBottom(true);
  };

  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50 dark:bg-[#13161c] text-zinc-400 p-8 select-none transition-colors">
        <div className="w-16 h-16 rounded-3xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center mb-4">
          <Hash className="w-8 h-8 text-zinc-400" />
        </div>
        <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
          No conversation selected
        </h3>
        <p className="text-xs text-zinc-400 mt-1">
          Pick a chat from the sidebar or start a new conversation
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f5f7] dark:bg-[#11141a] overflow-hidden relative transition-colors">
      {/* 1. Chat Header */}
      <header className="h-16 px-4 sm:px-6 bg-white dark:bg-[#161920] border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between z-20 flex-shrink-0 shadow-sm transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back Button */}
          {onBackMobile && (
            <button
              type="button"
              id="chat-back-mobile-btn"
              onClick={onBackMobile}
              className="md:hidden p-2 -ml-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Active Chat Avatar */}
          <div className="relative flex-shrink-0">
            {activeChat.isBot ? (
              <div className="w-10 h-10 rounded-full bg-[#06C755] flex items-center justify-center text-white shadow-md shadow-[#06C755]/20">
                <Bot className="w-5 h-5" />
              </div>
            ) : activeChat.type === 'channel' ? (
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
                <Hash className="w-5 h-5" />
              </div>
            ) : activeChat.avatarUrl ? (
              <img
                src={activeChat.avatarUrl}
                alt={activeChat.displayName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm"
                style={{ backgroundColor: activeChat.avatarColor || '#06C755' }}
              >
                {getInitials(activeChat.displayName || activeChat.name)}
              </div>
            )}
            {activeChat.type === 'dm' && !activeChat.isBot && (
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-zinc-900 ${
                  activeChat.status === 'Online' ? 'bg-[#06C755]' : 'bg-zinc-400'
                }`}
              />
            )}
          </div>

          {/* Name & Subtitle */}
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 truncate">
              {activeChat.displayName || activeChat.name}
              {activeChat.isBot && <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
            </h2>
            <p className="text-xs text-zinc-400 truncate">
              {activeChat.isBot
                ? 'AI Assistant • Always Online'
                : activeChat.type === 'channel'
                ? `${onlineUsers.length} online • ${activeChat.description || 'Community'}`
                : activeChat.status || 'Offline'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Search in chat toggle */}
          <button
            type="button"
            id="btn-toggle-chat-search"
            onClick={() => {
              setShowSearchInChat(!showSearchInChat);
              if (showSearchInChat) setSearchInChatQuery('');
            }}
            title="Search in this chat"
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              showSearchInChat
                ? 'bg-[#06C755] text-white'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>

          {/* For #general: Member List drawer toggle */}
          {isGroup && (
            <button
              type="button"
              id="btn-toggle-members-drawer"
              onClick={() => setShowMembersDrawer(!showMembersDrawer)}
              title="Online Members"
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                showMembersDrawer
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Users className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* In-chat search bar (revealed when search button clicked) */}
      {showSearchInChat && (
        <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-850 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 z-10 animate-in slide-in-from-top-2 duration-150">
          <Search className="w-4 h-4 text-zinc-400 flex-shrink-0" />
          <input
            id="in-chat-search-input"
            type="text"
            value={searchInChatQuery}
            onChange={(e) => setSearchInChatQuery(e.target.value)}
            placeholder="Type to filter messages in this chat..."
            className="flex-1 bg-transparent border-0 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none py-1"
            autoFocus
          />
          {searchInChatQuery && (
            <span className="text-[10px] text-zinc-400 font-semibold">
              {displayedMessages.length} found
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setShowSearchInChat(false);
              setSearchInChatQuery('');
            }}
            className="p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Message Area */}
      <div className="flex-1 flex overflow-hidden relative">
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        >
          {/* Infinite scroll loader button/spinner */}
          {hasMoreOlderMessages && (
            <div className="text-center py-2">
              <button
                type="button"
                onClick={onLoadOlderMessages}
                className="px-3 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full text-[11px] font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer shadow-sm"
              >
                Load older messages
              </button>
            </div>
          )}

          {displayedMessages.length === 0 && (
            <div className="py-20 text-center select-none">
              <div className="w-12 h-12 rounded-2xl bg-zinc-200 dark:bg-zinc-800 text-zinc-400 mx-auto flex items-center justify-center mb-3">
                <Smile className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {searchInChatQuery ? 'No matching messages found' : 'No messages yet'}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                {searchInChatQuery
                  ? 'Try a different search term'
                  : 'Say hello and start the conversation!'}
              </p>
            </div>
          )}

          {/* Render Messages */}
          {displayedMessages.map((msg, idx) => {
            const isMe = msg.sender_id === currentUser?.id;
            const prevMsg = idx > 0 ? displayedMessages[idx - 1] : null;
            const showDateDivider =
              !prevMsg ||
              new Date(msg.created_at).toDateString() !==
                new Date(prevMsg.created_at).toDateString();

            const isHovered = hoveredMessageId === msg.id;
            const isPickerOpen = activeEmojiPickerMsgId === msg.id;

            return (
              <React.Fragment key={msg.id}>
                {/* Date Divider (LINE Style centered pill) */}
                {showDateDivider && (
                  <div className="flex items-center justify-center my-3 select-none">
                    <span className="px-3.5 py-1 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 shadow-xs">
                      {getDateDividerLabel(msg.created_at)}
                    </span>
                  </div>
                )}

                {/* Message Row */}
                <div
                  onMouseEnter={() => setHoveredMessageId(msg.id)}
                  onMouseLeave={() => {
                    setHoveredMessageId(null);
                    if (!isPickerOpen) setActiveEmojiPickerMsgId(null);
                  }}
                  className={`flex flex-col group relative ${
                    isMe ? 'items-end' : 'items-start'
                  }`}
                >
                  {/* Sender Name above incoming bubble */}
                  {!isMe && (
                    <div className="flex items-center gap-1.5 ml-11 mb-1 select-none">
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        {msg.sender_display_name || msg.sender_username}
                      </span>
                      {msg.sender_is_bot && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#06C755]/15 text-[#06C755]">
                          BOT
                        </span>
                      )}
                    </div>
                  )}

                  <div className={`flex items-end gap-2 max-w-[85%] sm:max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar for others */}
                    {!isMe && (
                      <div className="flex-shrink-0 select-none">
                        {msg.sender_is_bot ? (
                          <div className="w-8 h-8 rounded-full bg-[#06C755] flex items-center justify-center text-white shadow-sm">
                            <Bot className="w-4 h-4" />
                          </div>
                        ) : msg.sender_avatar_url ? (
                          <img
                            src={msg.sender_avatar_url}
                            alt={msg.sender_display_name || msg.sender_username}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                            style={{ backgroundColor: msg.sender_avatar_color || '#06C755' }}
                          >
                            {getInitials(msg.sender_display_name || msg.sender_username)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Chat Bubble Container */}
                    <div className="relative group/bubble">
                      {/* Quoted reply banner inside bubble */}
                      {msg.reply_to && (
                        <div
                          className={`mb-1 p-2 rounded-xl text-xs select-none ${
                            isMe
                              ? 'bg-black/15 text-white/90 border-l-2 border-white'
                              : 'bg-zinc-100 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300 border-l-2 border-[#06C755]'
                          }`}
                        >
                          <span className="font-semibold block text-[11px]">
                            @{msg.reply_to.sender_username}
                          </span>
                          <span className="truncate block italic text-[10px]">
                            {msg.reply_to.content}
                          </span>
                        </div>
                      )}

                      {/* Bubble itself */}
                      <div
                        className={`rounded-2xl px-4 py-2.5 shadow-sm text-sm break-words ${
                          isMe
                            ? 'bg-[#06C755] text-white rounded-tr-sm'
                            : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-sm border border-zinc-200/80 dark:border-zinc-700/60'
                        }`}
                      >
                        {/* Inline Attachment (Image or File) */}
                        {msg.attachment_url && (
                          <div className="mb-2">
                            {msg.attachment_type?.startsWith('image/') ? (
                              <a
                                href={msg.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="block overflow-hidden rounded-xl group/img"
                              >
                                <img
                                  src={msg.attachment_url}
                                  alt={msg.attachment_name || 'Attachment'}
                                  className="max-h-72 w-full object-cover rounded-xl transition-transform hover:scale-102"
                                />
                              </a>
                            ) : (
                              <a
                                href={msg.attachment_url}
                                download={msg.attachment_name || 'file'}
                                target="_blank"
                                rel="noreferrer"
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                  isMe
                                    ? 'bg-black/10 border-white/20 text-white hover:bg-black/20'
                                    : 'bg-zinc-50 dark:bg-zinc-750 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100'
                                }`}
                              >
                                <div className="p-2 rounded-lg bg-[#06C755]/20 text-[#06C755]">
                                  <File className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="block text-xs font-bold truncate">
                                    {msg.attachment_name || 'Attached File'}
                                  </span>
                                  {msg.attachment_size && (
                                    <span className="block text-[10px] opacity-75">
                                      {(msg.attachment_size / 1024).toFixed(1)} KB
                                    </span>
                                  )}
                                </div>
                                <Download className="w-4 h-4 opacity-75" />
                              </a>
                            )}
                          </div>
                        )}

                        {/* Markdown Message Body */}
                        {msg.content && (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code({ node: _node, inline, className, children, ...props }: any) {
                                const match = /language-(\w+)/.exec(className || '');
                                if (!inline && (match || String(children).includes('\n'))) {
                                  return (
                                    <CodeBlock
                                      language={match ? match[1] : ''}
                                      code={String(children).replace(/\n$/, '')}
                                      onAskBot={onAskBot}
                                    />
                                  );
                                }
                                return (
                                  <code
                                    className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                                      isMe
                                        ? 'bg-black/20 text-white'
                                        : 'bg-zinc-100 dark:bg-zinc-700 text-pink-600 dark:text-pink-400'
                                    }`}
                                    {...props}
                                  >
                                    {children}
                                  </code>
                                );
                              },
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        )}

                        {/* Streaming cursor for bot */}
                        {msg.isStreaming && (
                          <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse align-middle" />
                        )}
                      </div>

                      {/* Hover Action Toolbar */}
                      <div
                        className={`absolute top-0 -translate-y-1/2 flex items-center gap-0.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full px-1.5 py-0.5 shadow-md z-10 transition-opacity ${
                          isHovered || isPickerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        } ${isMe ? 'right-0' : 'left-0'}`}
                      >
                        {/* Quick reaction emojis */}
                        {QUICK_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => onToggleReaction(msg.id, emoji)}
                            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full text-xs transition-transform hover:scale-125 cursor-pointer"
                          >
                            {emoji}
                          </button>
                        ))}

                        {/* Reply */}
                        {onReply && (
                          <button
                            type="button"
                            onClick={() => onReply(msg)}
                            title="Reply"
                            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full cursor-pointer"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* If own message: Edit & Delete */}
                        {isMe && (
                          <>
                            <button
                              type="button"
                              onClick={() => onEdit(msg.id, msg.content)}
                              title="Edit"
                              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(msg.id)}
                              title="Delete"
                              className="p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-full cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Metadata Outside Flank (LINE Signature feature) */}
                    <div
                      className={`flex flex-col text-[10px] text-zinc-400 select-none pb-0.5 flex-shrink-0 ${
                        isMe ? 'items-end' : 'items-start'
                      }`}
                    >
                      {/* For sent message: show "Read" label if read_at is set or chatting with DevBot */}
                      {isMe && (msg.read_at || activeChat.isBot) && (
                        <span className="text-[#06C755] font-semibold leading-none mb-0.5">
                          Read
                        </span>
                      )}
                      <span className="leading-none">{formatTime(msg.created_at)}</span>
                    </div>
                  </div>

                  {/* Reaction Pills below bubble */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div
                      className={`flex flex-wrap gap-1 mt-1 ${
                        isMe ? 'mr-0' : 'ml-11'
                      }`}
                    >
                      {msg.reactions.map((r) => {
                        const hasReacted = currentUser && r.users.includes(currentUser.id);
                        return (
                          <button
                            key={r.emoji}
                            type="button"
                            onClick={() => onToggleReaction(msg.id, r.emoji)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                              hasReacted
                                ? 'bg-[#06C755]/15 text-[#06C755] border border-[#06C755]/30'
                                : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                            }`}
                          >
                            <span>{r.emoji}</span>
                            <span className="text-[10px]">{r.count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}

          {/* Typing indicator */}
          {(typingUsers.length > 0 || isBotTyping) && (
            <div className="flex items-center gap-2 ml-11 text-xs text-zinc-400 italic">
              <span className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#06C755] animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#06C755] animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#06C755] animate-bounce [animation-delay:0.4s]" />
              </span>
              <span>
                {isBotTyping
                  ? 'DevBot is typing...'
                  : `${typingUsers.join(', ')} is typing...`}
              </span>
            </div>
          )}

          <div ref={scrollBottomRef} />
        </div>

        {/* Scroll-to-bottom Floating Action Button */}
        {!isAtBottom && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 p-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-200 rounded-full shadow-lg hover:bg-zinc-100 cursor-pointer transition-transform hover:scale-110"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}

        {/* Group Members Drawer (for #general) */}
        {isGroup && showMembersDrawer && (
          <div className="w-64 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-850 flex flex-col p-4 z-10 animate-in slide-in-from-right-4 duration-200 select-none">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-500">
                Online Members ({onlineUsers.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowMembersDrawer(false)}
                className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3 flex-1 overflow-y-auto space-y-2">
              {onlineUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-2.5">
                  <div className="relative">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                      style={{ backgroundColor: u.avatarColor || '#06C755' }}
                    >
                      {getInitials(u.displayName || u.username)}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#06C755] ring-1 ring-white dark:ring-zinc-850" />
                  </div>
                  <div className="truncate">
                    <span className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                      {u.displayName || u.username}
                    </span>
                    <span className="block text-[10px] text-zinc-400 truncate">
                      @{u.username}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatRoom;
