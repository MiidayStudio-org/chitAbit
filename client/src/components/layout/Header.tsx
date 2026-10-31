import React, { useState } from 'react';
import {
  Hash,
  Menu,
  Users,
  Bot,
  Circle,
  Phone,
  Video,
  Code,
  MoreHorizontal,
  ExternalLink,
} from 'lucide-react';
import { Channel, User, OnlineUser } from '../../types';
import { getInitials } from '../../utils/chatUtils';

interface HeaderProps {
  channel: Channel | null;
  dmUser: User | null;
  onlineUsersInChannel: OnlineUser[];
  allOnlineUsers?: OnlineUser[];
  onOpenMobileSidebar: () => void;
  onOpenQuickSwitcher: () => void;
  isDevBotLive?: boolean;
}

// GitHub SVG Icon
const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

export const Header: React.FC<HeaderProps> = ({
  channel,
  dmUser,
  onlineUsersInChannel,
  allOnlineUsers = [],
  onOpenMobileSidebar,
  onOpenQuickSwitcher,
}) => {
  const [showMembersPopover, setShowMembersPopover] = useState(false);
  const [showCallNotice, setShowCallNotice] = useState<string | null>(null);

  // Compute DM User Status
  const getDMStatus = (): { status: 'Online' | 'Offline'; dotClass: string; textClass: string } => {
    if (!dmUser) return { status: 'Offline', dotClass: 'bg-zinc-600', textClass: 'text-zinc-500' };
    if (dmUser.id === 'devbot') {
      return { status: 'Online', dotClass: 'bg-emerald-500 ring-2 ring-emerald-500/30', textClass: 'text-emerald-400' };
    }
    const onlineMatch = allOnlineUsers.find((u) => u.id === dmUser.id);
    if (onlineMatch) {
      return { status: 'Online', dotClass: 'bg-emerald-500 ring-2 ring-emerald-500/30', textClass: 'text-emerald-400' };
    }
    if (dmUser.status && dmUser.status === 'Online') {
      return { status: 'Online', dotClass: 'bg-emerald-500 ring-2 ring-emerald-500/30', textClass: 'text-emerald-400' };
    }
    return { status: 'Offline', dotClass: 'bg-zinc-600', textClass: 'text-zinc-500' };
  };

  const dmStatus = getDMStatus();

  const handleCall = (type: 'Audio' | 'Video') => {
    setShowCallNotice(`${type} call initiated with ${dmUser?.displayName || channel?.name || 'peer'}`);
    setTimeout(() => setShowCallNotice(null), 3000);
  };

  return (
    <header className="h-16 px-4 bg-[#161a23] border-b border-zinc-800/80 flex items-center justify-between z-10 select-none flex-shrink-0 relative">
      {/* Toast Alert for Call */}
      {showCallNotice && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-indigo-600 text-white font-mono text-xs px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-2 z-50 animate-bounce">
          <span>{showCallNotice}</span>
        </div>
      )}

      {/* Left: Mobile hamburger & Contact / Channel Info */}
      <div className="flex items-center gap-3 truncate">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Open sidebar"
          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 lg:hidden transition-colors"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 truncate">
          {channel ? (
            <>
              {/* Circular Channel Avatar */}
              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-indigo-400 flex-shrink-0 shadow-inner">
                <Hash className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="truncate">
                <h2 className="font-bold text-sm text-zinc-100 font-sans truncate tracking-tight">
                  #{channel.name}
                </h2>
                <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>{onlineUsersInChannel.length} online</span>
                  </span>
                  {channel.description && (
                    <span className="text-zinc-500 hidden md:inline truncate max-w-xs">
                      • {channel.description}
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : dmUser ? (
            <>
              {/* Circular Avatar (rounded-full) */}
              <div className="relative flex-shrink-0">
                {dmUser.id === 'devbot' ? (
                  <div className="w-10 h-10 rounded-full bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400 shadow-sm">
                    <Bot className="w-5 h-5" />
                  </div>
                ) : (
                  <div
                    className="w-10 h-10 rounded-full text-xs border border-zinc-700 bg-zinc-900 flex items-center justify-center text-zinc-200 font-mono font-bold shadow-inner"
                    style={{
                      borderColor: dmUser.avatarColor ? `${dmUser.avatarColor}60` : undefined,
                      color: dmUser.avatarColor || undefined,
                    }}
                  >
                    {getInitials(dmUser.displayName, dmUser.username)}
                  </div>
                )}
                {/* Status Dot */}
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#161a23] ${
                    dmStatus.status === 'Online' ? 'bg-emerald-500' : 'bg-zinc-600'
                  }`}
                />
              </div>

              <div className="truncate flex flex-col">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-sm text-zinc-100 font-sans truncate">
                    {dmUser.displayName || dmUser.username}
                  </h2>
                  <span className="text-xs font-mono text-zinc-500">
                    @{dmUser.username}
                  </span>
                  {dmUser.id === 'devbot' && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/50 uppercase font-mono font-bold">
                      AI Pair
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono">
                  <span className={`flex items-center gap-1 ${dmStatus.textClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${dmStatus.dotClass}`} />
                    <span>{dmStatus.status}</span>
                  </span>
                  <span className="text-zinc-500 hidden md:inline">
                    • {dmUser.id === 'devbot' ? 'Senior Full-Stack Mentor & Debugger' : 'Direct Message'}
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Right: Utility Icons (Call, Video, Code Search, MoreHorizontal) */}
      <div className="flex items-center gap-1">
        {/* Call (Audio) */}
        <button
          type="button"
          onClick={() => handleCall('Audio')}
          title="Start voice call"
          className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors cursor-pointer"
        >
          <Phone className="w-4 h-4" />
        </button>

        {/* Video Call */}
        <button
          type="button"
          onClick={() => handleCall('Video')}
          title="Start video call"
          className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors cursor-pointer"
        >
          <Video className="w-4 h-4" />
        </button>

        {/* Code Snippet search / Quick Switcher */}
        <button
          type="button"
          onClick={onOpenQuickSwitcher}
          title="Search code / channels (Ctrl+K)"
          className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors cursor-pointer"
        >
          <Code className="w-4 h-4" />
        </button>

        {/* GitHub link button if DM */}
        {dmUser && (
          <a
            href={`https://github.com/${dmUser.githubUsername || dmUser.username}`}
            target="_blank"
            rel="noreferrer noopener"
            title={`View @${dmUser.username}'s GitHub Profile`}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
          >
            <GithubIcon className="w-4 h-4" />
          </a>
        )}

        {/* Channel Members button if channel */}
        {channel && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMembersPopover(!showMembersPopover)}
              title="Online channel members"
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors cursor-pointer"
            >
              <Users className="w-4 h-4" />
            </button>

            {showMembersPopover && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-[#161a23] border border-zinc-800 rounded-2xl shadow-2xl p-2 z-30">
                <div className="px-2.5 py-1.5 text-[11px] font-mono font-medium text-zinc-400 uppercase tracking-wider">
                  Online in #{channel.name}
                </div>
                <div className="space-y-0.5 max-h-52 overflow-y-auto">
                  {onlineUsersInChannel.map((u) => (
                    <div
                      key={u.id}
                      className="px-2.5 py-1 rounded-xl flex items-center gap-2 text-xs font-mono text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                    >
                      <Circle className="w-1.5 h-1.5 fill-emerald-500 text-emerald-500" />
                      <span>@{u.username}</span>
                      {u.id === 'devbot' && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/50 uppercase font-bold ml-auto">
                          AI
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* More Options */}
        <button
          type="button"
          onClick={onOpenQuickSwitcher}
          title="More actions"
          className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors cursor-pointer"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default Header;
