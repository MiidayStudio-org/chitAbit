import React, { useState, useRef, useEffect } from 'react';
import { Send, Code, Terminal, Sparkles, HelpCircle, Braces, Clock, CornerDownLeft, X } from 'lucide-react';
import { Message } from '../../types';

interface MessageInputProps {
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

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  targetName,
  isDM,
  replyingTo,
  onCancelReply,
}) => {
  const [text, setText] = useState('');
  const [showCommands, setShowCommands] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus input on target switch or when reply is activated
  useEffect(() => {
    textareaRef.current?.focus();
  }, [targetName, replyingTo]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    // Check if user is typing a slash command
    if (val.startsWith('/') && !val.includes('\n')) {
      setShowCommands(true);
    } else {
      setShowCommands(false);
    }

    // Typing indicator
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
    } else if (e.key === 'Escape' && replyingTo) {
      onCancelReply?.();
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
    onTyping(false);
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
  };

  const insertCodeTemplate = () => {
    setText((prev) =>
      prev ? `${prev}\n\`\`\`typescript\n// Code snippet\n\`\`\`` : `\`\`\`typescript\n// Code snippet\n\`\`\``
    );
    textareaRef.current?.focus();
  };

  return (
    <div className="relative p-3 bg-[#0d0f12] border-t border-zinc-800/80">
      {/* Slash Command Suggestions Palette */}
      {showCommands && (
        <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#090b0d] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-20 max-h-60 overflow-y-auto">
          <div className="px-3 py-1.5 bg-zinc-900/60 text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-wider">
            Available Slash Commands
          </div>
          <div className="divide-y divide-zinc-800/50">
            {COMMAND_HINTS.filter((c) => c.cmd.startsWith(text.trim().split(' ')[0])).map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.cmd}
                  type="button"
                  onClick={() => insertCommand(c.cmd)}
                  className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-zinc-800/50 transition-colors"
                >
                  <Icon className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="font-mono text-xs font-semibold text-zinc-200">
                    {c.cmd}
                  </span>
                  <span className="text-xs text-zinc-500 truncate font-sans">
                    — {c.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Input container */}
      <div className="flex flex-col bg-[#090b0d] rounded-xl border border-zinc-800/80 focus-within:border-zinc-700 transition-all shadow-inner overflow-hidden">
        {/* Reply Context Banner */}
        {replyingTo && (
          <div className="flex items-center justify-between px-3.5 py-1.5 bg-indigo-950/40 border-b border-indigo-900/40 text-xs text-zinc-300">
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
              className="text-zinc-500 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800/60 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${isDM ? '@' : '#'}${targetName}... (Shift+Enter for newline, / for commands)`}
          rows={2}
          className="w-full bg-transparent px-3.5 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 resize-none focus:outline-none font-sans"
        />

        {/* Toolbar Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-zinc-800/50">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={insertCodeTemplate}
              title="Insert code snippet"
              className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors flex items-center gap-1 text-xs"
            >
              <Code className="w-3.5 h-3.5 text-zinc-500" />
              <span className="font-mono text-[11px]">Code</span>
            </button>

            <button
              type="button"
              onClick={() => insertCommand('/ask')}
              title="Ask DevBot"
              className="p-1 rounded text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 transition-colors flex items-center gap-1 text-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-medium text-[11px]">Ask DevBot</span>
            </button>

            <button
              type="button"
              onClick={() => insertCommand('/help')}
              title="Slash command help"
              className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors flex items-center gap-1 text-xs"
            >
              <HelpCircle className="w-3.5 h-3.5 text-zinc-500" />
              <span className="font-mono text-[11px]">/help</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[11px] text-zinc-500 font-mono">
              ↵ to send
            </span>
            <button
              type="button"
              onClick={submitMessage}
              disabled={!text.trim()}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm font-mono cursor-pointer"
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

export default MessageInput;
