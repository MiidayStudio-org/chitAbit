import React from 'react';
import { Bot, Sparkles, Terminal, Code2, GitPullRequest, ArrowRight } from 'lucide-react';

export interface DevBotComingSoonProps {
  onBackToGeneral?: () => void;
}

export const DevBotComingSoon: React.FC<DevBotComingSoonProps> = ({ onBackToGeneral }) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1e2e] text-[#cdd6f4] select-none overflow-y-auto font-mono">
      {/* Editor Sub-Header / Breadcrumb Info */}
      <div className="px-6 py-3 border-b border-[#313244] bg-[#181825] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-[#cba6f7]" />
          <span className="text-[#cba6f7] font-semibold">devbot.ai</span>
          <span className="text-[#6c7086]">•</span>
          <span className="text-[#a6adc8] text-[11px]">Autonomous Pair Programmer</span>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-[#313244] text-[#f9e2af] border border-[#45475a]">
          V2.0 PREVIEW
        </span>
      </div>

      {/* Main Canvas Container */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-2xl mx-auto text-center">
        {/* Glowing Bot Visual */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-[#313244]/80 border-2 border-[#cba6f7] flex items-center justify-center shadow-lg shadow-[#cba6f7]/10">
            <Bot className="w-10 h-10 text-[#cba6f7]" />
          </div>
          <div className="absolute -top-1 -right-1 p-1 bg-[#f9e2af] rounded-full shadow-md">
            <Sparkles className="w-3.5 h-3.5 text-[#11111b]" />
          </div>
        </div>

        {/* Title & Badge */}
        <h1 className="text-2xl font-bold tracking-tight text-[#cdd6f4] mb-2 font-sans">
          DevBot AI Copilot
        </h1>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#313244] border border-[#45475a] text-xs text-[#a6adc8] mb-6">
          <span className="w-2 h-2 rounded-full bg-[#a6e3a1] animate-pulse" />
          <span>Status: Under Active Development — Coming Soon</span>
        </div>

        <p className="text-xs text-[#a6adc8] leading-relaxed max-w-md mb-8">
          The autonomous AI pair programmer is currently being rebuilt for the next major release.
          Chat history has been cleared to prepare for full codebase indexing.
        </p>

        {/* Planned Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left mb-8">
          <div className="p-3.5 rounded-lg bg-[#181825] border border-[#313244] hover:border-[#cba6f7]/50 transition-colors">
            <div className="flex items-center gap-2 mb-1.5 text-[#cba6f7]">
              <Code2 className="w-4 h-4" />
              <span className="text-xs font-bold font-sans">Codebase Indexing</span>
            </div>
            <p className="text-[11px] text-[#6c7086] leading-normal">
              Deep semantic understanding across your entire project file tree and dependencies.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#181825] border border-[#313244] hover:border-[#cba6f7]/50 transition-colors">
            <div className="flex items-center gap-2 mb-1.5 text-[#89b4fa]">
              <Terminal className="w-4 h-4" />
              <span className="text-xs font-bold font-sans">Shell Automation</span>
            </div>
            <p className="text-[11px] text-[#6c7086] leading-normal">
              Execute CLI diagnostics and generate terminal commands natively via chat.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#181825] border border-[#313244] hover:border-[#cba6f7]/50 transition-colors">
            <div className="flex items-center gap-2 mb-1.5 text-[#a6e3a1]">
              <GitPullRequest className="w-4 h-4" />
              <span className="text-xs font-bold font-sans">Automated Diffs</span>
            </div>
            <p className="text-[11px] text-[#6c7086] leading-normal">
              Review and apply AI code suggestions using Git-style side-by-side diff patches.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#181825] border border-[#313244] hover:border-[#cba6f7]/50 transition-colors">
            <div className="flex items-center gap-2 mb-1.5 text-[#f9e2af]">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold font-sans">Real-Time Pairing</span>
            </div>
            <p className="text-[11px] text-[#6c7086] leading-normal">
              Live multi-cursor ghost streaming and code completions directly inside editor tabs.
            </p>
          </div>
        </div>

        {/* Back to Channels Action */}
        {onBackToGeneral && (
          <button
            type="button"
            onClick={onBackToGeneral}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#cba6f7] hover:bg-[#b4befe] text-[#11111b] font-semibold text-xs transition-colors cursor-pointer shadow-md font-sans"
          >
            <span>Switch to #general</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Editor Status Footer Line */}
      <div className="px-6 py-2 border-t border-[#313244] bg-[#181825] text-[11px] text-[#6c7086] flex items-center justify-between">
        <span>// devbot.ai initialized in standby mode</span>
        <span>TypeScript • UTF-8</span>
      </div>
    </div>
  );
};
