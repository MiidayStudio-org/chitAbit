import React from 'react';
import { UserPlus, Hash, X, Check } from 'lucide-react';
import { FriendRequest } from '../../types';

export interface ChannelInvite {
  id: string;
  channelId: string;
  channelName: string;
  inviterUsername: string;
  timestamp?: number;
}

export interface InviteToastProps {
  friendRequests: FriendRequest[];
  channelInvites?: ChannelInvite[];
  onRespondFriendRequest: (requestId: string, action: 'accept' | 'decline') => void;
  onRespondChannelInvite?: (inviteId: string, action: 'accept' | 'decline') => void;
  onDismissToast?: (id: string) => void;
}

export const InviteToast: React.FC<InviteToastProps> = ({
  friendRequests,
  channelInvites = [],
  onRespondFriendRequest,
  onRespondChannelInvite,
  onDismissToast,
}) => {
  // Show the latest pending notification
  const latestFriendReq = friendRequests[friendRequests.length - 1];
  const latestChannelInvite = channelInvites[channelInvites.length - 1];

  if (!latestFriendReq && !latestChannelInvite) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-8 right-6 z-50 w-84 bg-[#1e1e2e] border-2 border-[#cba6f7] rounded-lg shadow-2xl p-3.5 text-[#cdd6f4] font-mono text-xs animate-in slide-in-from-bottom-4 duration-200"
    >
      {/* Friend Request Toast */}
      {latestFriendReq && (
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#313244] mb-2.5">
            <div className="flex items-center gap-1.5 text-[#cba6f7] font-semibold">
              <UserPlus className="w-3.5 h-3.5" />
              <span>Incoming Friend Invite</span>
            </div>
            {onDismissToast && (
              <button
                type="button"
                onClick={() => onDismissToast(latestFriendReq.id)}
                className="text-[#6c7086] hover:text-[#cdd6f4] p-0.5 rounded cursor-pointer"
                title="Dismiss Notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Details */}
          <div className="mb-3 text-[12px] text-[#a6adc8]">
            <span className="text-[#89b4fa] font-bold">@{latestFriendReq.sender_username}</span> wants to connect with you on ChatAbit.
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onRespondFriendRequest(latestFriendReq.id, 'decline')}
              className="px-2.5 py-1 rounded bg-[#313244] hover:bg-[#45475a] text-[#f38ba8] font-sans font-medium text-xs transition-colors cursor-pointer flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              <span>Decline</span>
            </button>
            <button
              type="button"
              onClick={() => onRespondFriendRequest(latestFriendReq.id, 'accept')}
              className="px-3 py-1 rounded bg-[#cba6f7] hover:bg-[#b4befe] text-[#11111b] font-sans font-bold text-xs transition-colors cursor-pointer shadow flex items-center gap-1"
            >
              <Check className="w-3 h-3 stroke-[2.5]" />
              <span>Accept</span>
            </button>
          </div>
        </div>
      )}

      {/* Channel Invite Toast (if present and no friend request) */}
      {!latestFriendReq && latestChannelInvite && (
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#313244] mb-2.5">
            <div className="flex items-center gap-1.5 text-[#89b4fa] font-semibold">
              <Hash className="w-3.5 h-3.5" />
              <span>Channel Invitation</span>
            </div>
            {onDismissToast && (
              <button
                type="button"
                onClick={() => onDismissToast(latestChannelInvite.id)}
                className="text-[#6c7086] hover:text-[#cdd6f4] p-0.5 rounded cursor-pointer"
                title="Dismiss Notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Details */}
          <div className="mb-3 text-[12px] text-[#a6adc8]">
            <span className="text-[#89b4fa] font-bold">@{latestChannelInvite.inviterUsername}</span> invited you to join <span className="text-[#a6e3a1] font-bold">#{latestChannelInvite.channelName}</span>.
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            {onRespondChannelInvite && (
              <>
                <button
                  type="button"
                  onClick={() => onRespondChannelInvite(latestChannelInvite.id, 'decline')}
                  className="px-2.5 py-1 rounded bg-[#313244] hover:bg-[#45475a] text-[#f38ba8] font-sans font-medium text-xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  <span>Decline</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRespondChannelInvite(latestChannelInvite.id, 'accept')}
                  className="px-3 py-1 rounded bg-[#89b4fa] hover:bg-[#b4befe] text-[#11111b] font-sans font-bold text-xs transition-colors cursor-pointer shadow flex items-center gap-1"
                >
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>Join</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
