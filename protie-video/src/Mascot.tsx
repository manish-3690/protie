import React from 'react';
import { Img, staticFile } from 'remotion';

// =========================================================================
// 🐂 PROTIE MASCOT CONFIGURATION:
// To use your official mascot PNG:
// 1. Place your PNG at: protie-video/public/mascot.png
// 2. Set `USE_CUSTOM_MASCOT = true` (default).
//
// Set `USE_CUSTOM_MASCOT = false` to use the fallback stylized emoji placeholder.
// =========================================================================
export const USE_CUSTOM_MASCOT = true;

export interface MascotProps {
  size?: number;
  useImage?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export const Mascot: React.FC<MascotProps> = ({
  size = 320,
  useImage = USE_CUSTOM_MASCOT,
  style,
  className = '',
}) => {
  if (useImage) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{
          width: size,
          height: size,
          ...style,
        }}
      >
        <Img
          src={staticFile('mascot.png')}
          alt="Protie Mascot"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'drop-shadow(0 18px 30px rgba(23, 35, 61, 0.15))',
          }}
        />
      </div>
    );
  }

  // Placeholder Shape / Emoji Mascot
  return (
    <div
      className={`flex items-center justify-center rounded-full border-4 border-[#E8DCC8] bg-gradient-to-br from-[#FFE7BD] to-[#F2BB4B] shadow-2xl ${className}`}
      style={{
        width: size,
        height: size,
        boxShadow: '0 20px 40px rgba(217, 121, 53, 0.25)',
        ...style,
      }}
    >
      <div className="flex flex-col items-center justify-center">
        <span
          style={{
            fontSize: size * 0.48,
            lineHeight: 1,
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))',
          }}
          role="img"
          aria-label="Protie Bull Mascot"
        >
          🐂
        </span>
        <span
          className="mt-2 text-xs font-black tracking-widest text-[#17233D] uppercase"
          style={{ fontSize: Math.max(12, size * 0.05) }}
        >
          PROTIE
        </span>
      </div>
    </div>
  );
};

export default Mascot;
