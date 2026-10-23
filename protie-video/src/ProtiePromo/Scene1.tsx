import React from 'react';
import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Mascot } from '../Mascot';
import { colors } from '../theme';

export const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Bouncy spring pop-in for the Protie mascot
  const mascotSpring = spring({
    frame,
    fps,
    config: {
      damping: 10,
      mass: 0.6,
      stiffness: 130,
    },
  });

  // Subtle floating wobble after landing
  const floatY = Math.sin((frame - 30) / 10) * 8;
  const mascotScale = interpolate(mascotSpring, [0, 1], [0.2, 1]);
  const mascotOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Text "Hit your protein goal" animation
  const textOpacity = interpolate(frame, [20, 45], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textTranslateY = interpolate(frame, [20, 45], [40, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Top pill badge animation
  const badgeOpacity = interpolate(frame, [8, 25], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Smooth exit transition into Scene 2
  const exitOpacity = interpolate(frame, [80, 90], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-between px-12 py-24"
      style={{ opacity: exitOpacity }}
    >
      {/* Top Brand Pill */}
      <div
        className="flex items-center gap-3 rounded-full border-2 px-6 py-3 shadow-sm"
        style={{
          opacity: badgeOpacity,
          backgroundColor: colors.card,
          borderColor: colors.border,
        }}
      >
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: colors.primary }}
        />
        <span
          className="text-2xl font-extrabold tracking-widest uppercase"
          style={{ color: colors.textPrimary }}
        >
          PROTIE APP
        </span>
      </div>

      {/* Center Mascot with Spring Pop-In */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <div
          style={{
            transform: `scale(${mascotScale}) translateY(${frame > 25 ? floatY : 0}px)`,
            opacity: mascotOpacity,
          }}
        >
          <Mascot size={460} />
        </div>
      </div>

      {/* Bottom Hero Message: "Hit your protein goal" */}
      <div
        className="flex flex-col items-center text-center"
        style={{
          opacity: textOpacity,
          transform: `translateY(${textTranslateY}px)`,
        }}
      >
        <h1
          className="text-6xl font-black tracking-tight leading-tight"
          style={{ color: colors.textPrimary }}
        >
          Hit your <span style={{ color: colors.primary }}>protein goal</span>
        </h1>
        <p
          className="mt-4 text-3xl font-semibold"
          style={{ color: colors.textSecondary }}
        >
          Simple, joyful daily tracking
        </p>
      </div>
    </div>
  );
};
