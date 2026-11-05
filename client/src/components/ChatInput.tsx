import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  Plus,
  Camera,
  Smile,
  Code,
  Terminal,
  Sparkles,
  HelpCircle,
  Braces,
  Clock,
  CornerDownLeft,
  X,
  FileCode,
  Upload,
} from 'lucide-react';
import { Message } from '../types';

export interface ChatInputProps {
  onSendMessage: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
  targetName: string;
  isDM?: boolean;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
}

const COMMAND_HINTS = [
  { cmd: '/help', desc: 'Show all slash commands and shortcuts', icon: HelpCircle },
  { cmd: '/ask', desc: 'Ask DevBot a programming question', icon: Sparkles },
  { cmd: '/code', desc: 'Format and highlight code block (/code <lang>)', icon: Code },
  { cmd: '/json', desc: 'Validate & pretty-print JSON', icon: Braces },
  { cmd: '/time', desc: 'Show current UTC and local time', icon: Clock },
  { cmd: '/shrug', desc: 'Append shrug ¯\\_(ツ)_/¯', icon: Terminal },
  { cmd: '/clear', desc: 'Clear messages from local view', icon: Terminal },
];

const EMOJI_PALETTE = ['👍', '❤️', '🚀', '🔥', '🐛', '👀', '💯', '🎉', '⚡', '👏', '💡', '✅', '😂', '🤔', '🤝', '🙌'];

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onTyping,
  targetName,
  isDM: _isDM,
  replyingTo,
  onCancelReply,
}) => {
  const [text, setText] = useState('');
  const [showCommands, setShowCommands] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on change
  useEffect(() => {
    textareaRef.current?.focus();
  }, [targetName, replyingTo]);

  // Auto-resize textarea height up to 5 rows
  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 130)}px`;
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    adjustHeight();

    if (val.startsWith('/') && !val.includes('\n')) {
      setShowCommands(true);
    } else {
      setShowCommands(false);
    }

    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    } else if (e.key === 'Escape') {
      if (showCommands) setShowCommands(false);
      else if (showEmojiPicker) setShowEmojiPicker(false);
      else if (showAttachmentMenu) setShowAttachmentMenu(false);
      else if (replyingTo) onCancelReply?.();
    }
  };

  const submitMessage = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    let finalContent = trimmed;
    if (replyingTo) {
      const cleanSnippet = replyingTo.content.replace(/\r?\n/g, ' ').slice(0, 100);
      finalContent = `> **@${replyingTo.sender_username}:** ${cleanSnippet}\n\n${trimmed}`;
      onCancelReply?.();
    }

    onSendMessage(finalContent);
    setText('');
    setShowCommands(false);
    setShowEmojiPicker(false);
    setShowAttachmentMenu(false);
    onTyping(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const insertCommand = (cmd: string) => {
    if (cmd === '/code') {
      setText('/code typescript ');
    } else if (cmd === '/ask') {
      setText('/ask ');
    } else if (cmd === '/json') {
      setText('/json {"status": "ok"}');
    } else {
      setText(`${cmd} `);
    }
    setShowCommands(false);
    textareaRef.current?.focus();
    adjustHeight();
  };

  const insertCodeTemplate = (lang = 'typescript') => {
    const template = `\`\`\`${lang}\n// Code snippet\nconsole.log("ChatAbit");\n\`\`\``;
    setText((prev) => (prev ? `${prev}\n${template}` : template));
    setShowAttachmentMenu(false);
    textareaRef.current?.focus();
    adjustHeight();
  };

  const handleEmojiClick = (emoji: string) => {
    setText((prev) => `${prev}${emoji}`);
    textareaRef.current?.focus();
    adjustHeight();
  };

  const handleMicClick = () => {
    setActionNotice('🎙️ Audio note mode activated — speak into your microphone');
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const snippet = `📎 **Attached file:** \`${file.name}\` (${(file.size / 1024).toFixed(1)} KB)`;
    setText((prev) => (prev ? `${prev}\n${snippet}` : snippet));
    setShowAttachmentMenu(false);
    textareaRef.current?.focus();
    adjustHeight();
    e.target.value = '';
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const snippet = `🖼️ **Attached image:** \`${file.name}\` (${(file.size / 1024).toFixed(1)} KB)`;
    setText((prev) => (prev ? `${prev}\n${snippet}` : snippet));
    textareaRef.current?.focus();
    adjustHeight();
    e.target.value = '';
  };

  return (
    <div className="relative p-3 bg-[#131720] border-t border-zinc-800/80 select-none">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        type="file"
        accept="image/*"
        ref={imageInputRef}
        onChange={handleImageSelect}
        className="hidden"
      />

      <div className="max-w-4xl mx-auto relative">
        {/* Notice Toast */}
        {actionNotice && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-indigo-600 text-white font-mono text-xs px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-2 animate-bounce z-30">
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Slash Command Suggestions Palette */}
        {showCommands && (
          <div className="absolute bottom-full left-0 right-0 mb-3 bg-[#161a23] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-30 max-h-60 overflow-y-auto">
            <div className="px-3.5 py-2 bg-zinc-900/90 text-[11px] font-mono font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-800/80">
              Developer Slash Commands
            </div>
            <div className="divide-y divide-zinc-800/50">
              {COMMAND_HINTS.filter((c) => c.cmd.startsWith(text.trim().split(' ')[0])).map((c) => {
                const Icon = c.icon;
                return (
                  <button
                    key={c.cmd}
                    type="button"
                    onClick={() => insertCommand(c.cmd)}
                    className="w-full px-3.5 py-2.5 text-left flex items-center gap-3 hover:bg-zinc-800/60 transition-colors cursor-pointer"
                  >
                    <Icon className="w-4 h-4 text-indigo-400" />
                    <span className="font-mono text-xs font-semibold text-zinc-100">
                      {c.cmd}
                    </span>
                    <span className="text-xs text-zinc-400 truncate font-sans">
                      — {c.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Developer Attachments Popover (+) */}
        {showAttachmentMenu && (
          <div className="absolute bottom-full left-0 mb-3 bg-[#161a23] border border-zinc-800 rounded-2xl shadow-2xl p-2 z-30 w-56 font-mono text-xs text-zinc-300 space-y-1">
            <div className="px-2.5 py-1 text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
              Developer Attachments
            </div>

            {/* Send Code Snippet */}
            <button
              type="button"
              onClick={() => insertCodeTemplate('typescript')}
              className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 hover:bg-zinc-800 text-left transition-colors cursor-pointer"
            >
              <FileCode className="w-4 h-4 text-indigo-400" />
              <span>Send Code Snippet</span>
            </button>

            {/* Upload File */}
            <button
              type="button"
              onClick={() => {
                setShowAttachmentMenu(false);
                fileInputRef.current?.click();
              }}
              className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 hover:bg-zinc-800 text-left transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Upload File</span>
            </button>

            {/* Slash Commands */}
            <button
              type="button"
              onClick={() => {
                setShowAttachmentMenu(false);
                setShowCommands(true);
              }}
              className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 hover:bg-zinc-800 text-left transition-colors cursor-pointer"
            >
              <Terminal className="w-4 h-4 text-amber-400" />
              <span>Slash Commands</span>
            </button>
          </div>
        )}

        {/* Emoji Picker Popover */}
        {showEmojiPicker && (
          <div className="absolute bottom-full right-14 mb-3 bg-[#161a23] border border-zinc-800 rounded-2xl shadow-2xl p-2.5 z-30 grid grid-cols-8 gap-1.5 w-68">
            {EMOJI_PALETTE.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiClick(emoji)}
                className="p-1.5 hover:bg-zinc-800 rounded-xl text-base transition-transform hover:scale-125 flex items-center justify-center cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Thread Reply Banner */}
        {replyingTo && (
          <div className="flex items-center justify-between px-3.5 py-1.5 mb-2 bg-indigo-950/40 border border-indigo-900/50 rounded-xl text-xs text-zinc-300">
            <div className="flex items-center gap-2 truncate">
              <CornerDownLeft className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
              <span className="text-zinc-400">Replying to</span>
              <span className="font-mono font-semibold text-indigo-300">
                @{replyingTo.sender_username}
              </span>
              <span className="text-zinc-500 truncate max-w-sm hidden sm:inline">
                "{replyingTo.content.replace(/\r?\n/g, ' ').slice(0, 75)}"
              </span>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              title="Cancel reply (Esc)"
              className="text-zinc-500 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800/60 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* LINE-Style Bottom Docked Bar */}
        <div className="flex items-center gap-2">
          {/* 1. Plus Icon (+) to open developer attachments */}
          <button
            type="button"
            onClick={() => {
              setShowAttachmentMenu(!showAttachmentMenu);
              setShowEmojiPicker(false);
              setShowCommands(false);
            }}
            title="Developer attachments: Code, File, Slash commands"
            className={`p-2 rounded-full transition-colors flex-shrink-0 cursor-pointer ${
              showAttachmentMenu
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70'
            }`}
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* 2. Camera / Image Icon */}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            title="Attach image / photo"
            className="p-2 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70 transition-colors flex-shrink-0 cursor-pointer"
          >
            <Camera className="w-5 h-5" />
          </button>

          {/* 3. Capsule Input Field (with Emoji inside right flank) */}
          <div className="flex-1 min-w-0 flex items-center bg-[#1c2230] border border-zinc-700/60 focus-within:border-indigo-500 rounded-full px-4 py-1.5 transition-all shadow-inner">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Shift+Enter for newline)"
              rows={1}
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none font-sans leading-relaxed max-h-32 py-1 overflow-y-auto no-scrollbar"
            />

            {/* 4. Emoji icon (Smile) */}
            <button
              type="button"
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker);
                setShowAttachmentMenu(false);
              }}
              title="Insert emoji"
              className={`p-1.5 rounded-full transition-colors flex-shrink-0 cursor-pointer ml-1 ${
                showEmojiPicker
                  ? 'text-indigo-400'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              <Smile className="w-4 h-4" />
            </button>
          </div>

          {/* 5. Indigo Send button (or Mic when empty) */}
          {text.trim() ? (
            <button
              type="button"
              onClick={submitMessage}
              title="Send message"
              className="p-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950/60 transition-transform active:scale-95 flex-shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleMicClick}
              title="Voice message / Audio note"
              className="p-2.5 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors flex-shrink-0 cursor-pointer"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
