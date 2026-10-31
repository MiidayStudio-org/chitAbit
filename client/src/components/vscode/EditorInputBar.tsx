import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Upload,
  Code,
  Sparkles,
  Smile,
  X,
  File,
  Loader2,
  Terminal,
} from 'lucide-react';
import { Message } from '../../types';

export interface EditorInputBarProps {
  onSendMessage: (
    content: string,
    attachment?: { url: string; type: string; name: string; size: number }
  ) => void;
  onTyping: (isTyping: boolean) => void;
  onUpdateDraft?: (text: string, cursorPos?: number) => void;
  onClearDraft?: () => void;
  shareLiveTyping?: boolean;
  targetId?: string;
  targetName: string;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  socketConnected?: boolean;
}

const COMMAND_HINTS = [
  { cmd: '/help', desc: 'Show all slash commands' },
  { cmd: '/ask', desc: 'Ask DevBot a coding question' },
  { cmd: '/code', desc: 'Insert code snippet (/code <lang>)' },
  { cmd: '/json', desc: 'Validate & format JSON' },
  { cmd: '/time', desc: 'Show current UTC and local time' },
  { cmd: '/clear', desc: 'Clear messages from local editor view' },
];

const EMOJIS = ['👍', '❤️', '🚀', '🔥', '🐛', '👀', '💯', '🎉', '⚡', '👏', '💡', '✅', '☕', '🤖'];

export const EditorInputBar: React.FC<EditorInputBarProps> = ({
  onSendMessage,
  onTyping,
  onUpdateDraft,
  onClearDraft,
  shareLiveTyping = true,
  targetId,
  targetName,
  replyingTo,
  onCancelReply,
  socketConnected = true,
}) => {
  const [text, setText] = useState('');
  const [showCommands, setShowCommands] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throttleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDraftSentTimeRef = useRef<number>(0);
  const hasActiveDraftRef = useRef<boolean>(false);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [targetName, replyingTo]);

  // Clear draft on chat switch
  useEffect(() => {
    if (hasActiveDraftRef.current) {
      onClearDraft?.();
      hasActiveDraftRef.current = false;
    }
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
      throttleTimeoutRef.current = null;
    }
    if (idleClearTimeoutRef.current) {
      clearTimeout(idleClearTimeoutRef.current);
      idleClearTimeoutRef.current = null;
    }
    setText('');
  }, [targetId, onClearDraft]);

  // Resend current draft on socket reconnect
  useEffect(() => {
    if (
      socketConnected &&
      text.trim() &&
      !text.startsWith('/') &&
      targetId !== 'devbot' &&
      shareLiveTyping !== false
    ) {
      const textToSend = text.length > 4000 ? text.slice(0, 4000) : text;
      onUpdateDraft?.(textToSend, textareaRef.current?.selectionStart);
      hasActiveDraftRef.current = true;
    }
  }, [socketConnected, targetId, shareLiveTyping, onUpdateDraft, text]);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  };

  const handleDraftEmit = (val: string, cursorPos?: number) => {
    const isSlash = val.startsWith('/');
    const isBotChat = targetId === 'devbot';
    const isLiveDisabled = shareLiveTyping === false;

    // Clear 5s empty-box idle timer if running
    if (idleClearTimeoutRef.current) {
      clearTimeout(idleClearTimeoutRef.current);
      idleClearTimeoutRef.current = null;
    }

    if (isLiveDisabled || isSlash || isBotChat || !val.trim()) {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
        throttleTimeoutRef.current = null;
      }

      // If empty box, set 5-second idle cleanup
      if (!val.trim()) {
        idleClearTimeoutRef.current = setTimeout(() => {
          if (hasActiveDraftRef.current) {
            onClearDraft?.();
            hasActiveDraftRef.current = false;
          }
        }, 5000);
      }

      if (hasActiveDraftRef.current) {
        onClearDraft?.();
        hasActiveDraftRef.current = false;
      }
      return;
    }

    // Throttle sends to max ~15 updates per second (~66ms interval)
    const now = Date.now();
    const THROTTLE_MS = 66;
    const elapsed = now - lastDraftSentTimeRef.current;
    const textToSend = val.length > 4000 ? val.slice(0, 4000) : val;

    if (elapsed >= THROTTLE_MS) {
      lastDraftSentTimeRef.current = now;
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
        throttleTimeoutRef.current = null;
      }
      onUpdateDraft?.(textToSend, cursorPos);
      hasActiveDraftRef.current = true;
    } else {
      // Schedule trailing update to guarantee the final value is always sent
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
      throttleTimeoutRef.current = setTimeout(() => {
        lastDraftSentTimeRef.current = Date.now();
        const currentPos = textareaRef.current?.selectionStart;
        const latestText = textareaRef.current?.value || textToSend;
        onUpdateDraft?.(
          latestText.length > 4000 ? latestText.slice(0, 4000) : latestText,
          currentPos
        );
        hasActiveDraftRef.current = true;
        throttleTimeoutRef.current = null;
      }, THROTTLE_MS - elapsed);
    }
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
    }, 4000);

    handleDraftEmit(val, e.target.selectionStart);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    } else if (e.key === 'Escape') {
      if (showCommands) setShowCommands(false);
      else if (showEmojiPicker) setShowEmojiPicker(false);
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
    // Cancel any pending throttle timer and idle timer
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
      throttleTimeoutRef.current = null;
    }
    if (idleClearTimeoutRef.current) {
      clearTimeout(idleClearTimeoutRef.current);
      idleClearTimeoutRef.current = null;
    }

    // Immediately clear active draft so the ghost message disappears when real message arrives
    if (hasActiveDraftRef.current) {
      onClearDraft?.();
      hasActiveDraftRef.current = false;
    }

    const trimmed = text.trim();
    if (!trimmed && !pendingAttachment) return;

    let finalContent = trimmed;

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
    if (replyingTo) onCancelReply?.();

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const insertCommand = (cmd: string) => {
    let newText = '';
    if (cmd === '/code') newText = '/code typescript ';
    else if (cmd === '/ask') newText = '/ask ';
    else if (cmd === '/json') newText = '/json {"status": "ok"}';
    else newText = `${cmd} `;

    setText(newText);
    setShowCommands(false);
    textareaRef.current?.focus();
    adjustHeight();
    handleDraftEmit(newText, newText.length);
  };

  const insertEmoji = (emoji: string) => {
    setText((prev) => {
      const updated = prev + emoji;
      handleDraftEmit(updated, updated.length);
      return updated;
    });
    textareaRef.current?.focus();
    adjustHeight();
  };

  return (
    <div className="p-3 bg-[var(--bg)] border-t border-[var(--border)] select-none font-mono transition-colors">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className="max-w-5xl mx-auto relative">
        {/* Upload Error Banner */}
        {uploadError && (
          <div className="mb-2 p-1.5 bg-[#5a1d1d] text-[#f88070] text-xs rounded flex items-center justify-between">
            <span>{uploadError}</span>
            <button
              type="button"
              onClick={() => setUploadError(null)}
              className="text-[#f88070] hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Quoting banner */}
        {replyingTo && (
          <div className="mb-2 p-2 bg-[#252526] light-plus:bg-white border-l-2 border-[#007acc] rounded-r flex items-center justify-between text-xs text-[#cccccc] light-plus:text-[#333333]">
            <div className="truncate">
              <span className="font-bold text-[#4fc1ff]">
                Replying to @{replyingTo.sender_username}:
              </span>{' '}
              <span className="italic text-[#858585]">
                "{replyingTo.content.slice(0, 70)}"
              </span>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              className="p-1 text-[#858585] hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Pending Attachment Chip */}
        {pendingAttachment && (
          <div className="mb-2 p-2 bg-[#252526] light-plus:bg-white border border-[#3c3c3c] light-plus:border-[#e7e7e7] rounded flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {pendingAttachment.isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#007acc]" />
              ) : (
                <File className="w-4 h-4 text-[#007acc]" />
              )}
              <span className="font-semibold text-[#cccccc] light-plus:text-[#333333]">
                {pendingAttachment.name}
              </span>
              <span className="text-[10px] text-[#858585]">
                {pendingAttachment.isUploading
                  ? 'Uploading...'
                  : `${(pendingAttachment.size / 1024).toFixed(1)} KB`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPendingAttachment(null)}
              className="p-1 text-[#858585] hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Slash Command Suggestions Palette */}
        {showCommands && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#252526] light-plus:bg-white border border-[#3c3c3c] light-plus:border-[#e7e7e7] shadow-2xl rounded overflow-hidden z-30 max-h-52 overflow-y-auto font-mono text-xs">
            <div className="px-3 py-1 bg-[#1e1e1e] light-plus:bg-[#f0f0f0] text-[10px] uppercase font-bold text-[#858585]">
              VS Code Commands
            </div>
            {COMMAND_HINTS.filter((c) => c.cmd.startsWith(text.trim().split(' ')[0])).map((c) => (
              <button
                key={c.cmd}
                type="button"
                onClick={() => insertCommand(c.cmd)}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#04395e] hover:text-white cursor-pointer text-left transition-colors"
              >
                <span className="font-bold text-[#c586c0]">{c.cmd}</span>
                <span className="text-[#858585] text-[11px]">{c.desc}</span>
              </button>
            ))}
          </div>
        )}

        {/* Emoji Picker Popup */}
        {showEmojiPicker && (
          <div className="absolute bottom-full right-2 mb-2 p-2 bg-[#252526] light-plus:bg-white border border-[#3c3c3c] light-plus:border-[#e7e7e7] rounded shadow-2xl z-30 w-56">
            <div className="text-[10px] font-bold text-[#858585] uppercase mb-1.5">
              Insert Emoji
            </div>
            <div className="grid grid-cols-7 gap-1 text-base">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => insertEmoji(e)}
                  className="p-1 hover:bg-[#37373d] light-plus:hover:bg-[#e0e0e0] rounded cursor-pointer transition-transform hover:scale-125"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main VS Code Editor Input Box */}
        <div className="border border-[var(--border)] focus-within:border-[var(--accent)] rounded bg-[var(--input-bg)] shadow-inner flex flex-col transition-colors">
          <textarea
            ref={textareaRef}
            id="vscode-editor-input"
            rows={1}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={`Type a message into ${targetName}... (/ for commands, Shift+Enter for newline)`}
            className="w-full bg-transparent px-3 py-2 text-[13px] text-[var(--text)] placeholder-[var(--muted)] outline-none resize-none leading-relaxed font-mono max-h-36"
          />

          {/* Action Toolbar on Bottom Edge */}
          <div className="flex items-center justify-between px-2 py-1 bg-[var(--sidebar)] border-t border-[var(--border)] text-xs">
            {/* Left Tools */}
            <div className="flex items-center gap-1 text-[#858585]">
              <button
                type="button"
                id="btn-composer-upload"
                title="Attach Image or File (Max 5MB)"
                onClick={() => fileInputRef.current?.click()}
                className="p-1 hover:text-[#cccccc] light-plus:hover:text-[#333333] hover:bg-[#37373d] light-plus:hover:bg-[#e8e8e8] rounded cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                id="btn-composer-code"
                title="Insert Code Snippet (/code)"
                onClick={() => insertCommand('/code')}
                className="p-1 hover:text-[#cccccc] light-plus:hover:text-[#333333] hover:bg-[#37373d] light-plus:hover:bg-[#e8e8e8] rounded cursor-pointer"
              >
                <Code className="w-3.5 h-3.5 text-[#4fc1ff]" />
              </button>

              <button
                type="button"
                id="btn-composer-askbot"
                title="Ask DevBot (/ask)"
                onClick={() => insertCommand('/ask')}
                className="p-1 hover:text-[#cccccc] light-plus:hover:text-[#333333] hover:bg-[#37373d] light-plus:hover:bg-[#e8e8e8] rounded cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#cca700]" />
              </button>

              <button
                type="button"
                id="btn-composer-emoji"
                title="Pick Emoji"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1 hover:text-[#cccccc] light-plus:hover:text-[#333333] hover:bg-[#37373d] light-plus:hover:bg-[#e8e8e8] rounded cursor-pointer"
              >
                <Smile className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Right: Send Button with Enter hint */}
            <button
              type="button"
              id="vscode-send-btn"
              onClick={submitMessage}
              disabled={(!text.trim() && !pendingAttachment) || pendingAttachment?.isUploading}
              className="flex items-center gap-1.5 px-3 py-1 bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 text-white rounded text-[11px] font-semibold transition-opacity cursor-pointer"
            >
              <span>Send</span>
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
