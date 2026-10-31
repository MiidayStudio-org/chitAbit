import React, { useState } from 'react';
import { User } from '../../types';
import {
  UserPlus,
  Users,
  X,
  Sparkles,
  MessageSquare,
  Bot,
  Hash,
  Check,
} from 'lucide-react';
import { getInitials } from '../../utils/chatUtils';

export interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDM: (targetUser: User) => void;
  onCreateGroup?: (name: string, description: string, memberUserIds: string[]) => Promise<{ success: boolean; error?: string }>;
  existingUsers: User[];
  currentUserId?: string;
}

export const AddContactModal: React.FC<AddContactModalProps> = ({
  isOpen,
  onClose,
  onStartDM,
  onCreateGroup,
  existingUsers,
  currentUserId,
}) => {
  const [activeTab, setActiveTab] = useState<'friend' | 'group'>('friend');

  // Tab 1: Add Friend State
  const [usernameInput, setUsernameInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tab 2: Create Group State
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [isGroupLoading, setIsGroupLoading] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter out current user from suggestions
  const suggestedUsers = existingUsers.filter((u) => u.id !== currentUserId);

  // Live matching for entered text
  const liveMatches = usernameInput.trim()
    ? suggestedUsers.filter(
        (u) =>
          u.username.toLowerCase().includes(usernameInput.toLowerCase().trim().replace(/^@/, '')) ||
          u.displayName.toLowerCase().includes(usernameInput.toLowerCase().trim())
      )
    : suggestedUsers;

  const handleAddFriendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHandle = usernameInput.trim().replace(/^@/, '');
    if (!cleanHandle) {
      setErrorMsg('Please enter a username');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      // 1. Check if user already exists in local list
      const matched = suggestedUsers.find(
        (u) => u.username.toLowerCase() === cleanHandle.toLowerCase()
      );

      if (matched) {
        onStartDM(matched);
        onClose();
        return;
      }

      // 2. Fetch or create user from backend
      const res = await fetch('/api/users/start-dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanHandle }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to connect user');
      }

      onStartDM(data.user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error adding contact');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = groupName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (!cleanName) {
      setGroupError('Group name is required');
      return;
    }

    if (!onCreateGroup) {
      setGroupError('Group creation handler not provided');
      return;
    }

    setIsGroupLoading(true);
    setGroupError(null);

    try {
      const res = await onCreateGroup(cleanName, groupDesc.trim(), selectedFriendIds);
      if (!res.success) {
        setGroupError(res.error || 'Failed to create group');
        return;
      }
      onClose();
    } catch (err: any) {
      setGroupError(err?.message || 'Failed to create group');
    } finally {
      setIsGroupLoading(false);
    }
  };

  const toggleSelectFriend = (userId: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="w-full max-w-md bg-[#161a23] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header with Title and Tabs */}
        <div className="px-5 py-4 border-b border-zinc-800/80 bg-[#12151d] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('friend')}
              className={`px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'friend'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Friend</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('group')}
              className={`px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'group'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Create Group</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab 1: Add Friend */}
        {activeTab === 'friend' && (
          <div className="p-5 space-y-4">
            <form onSubmit={handleAddFriendSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-mono font-medium text-zinc-300 mb-1.5">
                  Developer Handle / Username
                </label>
                <div className="relative flex items-center bg-[#0f1218] border border-zinc-800 focus-within:border-indigo-500 rounded-2xl px-3.5 py-2 transition-colors">
                  <span className="text-zinc-500 font-mono text-sm mr-1">@</span>
                  <input
                    type="text"
                    autoFocus
                    value={usernameInput}
                    onChange={(e) => {
                      setUsernameInput(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="Enter username to add (e.g. alice_coder)"
                    className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none font-sans"
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-red-400 font-mono bg-red-950/40 border border-red-900/50 px-3 py-1.5 rounded-xl">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading || !usernameInput.trim()}
                className="w-full py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-950/50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{isLoading ? 'Connecting...' : 'Add & Message'}</span>
              </button>
            </form>

            {/* Live Lookup Suggestions */}
            <div className="pt-2 border-t border-zinc-800/60">
              <div className="text-[11px] font-mono font-medium text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Teammates Directory ({liveMatches.length})</span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {liveMatches.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-2 rounded-2xl bg-[#0f1218]/80 hover:bg-[#0f1218] border border-zinc-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {u.id === 'devbot' ? (
                        <div className="w-8 h-8 rounded-full bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400">
                          <Bot className="w-4 h-4" />
                        </div>
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center text-zinc-200 font-mono text-xs font-bold"
                          style={{
                            borderColor: u.avatarColor ? `${u.avatarColor}60` : undefined,
                            color: u.avatarColor || undefined,
                          }}
                        >
                          {getInitials(u.displayName, u.username)}
                        </div>
                      )}

                      <div className="truncate">
                        <div className="text-xs font-semibold text-zinc-200 truncate">
                          {u.displayName || u.username}
                        </div>
                        <div className="text-[11px] font-mono text-zinc-500 truncate">
                          @{u.username}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onStartDM(u);
                        onClose();
                      }}
                      className="px-3 py-1 rounded-full bg-indigo-600/15 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-300 hover:text-white font-mono text-xs font-medium transition-all cursor-pointer flex-shrink-0"
                    >
                      Chat
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Create Group Chat */}
        {activeTab === 'group' && (
          <form onSubmit={handleCreateGroupSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-mono font-medium text-zinc-300 mb-1.5">
                Group Name
              </label>
              <div className="relative flex items-center bg-[#0f1218] border border-zinc-800 focus-within:border-indigo-500 rounded-2xl px-3.5 py-2">
                <Hash className="w-4 h-4 text-zinc-500 mr-2 flex-shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. backend-sprint"
                  className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-zinc-300 mb-1.5">
                Description (Optional)
              </label>
              <input
                type="text"
                value={groupDesc}
                onChange={(e) => setGroupDesc(e.target.value)}
                placeholder="Topic or team purpose"
                className="w-full bg-[#0f1218] border border-zinc-800 focus-within:border-indigo-500 rounded-2xl px-3.5 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none"
              />
            </div>

            {/* Friend Selection Checkboxes */}
            <div>
              <label className="block text-xs font-mono font-medium text-zinc-300 mb-1.5">
                Select Members ({selectedFriendIds.length} selected)
              </label>
              <div className="max-h-36 overflow-y-auto space-y-1 bg-[#0f1218] p-2 rounded-2xl border border-zinc-800/80">
                {suggestedUsers.map((u) => {
                  const isChecked = selectedFriendIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleSelectFriend(u.id)}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                        isChecked ? 'bg-indigo-950/60 text-white' : 'hover:bg-zinc-800/50 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div
                          className="w-6 h-6 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center font-mono text-[10px]"
                          style={{
                            borderColor: u.avatarColor,
                            color: u.avatarColor,
                          }}
                        >
                          {getInitials(u.displayName, u.username)}
                        </div>
                        <span className="text-xs truncate font-medium">
                          {u.displayName || u.username}
                        </span>
                      </div>

                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                          isChecked
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'border-zinc-700 bg-zinc-900'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {groupError && (
              <p className="text-xs text-red-400 font-mono bg-red-950/40 border border-red-900/50 px-3 py-1.5 rounded-xl">
                {groupError}
              </p>
            )}

            <button
              type="submit"
              disabled={isGroupLoading || !groupName.trim()}
              className="w-full py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-950/50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>{isGroupLoading ? 'Creating...' : 'Create Group & Chat'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddContactModal;
