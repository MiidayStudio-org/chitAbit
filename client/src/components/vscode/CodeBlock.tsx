import React, { useState, useEffect } from 'react';
import { Copy, Check, Sparkles, Bug } from 'lucide-react';
import { highlightCode, normalizeLanguage, detectLanguage } from '../../utils/shikiHighlighter';

export interface CodeBlockProps {
  language?: string;
  code: string;
  onAskBot?: (query: string) => void;
  isLightMode?: boolean;
  theme?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  language,
  code,
  onAskBot,
  isLightMode = false,
  theme: customTheme,
}) => {
  const [highlightedHtml, setHighlightedHtml] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const cleanLang = normalizeLanguage(language) || detectLanguage(code) || 'typescript';
  const effectiveTheme = customTheme || (isLightMode ? 'light-plus' : 'dark-plus');

  useEffect(() => {
    let isCancelled = false;
    highlightCode(code, cleanLang, effectiveTheme).then((html) => {
      if (!isCancelled) setHighlightedHtml(html);
    });
    return () => {
      isCancelled = true;
    };
  }, [code, cleanLang, effectiveTheme]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExplain = () => {
    const prompt = `Explain this ${cleanLang} code snippet:\n\n\`\`\`${cleanLang}\n${code}\n\`\`\``;
    onAskBot?.(prompt);
  };

  const handleFindBug = () => {
    const prompt = `Review this ${cleanLang} code and find any bugs, edge cases, or potential security vulnerabilities:\n\n\`\`\`${cleanLang}\n${code}\n\`\`\``;
    onAskBot?.(prompt);
  };

  const lines = code.split('\n');

  return (
    <div className="my-2 rounded border border-[#3c3c3c] light-plus:border-[#e7e7e7] bg-[#1e1e1e] light-plus:bg-white overflow-hidden font-mono text-xs shadow-sm">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#252526] light-plus:bg-[#f3f3f3] border-b border-[#3c3c3c] light-plus:border-[#e7e7e7] select-none text-[#858585] light-plus:text-[#666666]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#cccccc] light-plus:text-[#333333]">
          {cleanLang}
        </span>

        {/* Action buttons: Explain, Find Bug, Copy */}
        <div className="flex items-center gap-1.5">
          {onAskBot && (
            <>
              <button
                type="button"
                onClick={handleExplain}
                title="Ask DevBot to explain this code"
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-[#007acc] hover:bg-[#007acc]/15 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-[#007acc]" />
                <span>Explain</span>
              </button>

              <button
                type="button"
                onClick={handleFindBug}
                title="Ask DevBot to find bugs"
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-[#cca700] hover:bg-[#cca700]/15 transition-colors cursor-pointer"
              >
                <Bug className="w-3 h-3 text-[#cca700]" />
                <span>Find Bug</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleCopy}
            title="Copy code"
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-[#858585] hover:text-[#cccccc] light-plus:hover:text-[#333333] hover:bg-[#3c3c3c] light-plus:hover:bg-[#e0e0e0] transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-[#89d185]" />
                <span className="text-[#89d185]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Body with Line Number Gutter */}
      <div className="flex overflow-x-auto p-2 leading-relaxed">
        {/* Line Numbers Gutter */}
        <div className="select-none pr-3 text-right text-[#858585] light-plus:text-[#a0a0a0] border-r border-[#2d2d2d] light-plus:border-[#f0f0f0] font-mono text-xs opacity-60 flex flex-col flex-shrink-0">
          {lines.map((_, i) => (
            <span key={i} className="leading-[1.5] text-[12px]">
              {i + 1}
            </span>
          ))}
        </div>

        {/* Shiki Highlighted Code */}
        <div className="pl-3 flex-1 overflow-x-auto">
          {highlightedHtml ? (
            <div
              className="shiki-container"
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          ) : (
            <pre className="text-[#cccccc] light-plus:text-[#333333] font-mono text-xs leading-[1.5]">
              <code>{code}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
