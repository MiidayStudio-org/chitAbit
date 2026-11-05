import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Channel, ActiveChat, User } from '../../types';
import { channelToChat } from '../../utils/chatUtils';
import {
  Terminal,
  AlertCircle,
  FileText,
  X,
  ChevronUp,
  ChevronDown,
  Trash2,
  Send,
  Plus,
} from 'lucide-react';

export type BottomPanelTab = 'terminal' | 'output' | 'problems';

export interface BottomPanelProps {
  isOpen: boolean;
  onClose: () => void;
  channels: Channel[];
  activeChat: ActiveChat | null;
  unreadCounts: Record<string, number>;
  typingChannelIds?: Set<string>;
  onSelectChat: (chat: ActiveChat) => void;
  onCreateChannel: () => void;
  onSendMessage?: (content: string) => void;
  currentUser: User | null;
  socketConnected: boolean;
  friends: User[];
  onOpenSplitWithChat?: (chat: ActiveChat) => void;
}

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'system';
  text: string;
  channel?: string;
  timestamp: string;
}

// Strictly restricted to 4 active channels per user requirement
const RESTRICTED_CHANNELS: { id: string; name: string; description: string }[] = [
  { id: 'general', name: 'general', description: 'General developer discussion & chat' },
  { id: 'javascript', name: 'javascript', description: 'TypeScript, React, Node.js & Web development' },
  { id: 'python', name: 'python', description: 'Python scripts, backend, automation & AI tooling' },
  { id: 'devops', name: 'devops', description: 'CI/CD pipelines, Docker, Kubernetes & cloud infra' },
];

export const BottomPanel: React.FC<BottomPanelProps> = ({
  isOpen,
  onClose,
  channels: _channels,
  activeChat,
  unreadCounts,
  typingChannelIds,
  onSelectChat,
  onCreateChannel: _onCreateChannel,
  onSendMessage,
  currentUser,
  socketConnected,
  friends: _friends,
}) => {
  const [activeTab, setActiveTab] = useState<BottomPanelTab>('terminal');
  const [isExpanded, setIsExpanded] = useState(false);

  // Selected channel in the terminal split left pane (strictly 1 of the 4)
  const [selectedChannelId, setSelectedChannelId] = useState<string>('general');

  // Terminal history & input
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState<TerminalLine[]>([
    {
      id: 'init-1',
      type: 'system',
      text: 'ChatAbit Terminal v1.2.0 (x86_64-pc-terminal) — Type "help" for CLI commands.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
    {
      id: 'init-2',
      type: 'system',
      text: 'ZSH shell connected. Target instances: #general, #javascript, #python, #devops.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const terminalBottomRef = useRef<HTMLDivElement>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);

  // Active channel object from the 4 restricted items
  const activeTerminalChannel = useMemo(() => {
    return RESTRICTED_CHANNELS.find((c) => c.id === selectedChannelId) || RESTRICTED_CHANNELS[0];
  }, [selectedChannelId]);

  // Keep terminal selected channel aligned if editor active chat is one of the 4
  useEffect(() => {
    if (activeChat?.type === 'channel') {
      const match = RESTRICTED_CHANNELS.find((c) => c.id === activeChat.id || c.name === activeChat.name);
      if (match) {
        setSelectedChannelId(match.id);
      }
    }
  }, [activeChat]);

  // Auto-scroll terminal on new line
  useEffect(() => {
    if (activeTab === 'terminal') {
      terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalHistory, activeTab]);

  if (!isOpen) return null;

  const totalChannelUnreads = RESTRICTED_CHANNELS.reduce(
    (sum, c) => sum + (unreadCounts[c.id] || 0),
    0
  );

  const handleSelectTerminalChannel = (channelItem: typeof RESTRICTED_CHANNELS[0]) => {
    setSelectedChannelId(channelItem.id);
    const chatObj: ActiveChat = {
      type: 'channel',
      id: channelItem.id,
      name: channelItem.name,
      displayName: channelItem.name,
      fileIcon: 'folder',
    };
    onSelectChat(chatObj);
    terminalInputRef.current?.focus();
  };

  const handleRunCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = terminalInput.trim();
    if (!rawInput) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const zshPromptText = `chitAbit git:(main) #${activeTerminalChannel.name} ➜ ${rawInput}`;

    const inputLine: TerminalLine = {
      id: String(Date.now()),
      type: 'input',
      text: zshPromptText,
      timestamp: timeStr,
    };

    const outputLines: TerminalLine[] = [];
    const parts = rawInput.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ').trim();

    switch (command) {
      case 'help':
        outputLines.push({
          id: String(Date.now() + 1),
          type: 'output',
          text: `ChatAbit Terminal Commands:
  send <msg>              Send a message to #${activeTerminalChannel.name}
  send #<channel> <msg>   Send a message to specified channel
  checkout #<channel>     Switch active channel (#general, #javascript, #python, #devops)
  channels                List all 4 active terminal channels
  whoami                  Display current user session & git identity
  clear                   Clear terminal history stream
  help                    Show this manual`,
          timestamp: timeStr,
        });
        break;

      case 'clear':
        setTerminalHistory([]);
        setTerminalInput('');
        return;

      case 'channels':
        outputLines.push({
          id: String(Date.now() + 1),
          type: 'output',
          text: RESTRICTED_CHANNELS.map(
            (c, idx) =>
              `  ${idx + 1}: #${c.name.padEnd(12)} (unread: ${unreadCounts[c.id] || 0}) — ${c.description}`
          ).join('\n'),
          timestamp: timeStr,
        });
        break;

      case 'checkout':
      case 'switch':
      case 'cd': {
        const target = args.replace(/^#/, '').toLowerCase();
        const match = RESTRICTED_CHANNELS.find((c) => c.name.toLowerCase() === target || c.id === target);
        if (match) {
          handleSelectTerminalChannel(match);
          outputLines.push({
            id: String(Date.now() + 1),
            type: 'output',
            text: `Switched terminal instance to #${match.name}`,
            timestamp: timeStr,
          });
        } else {
          outputLines.push({
            id: String(Date.now() + 1),
            type: 'error',
            text: `Channel "${target}" not found in active list. Available: #general, #javascript, #python, #devops.`,
            timestamp: timeStr,
          });
        }
        break;
      }

      case 'whoami':
        outputLines.push({
          id: String(Date.now() + 1),
          type: 'output',
          text: `User: ${currentUser?.username || 'Guest'} (ID: ${currentUser?.id || 'none'})
Git Branch: main | Shell: zsh 5.9 | Socket: ${socketConnected ? 'Connected' : 'Disconnected'}`,
          timestamp: timeStr,
        });
        break;

      case 'send': {
        if (!args) {
          outputLines.push({
            id: String(Date.now() + 1),
            type: 'error',
            text: 'Usage: send <message> OR send #channel <message>',
            timestamp: timeStr,
          });
          break;
        }

        let msgText = args;
        let targetChannel = activeTerminalChannel;

        if (args.startsWith('#')) {
          const splitSpace = args.indexOf(' ');
          if (splitSpace > 0) {
            const chanTarget = args.slice(1, splitSpace).toLowerCase();
            const found = RESTRICTED_CHANNELS.find((c) => c.name === chanTarget || c.id === chanTarget);
            if (found) {
              targetChannel = found;
              msgText = args.slice(splitSpace + 1).trim();
            }
          }
        }

        if (onSendMessage && msgText) {
          // If sending to a different channel, switch first
          if (targetChannel.id !== activeTerminalChannel.id) {
            handleSelectTerminalChannel(targetChannel);
          }
          onSendMessage(msgText);
          outputLines.push({
            id: String(Date.now() + 1),
            type: 'output',
            text: `[Delivered to #${targetChannel.name}]: "${msgText}"`,
            timestamp: timeStr,
          });
        }
        break;
      }

      default: {
        // Direct message dispatch shortcut if not a recognized command
        if (onSendMessage) {
          onSendMessage(rawInput);
          outputLines.push({
            id: String(Date.now() + 1),
            type: 'output',
            text: `[Sent to #${activeTerminalChannel.name}]: "${rawInput}"`,
            timestamp: timeStr,
          });
        } else {
          outputLines.push({
            id: String(Date.now() + 1),
            type: 'error',
            text: `zsh: command not found: ${command}. Type "help" for a list of commands.`,
            timestamp: timeStr,
          });
        }
        break;
      }
    }

    setTerminalHistory((prev) => [...prev, inputLine, ...outputLines]);
    setTerminalInput('');
  };

  return (
    <section
      aria-label="Integrated VS Code Panel"
      className={`border-t border-[#313244] bg-[#1e1e2e] text-[#cdd6f4] flex flex-col font-mono select-none transition-all duration-200 z-20 flex-shrink-0 ${
        isExpanded ? 'h-[440px]' : 'h-64'
      }`}
    >
      {/* 1. Panel Header Strip */}
      <div className="h-8 px-3 bg-[#181825] border-b border-[#313244] flex items-center justify-between text-xs flex-shrink-0">
        <div className="flex items-center gap-1">
          {/* TERMINAL TAB */}
          <button
            type="button"
            onClick={() => setActiveTab('terminal')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'terminal'
                ? 'text-[#cdd6f4] border-b-2 border-[#cba6f7] bg-[#313244]/40 font-bold'
                : 'text-[#6c7086] hover:text-[#cdd6f4]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-[#a6e3a1]" />
            <span>TERMINAL</span>
          </button>

          {/* OUTPUT TAB */}
          <button
            type="button"
            onClick={() => setActiveTab('output')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'output'
                ? 'text-[#cdd6f4] border-b-2 border-[#cba6f7] bg-[#313244]/40 font-bold'
                : 'text-[#6c7086] hover:text-[#cdd6f4]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#f9e2af]" />
            <span>OUTPUT</span>
          </button>

          {/* PROBLEMS TAB */}
          <button
            type="button"
            onClick={() => setActiveTab('problems')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'problems'
                ? 'text-[#cdd6f4] border-b-2 border-[#cba6f7] bg-[#313244]/40 font-bold'
                : 'text-[#6c7086] hover:text-[#cdd6f4]'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-[#89b4fa]" />
            <span>PROBLEMS</span>
            {totalChannelUnreads > 0 && (
              <span className="ml-0.5 px-1 bg-[#313244] text-[#cba6f7] rounded-full text-[10px] font-bold">
                {totalChannelUnreads}
              </span>
            )}
          </button>
        </div>

        {/* Header Right Controls */}
        <div className="flex items-center gap-1 text-[#6c7086]">
          {activeTab === 'terminal' && (
            <button
              type="button"
              title="Clear Terminal (clear)"
              onClick={() => setTerminalHistory([])}
              className="p-1 hover:text-[#cdd6f4] hover:bg-[#313244] rounded cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            title={isExpanded ? 'Restore Panel Size' : 'Maximize Panel Size'}
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1 hover:text-[#cdd6f4] hover:bg-[#313244] rounded cursor-pointer"
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            title="Close Panel (Ctrl+~)"
            onClick={onClose}
            className="p-1 hover:text-[#cdd6f4] hover:bg-[#313244] rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Panel Content Body */}
      <div className="flex-1 overflow-hidden flex bg-[#1e1e2e]">
        {/* VIEW 1: TERMINAL SPLIT LAYOUT */}
        {activeTab === 'terminal' && (
          <div className="flex-1 flex overflow-hidden">
            {/* LEFT PANEL: 4 CHANNEL INSTANCES */}
            <div className="w-36 sm:w-48 flex-shrink-0 bg-[#181825] border-r border-[#313244] flex flex-col select-none">
              <div className="h-7 px-3 flex items-center justify-between text-[11px] font-bold text-[#6c7086] border-b border-[#313244]/60 tracking-wider uppercase">
                <span>INSTANCES (4)</span>
                <span className="text-[10px] text-[#a6adc8]">zsh</span>
              </div>

              <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
                {RESTRICTED_CHANNELS.map((channelItem, index) => {
                  const isSelected = selectedChannelId === channelItem.id;
                  const unread = unreadCounts[channelItem.id] || 0;
                  const isTyping = typingChannelIds?.has(channelItem.id);

                  return (
                    <button
                      key={channelItem.id}
                      type="button"
                      onClick={() => handleSelectTerminalChannel(channelItem)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer text-left ${
                        isSelected
                          ? 'bg-[#313244] text-[#cba6f7] font-bold border-l-2 border-[#cba6f7]'
                          : 'text-[#a6adc8] hover:bg-[#313244]/50 hover:text-[#cdd6f4]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Terminal className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-[#a6e3a1]' : 'text-[#6c7086]'}`} />
                        <span className="truncate">
                          {index + 1}: #{channelItem.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isTyping && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#cba6f7] animate-ping" />
                        )}
                        {unread > 0 && (
                          <span className="px-1.5 py-0.2 bg-[#cba6f7] text-[#11111b] text-[9px] font-bold rounded-full">
                            {unread}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-2 border-t border-[#313244]/60 text-[10px] text-[#6c7086] text-center">
                <span>Click instance to switch</span>
              </div>
            </div>

            {/* RIGHT PANEL: ACTIVE SHELL & CHAT STREAM */}
            <div className="flex-1 flex flex-col bg-[#1e1e2e] overflow-hidden text-xs">
              {/* History Stream */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1 select-text">
                {terminalHistory.map((line) => {
                  if (line.type === 'system') {
                    return (
                      <div key={line.id} className="text-[#6c7086] italic text-[11px] leading-relaxed">
                        [{line.timestamp}] {line.text}
                      </div>
                    );
                  }

                  if (line.type === 'input') {
                    return (
                      <div key={line.id} className="text-[#cdd6f4] font-semibold flex items-start gap-1">
                        <span className="text-[#a6e3a1] font-bold">chitAbit</span>
                        <span className="text-[#89b4fa] font-bold">git:(<span className="text-[#f9e2af]">main</span>)</span>
                        <span className="text-[#cba6f7] font-bold">#{activeTerminalChannel.name}</span>
                        <span className="text-[#94e2d5] font-bold">➜</span>
                        <span className="text-[#cdd6f4] ml-1">{line.text.split('➜ ')[1] || line.text}</span>
                      </div>
                    );
                  }

                  if (line.type === 'error') {
                    return (
                      <div key={line.id} className="text-[#f38ba8] pl-2 border-l border-[#f38ba8]/40 whitespace-pre-wrap">
                        {line.text}
                      </div>
                    );
                  }

                  return (
                    <div key={line.id} className="text-[#a6adc8] pl-2 border-l border-[#45475a] whitespace-pre-wrap leading-relaxed">
                      {line.text}
                    </div>
                  );
                })}
                <div ref={terminalBottomRef} />
              </div>

              {/* ZSH-style Command Prompt Input Bar */}
              <form
                onSubmit={handleRunCommand}
                className="p-2 bg-[#181825] border-t border-[#313244] flex items-center gap-2 flex-shrink-0"
              >
                {/* ZSH Prompt Prefix */}
                <div className="flex items-center gap-1.5 flex-shrink-0 select-none">
                  <span className="hidden sm:inline text-[#a6e3a1] font-bold">chitAbit</span>
                  <span className="hidden md:inline text-[#89b4fa] font-bold">git:(<span className="text-[#f9e2af]">main</span>)</span>
                  <span className="text-[#cba6f7] font-bold">#{activeTerminalChannel.name}</span>
                  <span className="text-[#94e2d5] font-bold">➜</span>
                </div>

                {/* Command Input Field */}
                <input
                  ref={terminalInputRef}
                  type="text"
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  placeholder={`Type command or message into #${activeTerminalChannel.name}...`}
                  className="flex-1 bg-transparent text-[#cdd6f4] outline-none font-mono text-xs border-none p-0 focus:ring-0"
                  autoFocus
                />

                <button
                  type="submit"
                  disabled={!terminalInput.trim()}
                  className="px-2.5 py-1 rounded bg-[#cba6f7] hover:bg-[#b4befe] text-[#11111b] font-bold text-xs transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1"
                >
                  <Send className="w-3 h-3 stroke-[2.5]" />
                  <span className="hidden sm:inline">Run</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* VIEW 2: OUTPUT STREAM */}
        {activeTab === 'output' && (
          <div className="flex-1 p-3 overflow-y-auto space-y-1.5 text-xs text-[#a6adc8]">
            <div className="text-[#6c7086] border-b border-[#313244] pb-1 text-[11px]">
              [Telemetry Output Stream] ChatAbit v1.2.0 • Socket connection active
            </div>
            <p className="text-[#a6e3a1]">[WS] Connected to WebSocket gateway on wss://chatabit.internal</p>
            <p className="text-[#89b4fa]">[Sync] Catchup sync verified for 4 channels (#general, #javascript, #python, #devops)</p>
            <p className="text-[#cdd6f4]">[Auth] Authenticated as @{currentUser?.username || 'Guest'}</p>
            <p className="text-[#f9e2af]">[DevBot] Standby mode active — awaiting v2.0 pair programmer runtime</p>
          </div>
        )}

        {/* VIEW 3: PROBLEMS CENTER */}
        {activeTab === 'problems' && (
          <div className="flex-1 p-3 overflow-y-auto text-xs">
            <div className="text-[#6c7086] border-b border-[#313244] pb-1 text-[11px] mb-2">
              0 Errors, 0 Warnings • Workspace clean
            </div>
            {totalChannelUnreads > 0 ? (
              <div className="p-2.5 rounded bg-[#313244]/40 border border-[#45475a] text-[#89b4fa] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#89b4fa]" />
                <span>You have {totalChannelUnreads} unread messages across active channels.</span>
              </div>
            ) : (
              <div className="text-center py-8 text-[#6c7086]">
                <p>No problems detected in workspace.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
