import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Plus,
  Smile,
  Code,
  Sparkles,
  HelpCircle,
  Braces,
  Clock,
  X,
  Upload,
  Image,
  Loader2,
  File,
} from 'lucide-react';
import { Message } from '../../types';

export interface MessageComposerProps {
  onSendMessage: (
    content: string,
    attachment?: { url: string; type: string; name: string; size: number }
  ) => void;
  onTyping: (isTyping: boolean) => void;
  targetName: string;
  targetHandle?: string;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
}

const COMMAND_HINTS = [
  { cmd: '/help', desc: 'Show all slash commands and shortcuts', icon: HelpCircle },
  { cmd: '/ask', desc: 'Ask DevBot a programming question', icon: Sparkles },
  { cmd: '/code', desc: 'Format and highlight code block (/code <lang>)', icon: Code },
  { cmd: '/json', desc: 'Validate & pretty-print JSON', icon: Braces },
  { cmd: '/time', desc: 'Show current UTC and local time', icon: Clock },
];

const EMOJIS = ['😀', '😂', '😎', '🤔', '🥳', '🙌', '👀', '💡', '✅', '❌', '🔥', '🚀', '💯', '🙏', '❤️', '👍', '🐛', '⚡', '🎉', '💻'];

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  onTyping,
  targetName: _targetName,
  targetHandle: _targetHandle,
  replyingTo,
  onCancelReply,
}) => {
  const [text, setText] = useState('');
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{
    url: string;
    type: string;
    name: string;
    size: number;
    isUploading: boolean;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [replyingTo]);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
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
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    } else if (e.key === 'Escape') {
      if (showCommands) setShowCommands(false);
      else if (showEmojiPicker) setShowEmojiPicker(false);
      else if (showPlusMenu) setShowPlusMenu(false);
      else if (replyingTo) onCancelReply?.();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File exceeds 5MB size limit');
      e.target.value = '';
      return;
    }

    setUploadError(null);
    setShowPlusMenu(false);
    setPendingAttachment({
      url: '',
      type: file.type,
      name: file.name,
      size: file.size,
      isUploading: true,
    });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || 'Upload failed');
        setPendingAttachment(null);
      } else {
        setPendingAttachment({
          url: data.url,
          type: data.mimetype,
          name: data.filename,
          size: data.size,
          isUploading: false,
        });
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Network error during upload');
      setPendingAttachment(null);
    } finally {
      e.target.value = '';
    }
  };

  const submitMessage = () => {
    const trimmed = text.trim();
    if (!trimmed && !pendingAttachment) return;

    let finalContent = trimmed;

    // Attach reply quote prefix if replying
    if (replyingTo) {
      const quote = `> @${replyingTo.sender_username}: ${replyingTo.content.slice(0, 80).replace(/\n/g, ' ')}\n\n`;
      finalContent = quote + finalContent;
    }

    const attachmentPayload = pendingAttachment && !pendingAttachment.isUploading
      ? {
          url: pendingAttachment.url,
          type: pendingAttachment.type,
          name: pendingAttachment.name,
          size: pendingAttachment.size,
        }
      : undefined;

    onSendMessage(finalContent, attachmentPayload);

    setText('');
    setPendingAttachment(null);
    setShowCommands(false);
    setShowEmojiPicker(false);
    setShowPlusMenu(false);
    if (replyingTo) onCancelReply?.();

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const insertCommand = (cmd: string) => {
    if (cmd === '/code') setText('/code typescript ');
    else if (cmd === '/ask') setText('/ask ');
    else if (cmd === '/json') setText('/json {"key": "value"}');
    else setText(`${cmd} `);

    setShowCommands(false);
    textareaRef.current?.focus();
    adjustHeight();
  };

  const insertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    textareaRef.current?.focus();
    adjustHeight();
  };

  return (
    <div className="relative p-3 bg-[#f8f9fa] dark:bg-[#161920] border-t border-zinc-200 dark:border-zinc-800 select-none transition-colors">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
      />
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className="max-w-4xl mx-auto relative">
        {/* Error notice */}
        {uploadError && (
          <div className="mb-2 p-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center justify-between">
            <span>{uploadError}</span>
            <button
              type="button"
              onClick={() => setUploadError(null)}
              className="text-red-400 hover:text-red-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Replying banner */}
        {replyingTo && (
          <div className="mb-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-200">
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-[#06C755]">Replying to @{replyingTo.sender_username}:</span>
              <span className="truncate italic text-zinc-500 dark:text-zinc-400">"{replyingTo.content.slice(0, 60)}"</span>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Pending attachment preview */}
        {pendingAttachment && (
          <div className="mb-2 p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {pendingAttachment.isUploading ? (
                <Loader2 className="w-4 h-4 text-[#06C755] animate-spin" />
              ) : pendingAttachment.type.startsWith('image/') ? (
                <img
                  src={pendingAttachment.url}
                  alt={pendingAttachment.name}
                  className="w-10 h-10 object-cover rounded-lg border border-zinc-300 dark:border-zinc-700"
                />
              ) : (
                <File className="w-5 h-5 text-[#06C755]" />
              )}
              <div>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 block truncate max-w-xs">
                  {pendingAttachment.name}
                </span>
                <span className="text-[10px] text-zinc-400">
                  {pendingAttachment.isUploading
                    ? 'Uploading...'
                    : `${(pendingAttachment.size / 1024).toFixed(1)} KB`}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPendingAttachment(null)}
              className="p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Slash Command Suggestions */}
        {showCommands && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden z-30 max-h-56 overflow-y-auto">
            <div className="px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">
              Developer Slash Commands
            </div>
            {COMMAND_HINTS.filter((c) => c.cmd.startsWith(text.trim().split(' ')[0])).map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.cmd}
                  type="button"
                  onClick={() => insertCommand(c.cmd)}
                  className="w-full flex items-center gap-3 px-3.5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-xs cursor-pointer transition-colors"
                >
                  <Icon className="w-4 h-4 text-[#06C755]" />
                  <div>
                    <span className="font-mono font-bold text-zinc-900 dark:text-white">{c.cmd}</span>
                    <span className="text-zinc-500 dark:text-zinc-400 ml-2">{c.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Emoji Picker Popup */}
        {showEmojiPicker && (
          <div className="absolute bottom-full right-4 mb-2 p-3 bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-30 w-64">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Select Emoji
            </div>
            <div className="grid grid-cols-5 gap-2 text-xl">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => insertEmoji(e)}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer hover:scale-125"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Plus Action Menu Popup */}
        {showPlusMenu && (
          <div className="absolute bottom-full left-2 mb-2 p-2 bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-30 w-52 space-y-1">
            <button
              type="button"
              id="btn-upload-image-menu"
              onClick={() => imageInputRef.current?.click()}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer transition-colors"
            >
              <Image className="w-4 h-4 text-[#06C755]" />
              <span>Send Image</span>
            </button>
            <button
              type="button"
              id="btn-upload-file-menu"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer transition-colors"
            >
              <Upload className="w-4 h-4 text-blue-500" />
              <span>Send File (Doc/Zip)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                insertCommand('/code');
                setShowPlusMenu(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer transition-colors"
            >
              <Code className="w-4 h-4 text-purple-500" />
              <span>Insert Code Snippet</span>
            </button>
          </div>
        )}

        {/* Main Capsule Input Bar */}
        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-750 rounded-2xl p-1.5 shadow-sm">
          {/* Plus button */}
          <button
            type="button"
            id="composer-plus-btn"
            onClick={() => setShowPlusMenu(!showPlusMenu)}
            title="Attach Image or Code"
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              showPlusMenu
                ? 'bg-[#06C755] text-white rotate-45'
                : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Plus className="w-4 h-4 transition-transform" />
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            id="message-composer-textarea"
            rows={1}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message or / for commands..."
            className="flex-1 bg-transparent border-0 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none resize-none py-1.5 px-1 max-h-32"
          />

          {/* Emoji button */}
          <button
            type="button"
            id="composer-emoji-btn"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Emojis"
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
          >
            <Smile className="w-4 h-4" />
          </button>

          {/* Green Send button */}
          <button
            type="button"
            id="composer-send-btn"
            onClick={submitMessage}
            disabled={(!text.trim() && !pendingAttachment) || pendingAttachment?.isUploading}
            className="p-2.5 rounded-xl bg-[#06C755] hover:bg-[#05b34c] disabled:opacity-30 text-white transition-all cursor-pointer shadow-sm shadow-[#06C755]/20 flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageComposer;
