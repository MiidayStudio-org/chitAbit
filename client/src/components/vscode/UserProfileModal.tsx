import React, { useState, useEffect } from 'react';
import { X, Settings, MessageSquare, Share2, Check, Sparkles, Shield, Code2 } from 'lucide-react';
import { DualIdentityAvatar } from './DualIdentityAvatar';

export interface ProfileModalUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string | null;
  fileIcon?: string;
  status?: string;
  bio?: string;
  isBot?: boolean;
  role?: 'Core' | 'Bot' | 'Member';
}

export interface UserProfileModalProps {
  isOpen: boolean;
  user: ProfileModalUser | null;
  currentUserId?: string;
  onClose: () => void;
  onEditProfile?: () => void;
  onOpenMessage?: (userId: string, username: string) => void;
}

/**
 * Centered UserProfileModal:
 * - Populates dynamically for both other users and the current user.
 * - Renders a centered backdrop-blurred overlay.
 * - Features a prominent 3D flip DualIdentityAvatar (language badge default, photo on hover/tap).
 * - Context-aware action buttons:
 *   * If My Profile: [Edit Profile (Settings icon)] + [Share Profile (Share icon)]
 *   * If Another User: [Message (Message icon)] + [Share Profile (Share icon)]
 */
export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  user,
  currentUserId,
  onClose,
  onEditProfile,
  onOpenMessage,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const isMe = Boolean(currentUserId && user.id === currentUserId);

  const handleShareProfile = async () => {
    const profileUrl = `${window.location.origin}/#user=${encodeURIComponent(user.username)}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(profileUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = profileUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy profile link:', err);
    }
  };

  const statusLabel = user.status?.trim() || (isMe ? 'Online • Coding' : 'Active');
  const fileExt = user.fileIcon ? `.${user.fileIcon.replace(/^\./, '')}` : '.ts';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-profile-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#181825] border border-[#313244] shadow-2xl rounded-2xl overflow-hidden text-[#cdd6f4] font-mono text-xs flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Top Accent Banner (Catppuccin Mocha Gradient) */}
        <div className="h-24 w-full bg-gradient-to-r from-[#cba6f7]/25 via-[#89b4fa]/20 to-[#a6e3a1]/25 border-b border-[#313244] relative flex items-start justify-end p-3">
          {/* Close 'X' Button */}
          <button
            type="button"
            title="Close Profile (Esc)"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#11111b]/80 hover:bg-[#313244] text-[#a6adc8] hover:text-[#cdd6f4] border border-[#313244] flex items-center justify-center transition-all cursor-pointer shadow"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar & Identity Header */}
        <div className="px-6 pb-6 pt-0 relative flex flex-col">
          {/* Dual-Identity Avatar (Positioned over the banner) */}
          <div className="-mt-11 mb-3 flex items-end justify-between">
            <div className="relative p-1 rounded-full bg-[#181825] border-2 border-[#313244] shadow-xl inline-block">
              <DualIdentityAvatar
                avatarUrl={user.avatarUrl}
                fileIcon={user.fileIcon || 'ts'}
                size={76}
                isBot={user.isBot}
                alt={user.displayName || user.username}
                showIndicatorDot={true}
              />
            </div>

            {/* Status Pill Indicator */}
            <div className="mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-sans font-semibold bg-[#11111b] border border-[#313244] text-[#a6e3a1] shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#a6e3a1] animate-pulse" />
                <span className="truncate max-w-[170px]">{statusLabel}</span>
              </span>
            </div>
          </div>

          {/* User Names & Badges */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2
                id="user-profile-title"
                className="text-lg font-bold text-[#cdd6f4] font-sans truncate"
              >
                {user.displayName || user.username}
              </h2>

              {isMe && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#cba6f7]/20 text-[#cba6f7] border border-[#cba6f7]/40">
                  You
                </span>
              )}

              {user.isBot && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#f9e2af]/20 text-[#f9e2af] border border-[#f9e2af]/40 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Bot
                </span>
              )}

              {user.role === 'Core' && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#89b4fa]/20 text-[#89b4fa] border border-[#89b4fa]/40 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Core
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-[#a6adc8]">
              <span>@{user.username}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-[#cba6f7] font-semibold">
                <Code2 className="w-3.5 h-3.5" />
                <span>{fileExt} stack</span>
              </span>
            </div>
          </div>

          {/* Developer Bio / Readme Container */}
          <div className="mt-4 p-3.5 rounded-xl bg-[#11111b] border border-[#313244] space-y-1.5 shadow-inner">
            <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#6c7086]">
              Developer Readme / Bio
            </div>
            <p className="text-xs font-sans text-[#bac2de] leading-relaxed whitespace-pre-wrap break-words">
              {user.bio?.trim() ? (
                user.bio
              ) : (
                <span className="text-[#6c7086] italic">
                  {isMe
                    ? 'No bio set yet. Click "Edit Profile" below to customize your developer readme.'
                    : 'No developer bio provided.'}
                </span>
              )}
            </p>
          </div>

          {/* Dual-Identity Hint / Explanation */}
          <div className="mt-2.5 px-1 flex items-center justify-between text-[10px] font-mono text-[#6c7086]">
            <span>Dual-Identity Avatar:</span>
            <span className="text-[#a6e3a1]">
              {user.avatarUrl ? 'Hover or tap avatar to flip' : 'Language symbol only'}
            </span>
          </div>

          {/* Context-Aware Action Buttons */}
          <div className="mt-5 pt-4 border-t border-[#313244] flex items-center gap-3">
            {isMe ? (
              <>
                {/* Button 1: Edit Profile (opens Settings > Account & Profile) */}
                <button
                  type="button"
                  id="profile-modal-edit-btn"
                  onClick={() => {
                    onClose();
                    onEditProfile?.();
                  }}
                  className="flex-1 py-2 px-3.5 rounded-xl bg-[#cba6f7] hover:bg-[#b4befe] text-[#11111b] font-bold text-xs font-sans flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-[0.98]"
                >
                  <Settings className="w-4 h-4 text-[#11111b]" />
                  <span>Edit Profile</span>
                </button>

                {/* Button 2: Share Profile */}
                <button
                  type="button"
                  id="profile-modal-share-btn"
                  onClick={handleShareProfile}
                  className="flex-1 py-2 px-3.5 rounded-xl bg-[#313244] hover:bg-[#45475a] text-[#cdd6f4] font-semibold text-xs font-sans flex items-center justify-center gap-2 cursor-pointer transition-all border border-[#45475a] active:scale-[0.98]"
                >
                  {isCopied ? (
                    <Check className="w-4 h-4 text-[#a6e3a1]" />
                  ) : (
                    <Share2 className="w-4 h-4 text-[#89b4fa]" />
                  )}
                  <span>{isCopied ? 'Copied!' : 'Share Profile'}</span>
                </button>
              </>
            ) : (
              <>
                {/* Button 1: Message (opens/focuses direct message) */}
                <button
                  type="button"
                  id="profile-modal-message-btn"
                  onClick={() => {
                    onClose();
                    onOpenMessage?.(user.id, user.username);
                  }}
                  className="flex-1 py-2 px-3.5 rounded-xl bg-[#cba6f7] hover:bg-[#b4befe] text-[#11111b] font-bold text-xs font-sans flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-[0.98]"
                >
                  <MessageSquare className="w-4 h-4 text-[#11111b]" />
                  <span>Message</span>
                </button>

                {/* Button 2: Share Profile */}
                <button
                  type="button"
                  id="profile-modal-share-btn"
                  onClick={handleShareProfile}
                  className="flex-1 py-2 px-3.5 rounded-xl bg-[#313244] hover:bg-[#45475a] text-[#cdd6f4] font-semibold text-xs font-sans flex items-center justify-center gap-2 cursor-pointer transition-all border border-[#45475a] active:scale-[0.98]"
                >
                  {isCopied ? (
                    <Check className="w-4 h-4 text-[#a6e3a1]" />
                  ) : (
                    <Share2 className="w-4 h-4 text-[#89b4fa]" />
                  )}
                  <span>{isCopied ? 'Copied!' : 'Share Profile'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
