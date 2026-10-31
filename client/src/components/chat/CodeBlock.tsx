import React, { useState } from 'react';
import hljs from 'highlight.js';
import { Copy, Check, Sparkles, Bug } from 'lucide-react';

interface CodeBlockProps {
  language?: string;
  code: string;
  onAskBot?: (query: string) => void;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, code, onAskBot }) => {
  const [copied, setCopied] = useState(false);

  const cleanLang = (language || 'text').toLowerCase().replace(/^language-/, '');

  // Highlight code
  let highlightedHtml = '';
  try {
    if (cleanLang && hljs.getLanguage(cleanLang)) {
      highlightedHtml = hljs.highlight(code, { language: cleanLang }).value;
    } else {
      highlightedHtml = hljs.highlightAuto(code).value;
    }
  } catch (err) {
    highlightedHtml = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExplain = () => {
    const prompt = `Explain this ${cleanLang} code:\n\n\`\`\`${cleanLang}\n${code}\n\`\`\``;
    if (onAskBot) {
      onAskBot(prompt);
    } else {
      window.dispatchEvent(new CustomEvent('chitabit:askbot', { detail: { query: prompt } }));
    }
  };

  const handleFindBug = () => {
    const prompt = `Find any bugs or potential edge cases in this ${cleanLang} code:\n\n\`\`\`${cleanLang}\n${code}\n\`\`\``;
    if (onAskBot) {
      onAskBot(prompt);
    } else {
      window.dispatchEvent(new CustomEvent('chitabit:askbot', { detail: { query: prompt } }));
    }
  };

  return (
    <div className="relative group my-2.5 rounded-xl overflow-hidden border border-zinc-800/90 bg-[#090b0d] shadow-lg font-mono text-xs">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#0d0f12] border-b border-zinc-800/80 text-zinc-400 select-none">
        <span className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500/80"></span>
          {cleanLang || 'code'}
        </span>

        {/* Quick Action Toolbar */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleExplain}
            title="Ask DevBot to explain this snippet"
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-800/50 transition-colors"
          >
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>Explain</span>
          </button>

          <button
            type="button"
            onClick={handleFindBug}
            title="Ask DevBot to find bugs or edge cases"
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-amber-300 hover:text-white bg-amber-950/60 hover:bg-amber-900 border border-amber-800/50 transition-colors"
          >
            <Bug className="w-3 h-3 text-amber-400" />
            <span>Find Bug</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-zinc-400" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Body */}
      <pre className="p-3.5 overflow-x-auto text-[13px] leading-relaxed text-zinc-200 font-mono">
        <code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
      </pre>
    </div>
  );
};
