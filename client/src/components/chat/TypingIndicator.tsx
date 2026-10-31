import React from 'react';
import { Bot } from 'lucide-react';

interface TypingIndicatorProps {
  typingUsers: string[];
  isBotTyping?: boolean;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers, isBotTyping }) => {
  if (typingUsers.length === 0 && !isBotTyping) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-slate-500 dark:text-devdark-textMuted italic">
      {isBotTyping && (
        <span className="flex items-center gap-1 text-indigo-400 font-semibold not-italic">
          <Bot className="w-3.5 h-3.5 animate-bounce" />
          DevBot is thinking & typing...
        </span>
      )}

      {typingUsers.length > 0 && (
        <span className="flex items-center gap-1.5">
          <span>
            {typingUsers.length === 1
              ? `${typingUsers[0]} is typing`
              : `${typingUsers.slice(0, 2).join(', ')} are typing`}
          </span>
          <span className="inline-flex gap-1 items-center">
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
          </span>
        </span>
      )}
    </div>
  );
};
