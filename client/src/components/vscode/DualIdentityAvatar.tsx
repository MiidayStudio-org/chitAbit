import React, { useState } from 'react';
import { FileIcon } from '../../utils/fileIcons';

export interface DualIdentityAvatarProps {
  avatarUrl?: string | null;
  fileIcon?: string | null;
  size?: number;
  className?: string;
  isBot?: boolean;
  alt?: string;
  showIndicatorDot?: boolean;
  title?: string;
}

/**
 * DualIdentityAvatar:
 * - Renders the developer's language badge (.ts, .rs, .py, etc.) as the default visual face.
 * - When an uploaded device image (Base64 data URL or URL) is present, adds a green indicator dot
 *   and activates an inline-CSS powered 3D flip card animation on hover (rotateY(180deg))
 *   that reliably reveals the user's uploaded local photo cross-browser.
 */
export const DualIdentityAvatar: React.FC<DualIdentityAvatarProps> = ({
  avatarUrl,
  fileIcon = 'ts',
  size = 40,
  className = '',
  isBot = false,
  alt = 'User avatar',
  showIndicatorDot = true,
  title,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const hasImage = Boolean(avatarUrl && avatarUrl.trim().length > 0);

  const iconSize = Math.max(12, Math.round(size * 0.58));
  const dotSize = Math.max(6, Math.min(10, Math.round(size * 0.22)));

  const computedTitle =
    title ||
    (hasImage
      ? `${alt} (Dual identity active: hover to reveal photo)`
      : `${alt} (${fileIcon || 'ts'})`);

  const handleMouseEnter = () => {
    if (hasImage) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (hasImage) {
      setIsHovered(false);
    }
  };

  return (
    <div
      className={`relative inline-block select-none flex-shrink-0 ${
        hasImage ? 'cursor-pointer' : ''
      } ${className}`}
      style={{
        width: size,
        height: size,
        perspective: '1000px',
      }}
      title={computedTitle}
      data-testid="dual-identity-avatar"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 3D Rotating Container */}
      <div
        className="w-full h-full relative"
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.5s ease',
          transform: hasImage && isHovered ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* FRONT FACE: Developer Language Badge */}
        <div
          className="absolute inset-0 w-full h-full rounded-full bg-[#181825] border border-[#313244] flex items-center justify-center overflow-hidden shadow-sm"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          <FileIcon
            name={fileIcon || 'ts'}
            isBot={isBot}
            size={iconSize}
          />

          {/* Green Indicator Dot when local photo is linked */}
          {hasImage && showIndicatorDot && (
            <span
              className="absolute top-0 right-0 rounded-full bg-[#a6e3a1] border border-[#181825] shadow-sm pointer-events-none"
              style={{
                width: dotSize,
                height: dotSize,
              }}
              title="Custom photo linked"
            />
          )}
        </div>

        {/* BACK FACE: Uploaded Local Device Photo */}
        {hasImage && (
          <div
            className="absolute inset-0 w-full h-full rounded-full border-2 border-[#cba6f7] overflow-hidden bg-[#11111b] shadow-md flex items-center justify-center pointer-events-none"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <img
              src={avatarUrl!}
              alt={alt}
              className="w-full h-full object-cover pointer-events-none"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
