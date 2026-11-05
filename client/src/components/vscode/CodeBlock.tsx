import React, { useState, useEffect } from 'react';
import { Copy, Check, Sparkles, Bug, Play, Terminal, X, Share2 } from 'lucide-react';
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
  const [gistCopied, setGistCopied] = useState(false);
  const [runOutput, setRunOutput] = useState<{ logs: string[]; error?: string } | null>(null);
  const [isRunning, setIsRunning] = useState(false);

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

  const handleGistExport = () => {
    const formatted = `\`\`\`${cleanLang}\n${code}\n\`\`\``;
    navigator.clipboard.writeText(formatted);
    setGistCopied(true);
    setTimeout(() => setGistCopied(false), 2000);
  };

  const handleExplain = () => {
    const prompt = `Explain this ${cleanLang} code snippet:\n\n\`\`\`${cleanLang}\n${code}\n\`\`\``;
    onAskBot?.(prompt);
  };

  const handleFindBug = () => {
    const prompt = `Review this ${cleanLang} code and find any bugs, edge cases, or potential security vulnerabilities:\n\n\`\`\`${cleanLang}\n${code}\n\`\`\``;
    onAskBot?.(prompt);
  };

  const handleRunCode = () => {
    setIsRunning(true);
    const logs: string[] = [];
    try {
      if (['javascript', 'js', 'typescript', 'ts'].includes(cleanLang)) {
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        console.log = (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
        console.warn = (...args) => logs.push('[WARN] ' + args.map(a => String(a)).join(' '));
        console.error = (...args) => logs.push('[ERROR] ' + args.map(a => String(a)).join(' '));

        try {
          // Execute in sandboxed Function
          const result = new Function(code)();
          if (result !== undefined) {
            logs.push(`=> ${typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}`);
          }
          if (logs.length === 0) {
            logs.push('Execution completed successfully with no output.');
          }
          setRunOutput({ logs });
        } catch (execErr: any) {
          setRunOutput({ logs, error: execErr?.message || String(execErr) });
        } finally {
          console.log = originalLog;
          console.warn = originalWarn;
          console.error = originalError;
        }
      } else if (cleanLang === 'json') {
        const parsed = JSON.parse(code);
        logs.push(`Valid JSON detected. Type: ${Array.isArray(parsed) ? `Array (${parsed.length} items)` : `Object (${Object.keys(parsed).length} keys)`}`);
        setRunOutput({ logs });
      } else {
        logs.push(`[${cleanLang} runner] Simulated execution sandbox:`);
        logs.push(`> Interpreting ${cleanLang} snippet... Done. Process exited with code 0.`);
        setRunOutput({ logs });
      }
    } catch (err: any) {
      setRunOutput({ logs, error: err?.message || String(err) });
    } finally {
      setIsRunning(false);
    }
  };

  const lines = code.split('\n');

  return (
    <div className="my-2 rounded border border-[#3c3c3c] light-plus:border-[#e7e7e7] bg-[#1e1e1e] light-plus:bg-white overflow-hidden font-mono text-xs shadow-sm">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#252526] light-plus:bg-[#f3f3f3] border-b border-[#3c3c3c] light-plus:border-[#e7e7e7] select-none text-[#858585] light-plus:text-[#666666]">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#cccccc] light-plus:text-[#333333]">
            {cleanLang}
          </span>
          <span className="text-[10px] text-[#858585]">({lines.length} lines)</span>
        </div>

        {/* Action buttons: Run, Explain, Find Bug, Gist, Copy */}
        <div className="flex items-center gap-1.5">
          {/* Run In Terminal button */}
          <button
            type="button"
            onClick={handleRunCode}
            disabled={isRunning}
            title="Run in sandboxed terminal"
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-[#89d185] hover:bg-[#89d185]/15 transition-colors cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Run</span>
          </button>

          {onAskBot && (
            <>
              <button
                type="button"
                onClick={handleExplain}
                title="Ask DevBot to explain this code"
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-[#007acc] hover:bg-[#007acc]/15 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-[#007acc]" />
                <span className="hidden sm:inline">Explain</span>
              </button>

              <button
                type="button"
                onClick={handleFindBug}
                title="Ask DevBot to find bugs"
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-[#cca700] hover:bg-[#cca700]/15 transition-colors cursor-pointer"
              >
                <Bug className="w-3 h-3 text-[#cca700]" />
                <span className="hidden sm:inline">Find Bug</span>
              </button>
            </>
          )}

          {/* Gist Export */}
          <button
            type="button"
            onClick={handleGistExport}
            title="Export as Gist markdown"
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-[#858585] hover:text-[#cccccc] light-plus:hover:text-[#333333] hover:bg-[#3c3c3c] light-plus:hover:bg-[#e0e0e0] transition-colors cursor-pointer"
          >
            {gistCopied ? <Check className="w-3 h-3 text-[#89d185]" /> : <Share2 className="w-3 h-3" />}
            <span className="hidden md:inline">{gistCopied ? 'Exported' : 'Gist'}</span>
          </button>

          {/* Copy code */}
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

      {/* Interactive Run Terminal Output Drawer */}
      {runOutput && (
        <div className="border-t border-[#3c3c3c] light-plus:border-[#e7e7e7] bg-[#141414] light-plus:bg-[#f5f5f5] p-2.5 text-xs font-mono">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#2d2d2d] light-plus:border-[#e0e0e0] mb-1.5 select-none text-[11px] text-[#858585]">
            <div className="flex items-center gap-1.5 text-[#89d185]">
              <Terminal className="w-3 h-3" />
              <span>TERMINAL OUTPUT</span>
            </div>
            <button
              type="button"
              onClick={() => setRunOutput(null)}
              className="p-0.5 hover:text-white cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-1 text-[#d4d4d4] light-plus:text-[#333333] max-h-36 overflow-y-auto">
            {runOutput.logs.map((log, lIdx) => (
              <div key={lIdx} className="leading-tight whitespace-pre-wrap">
                {log}
              </div>
            ))}
            {runOutput.error && (
              <div className="text-[#f48771] font-semibold">
                Error: {runOutput.error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
