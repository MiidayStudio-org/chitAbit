import React from 'react';
import { User, ActiveChat } from '../../types';
import { Bot, Hash, Users, UserPlus, Sparkles, ArrowRight } from 'lucide-react';
import { getInitials } from '../../utils/chatUtils';

interface HomeViewProps {
  currentUser: User | null;
  friends: User[];
  onlineUsers: { id: string }[];
  onOpenAddFriend: () => void;
  onOpenSettings: () => void;
  onSelectChat: (chat: ActiveChat) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  currentUser,
  friends,
  onlineUsers,
  onOpenAddFriend,
  onOpenSettings,
  onSelectChat,
}) => {
  const onlineFriendIds = new Set(onlineUsers.map((u) => u.id));
  const onlineFriends = friends.filter((f) => onlineFriendIds.has(f.id));

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#13161c] overflow-y-auto select-none transition-colors">
      {/* Top Header */}
      <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Home</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Welcome back to chitAbit</p>
        </div>
        <button
          type="button"
          onClick={onOpenAddFriend}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#06C755]/10 hover:bg-[#06C755]/20 text-[#06C755] text-xs font-semibold cursor-pointer transition-all"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add Friends</span>
        </button>
      </div>

      <div className="p-6 max-w-2xl mx-auto w-full space-y-6">
        {/* 1. Profile Hero Card */}
        <div className="bg-gradient-to-br from-emerald-50 to-green-50/40 dark:from-zinc-900 dark:to-zinc-850 p-6 rounded-3xl border border-emerald-100 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="relative">
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.displayName}
                className="w-20 h-20 rounded-full object-cover ring-4 ring-white dark:ring-zinc-800 shadow-md"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-md ring-4 ring-white dark:ring-zinc-800"
                style={{ backgroundColor: currentUser?.avatarColor || '#06C755' }}
              >
                {getInitials(currentUser?.displayName || currentUser?.username || '?')}
              </div>
            )}
            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-[#06C755] ring-2 ring-white dark:ring-zinc-900" />
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 justify-center sm:justify-start">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                {currentUser?.displayName || currentUser?.username}
              </h2>
              <span className="text-xs font-medium text-zinc-400">@{currentUser?.username}</span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1 italic">
              "{currentUser?.bio || 'Building amazing things on chitAbit 🚀'}"
            </p>
            <div className="mt-3 flex items-center justify-center sm:justify-start gap-2">
              <button
                type="button"
                onClick={onOpenSettings}
                className="text-xs font-semibold text-[#06C755] hover:underline cursor-pointer"
              >
                Edit Profile & Settings
              </button>
            </div>
          </div>
        </div>

        {/* 2. Friends & Online Status Summary */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Friends Summary</h3>
                <p className="text-xs text-zinc-400">
                  {friends.length} registered friend{friends.length === 1 ? '' : 's'} •{' '}
                  <span className="text-[#06C755] font-semibold">{onlineFriends.length} online</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenAddFriend}
              className="text-xs font-medium text-[#06C755] hover:underline cursor-pointer"
            >
              Find More
            </button>
          </div>

          {friends.length === 0 ? (
            <div className="text-center py-6 px-4 bg-zinc-50 dark:bg-zinc-850 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                You don't have any friends added yet.
              </p>
              <button
                type="button"
                onClick={onOpenAddFriend}
                className="mt-3 px-4 py-2 bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Add Your First Friend
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {friends.slice(0, 10).map((f) => {
                const isOnline = onlineFriendIds.has(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() =>
                      onSelectChat({
                        type: 'dm',
                        id: f.id,
                        name: f.username,
                        displayName: f.displayName || f.username,
                        avatarColor: f.avatarColor,
                        avatarUrl: f.avatarUrl,
                        status: isOnline ? 'Online' : 'Offline',
                        bio: f.bio,
                      })
                    }
                    className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 transition-all cursor-pointer group"
                  >
                    <div className="relative">
                      {f.avatarUrl ? (
                        <img
                          src={f.avatarUrl}
                          alt={f.displayName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ backgroundColor: f.avatarColor || '#06C755' }}
                        >
                          {getInitials(f.displayName || f.username)}
                        </div>
                      )}
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-zinc-800 ${
                          isOnline ? 'bg-[#06C755]' : 'bg-zinc-400'
                        }`}
                      />
                    </div>
                    <div className="text-left">
                      <span className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-[#06C755] transition-colors">
                        {f.displayName || f.username}
                      </span>
                      <span className="block text-[10px] text-zinc-400">
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Featured Channels & DevBot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* DevBot Shortcut */}
          <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-[#06C755]/15 text-[#06C755] flex items-center justify-center mb-3">
                <Bot className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                DevBot AI Assistant
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Your dedicated pair programmer. Ask coding questions, debug bugs, and get instant code explanations.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onSelectChat({
                  type: 'dm',
                  id: 'devbot',
                  name: 'devbot',
                  displayName: 'DevBot (AI Assistant)',
                  avatarColor: '#06C755',
                  isBot: true,
                  status: 'Online',
                  bio: 'Senior AI Pair Programmer & Debugger 🤖',
                })
              }
              className="mt-4 flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-semibold transition-all cursor-pointer shadow-sm shadow-[#06C755]/20"
            >
              <span>Chat with DevBot</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* #general Shortcut */}
          <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                <Hash className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-zinc-900 dark:text-white">
                #general Community
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                The central developer hangout for all registered members. Chat live and mention @devbot for group AI assistance.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onSelectChat({
                  type: 'channel',
                  id: 'general',
                  name: 'general',
                  displayName: '#general',
                  description: 'General discussion for all chitAbit members',
                })
              }
              className="mt-4 flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
            >
              <span>Join #general</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
