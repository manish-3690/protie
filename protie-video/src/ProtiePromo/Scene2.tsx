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

export const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene entrance
  const entranceOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Scene exit into Scene 3
  const exitOpacity = interpolate(frame, [110, 120], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Counter 0g -> 150g (runs smoothly between frame 15 and 90)
  const currentGrams = interpolate(frame, [15, 90], [0, 150], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.2, 0.8, 0.2, 1),
  });

  // Progress percentage: 0% -> 100%
  const progressPercent = interpolate(frame, [15, 90], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.2, 0.8, 0.2, 1),
  });

  const isGoalReached = frame >= 90;

  // Mascot celebratory bounce when reaching 100%
  const goalSpring = spring({
    frame: frame - 90,
    fps,
    config: {
      damping: 8,
      mass: 0.5,
      stiffness: 160,
    },
  });

  // Mascot reaction wobble while protein is filling
  const reactionScale =
    frame < 90
      ? 1 + Math.sin(frame / 6) * 0.04
      : interpolate(goalSpring, [0, 1], [1, 1.12]);

  const reactionRotate =
    frame < 90
      ? Math.sin(frame / 8) * 3
      : Math.sin((frame - 90) / 4) * 4;

  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-between px-10 py-20"
      style={{
        opacity: Math.min(entranceOpacity, exitOpacity),
      }}
    >
      {/* Top Header Tag */}
      <div className="flex flex-col items-center text-center">
        <span
          className="rounded-full px-5 py-2 text-xl font-bold uppercase tracking-wider"
          style={{
            backgroundColor: colors.secondarySurface,
            color: colors.primary,
          }}
        >
          DAILY GOAL TRACKER
        </span>
        <h2
          className="mt-4 text-5xl font-black tracking-tight"
          style={{ color: colors.textPrimary }}
        >
          {isGoalReached ? 'Goal Smashed! 🏆' : 'Fueling Your Day'}
        </h2>
      </div>

      {/* Mascot Reacting Center */}
      <div className="relative flex flex-col items-center justify-center my-4">
        <div
          style={{
            transform: `scale(${reactionScale}) rotate(${reactionRotate}deg)`,
            transition: 'transform 0.05s ease-out',
          }}
        >
          <Mascot size={400} />
        </div>

        {/* Goal celebration burst pill */}
        {frame >= 90 && (
          <div
            className="absolute -top-6 rounded-full border-2 px-6 py-2 shadow-xl"
            style={{
              backgroundColor: colors.gold,
              borderColor: colors.card,
              transform: `scale(${goalSpring})`,
            }}
          >
            <span
              className="text-2xl font-black tracking-wide uppercase"
              style={{ color: colors.textPrimary }}
            >
              🎉 100% COMPLETED!
            </span>
          </div>
        )}
      </div>

      {/* Protein Meter Card */}
      <div
        className="w-full max-w-xl rounded-3xl border-2 p-8 shadow-xl"
        style={{
          backgroundColor: colors.card,
          borderColor: colors.border,
        }}
      >
        {/* Grams and Target Labels */}
        <div className="flex items-baseline justify-between mb-4">
          <div className="flex items-baseline gap-2">
            <span
              className="text-6xl font-black tracking-tight"
              style={{ color: colors.textPrimary }}
            >
              {Math.round(currentGrams)}
            </span>
            <span
              className="text-3xl font-extrabold"
              style={{ color: colors.primary }}
            >
              g
            </span>
          </div>
          <div className="text-right">
            <span
              className="text-2xl font-bold"
              style={{ color: colors.textSecondary }}
            >
              Goal: 150g
            </span>
          </div>
        </div>

        {/* Progress Bar Track */}
        <div
          className="relative h-10 w-full overflow-hidden rounded-full p-1"
          style={{
            backgroundColor: colors.secondarySurface,
          }}
        >
          {/* Animated Fill Bar */}
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.max(2, progressPercent)}%`,
              background: `linear-gradient(90deg, ${colors.gold} 0%, ${colors.primary} 100%)`,
              boxShadow: '0 4px 12px rgba(217, 121, 53, 0.4)',
            }}
          />
        </div>

        {/* Status Row */}
        <div className="mt-5 flex items-center justify-between text-xl font-bold">
          <span style={{ color: colors.textSecondary }}>Daily Progress</span>
          <span
            className="font-extrabold"
            style={{
              color: isGoalReached ? colors.primary : colors.textPrimary,
            }}
          >
            {Math.round(progressPercent)}%
          </span>
        </div>
      </div>
    </div>
  );
};
