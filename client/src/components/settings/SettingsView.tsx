import React, { useState } from 'react';
import { User } from '../../types';
import { Moon, Sun, LogOut, Upload, Check, Loader2, Palette } from 'lucide-react';
import { getInitials } from '../../utils/chatUtils';

interface SettingsViewProps {
  currentUser: User | null;
  onUpdateProfile: (updates: {
    displayName?: string;
    bio?: string;
    status?: string;
    avatarColor?: string;
    avatarUrl?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const PRESET_COLORS = [
  '#06C755', // LINE Green
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onUpdateProfile,
  onLogout,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [avatarColor, setAvatarColor] = useState(currentUser?.avatarColor || '#06C755');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage({ text: 'Avatar file exceeds 5MB limit', type: 'error' });
      return;
    }

    setIsUploading(true);
    setStatusMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMessage({ text: data.error || 'Upload failed', type: 'error' });
      } else {
        setAvatarUrl(data.url);
        setStatusMessage({ text: 'Image uploaded. Click "Save Changes" to apply.', type: 'success' });
      }
    } catch (err: any) {
      setStatusMessage({ text: err?.message || 'Network error during upload', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    const res = await onUpdateProfile({
      displayName: displayName.trim() || undefined,
      bio: bio.trim() || undefined,
      avatarColor,
      avatarUrl: avatarUrl || undefined,
    });

    setIsSaving(false);
    if (res.success) {
      setStatusMessage({ text: 'Profile updated successfully!', type: 'success' });
    } else {
      setStatusMessage({ text: res.error || 'Failed to update profile', type: 'error' });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#13161c] overflow-y-auto select-none transition-colors">
      {/* Top Header */}
      <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Settings</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Customize your profile and app preferences</p>
        </div>
      </div>

      <div className="p-6 max-w-xl mx-auto w-full space-y-6">
        {statusMessage && (
          <div
            className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#06C755] border border-emerald-200 dark:border-emerald-800/40'
                : 'bg-red-50 dark:bg-red-950/40 text-red-500 border border-red-200 dark:border-red-800/40'
            }`}
          >
            {statusMessage.type === 'success' && <Check className="w-4 h-4" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* 1. Profile Editing Card */}
        <form onSubmit={handleSave} className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-xs">
            Edit Profile
          </h2>

          {/* Avatar and File Upload */}
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-zinc-100 dark:ring-zinc-800 shadow-md"
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-md ring-4 ring-zinc-100 dark:ring-zinc-800"
                  style={{ backgroundColor: avatarColor }}
                >
                  {getInitials(displayName || currentUser?.username || '?')}
                </div>
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2 text-center sm:text-left">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold cursor-pointer transition-all">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Avatar Photo</span>
                <input
                  id="avatar-file-upload-input"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileUpload}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-zinc-400">
                Max 5 MB. PNG, JPG, GIF, WebP supported.
              </p>
            </div>
          </div>

          {/* Color Palette */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              <span>Or Choose Avatar Color</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setAvatarColor(c);
                    setAvatarUrl('');
                  }}
                  className={`w-7 h-7 rounded-full cursor-pointer transition-transform hover:scale-110 flex items-center justify-center ${
                    avatarColor === c && !avatarUrl ? 'ring-2 ring-offset-2 ring-zinc-900 dark:ring-white scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {avatarColor === c && !avatarUrl && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Display Name Input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
              Display Name
            </label>
            <input
              id="settings-display-name-input"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Alex Rivera"
              className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-[#06C755] focus:ring-2 focus:ring-[#06C755]/20 transition-all"
            />
          </div>

          {/* Status Message (Bio) Input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
              Status Message / Bio
            </label>
            <input
              id="settings-bio-input"
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Coding in React & TypeScript 💻"
              className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-[#06C755] focus:ring-2 focus:ring-[#06C755]/20 transition-all"
            />
          </div>

          <button
            id="settings-save-profile-btn"
            type="submit"
            disabled={isSaving}
            className="w-full py-2.5 bg-[#06C755] hover:bg-[#05b34c] disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-[#06C755]/20 transition-all"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>Save Changes</span>
          </button>
        </form>

        {/* 2. Appearance & Theme */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-xs">
            Appearance
          </h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200">
                {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </div>
              <div>
                <span className="text-sm font-semibold text-zinc-900 dark:text-white block">
                  Dark Mode
                </span>
                <span className="text-xs text-zinc-400 block">
                  {isDarkMode ? 'Dark theme enabled' : 'Clean white/light theme enabled'}
                </span>
              </div>
            </div>

            <button
              id="theme-toggle-btn"
              type="button"
              onClick={onToggleDarkMode}
              className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer ${
                isDarkMode ? 'bg-[#06C755]' : 'bg-zinc-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  isDarkMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 3. Account Information & Logout */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-xs">
            Account
          </h2>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-400">Username</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">@{currentUser?.username}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-400">User ID</span>
              <span className="font-mono text-zinc-500 text-[11px]">{currentUser?.id}</span>
            </div>
          </div>

          <button
            id="settings-logout-btn"
            type="button"
            onClick={onLogout}
            className="w-full mt-2 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/60 text-red-600 dark:text-red-400 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all border border-red-200/60 dark:border-red-900/40"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out of chitAbit</span>
          </button>
        </div>
      </div>
    </div>
  );
};
