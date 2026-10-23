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

export const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene Entrance
  const entranceOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Mascot spring settle
  const mascotSpring = spring({
    frame,
    fps,
    config: {
      damping: 12,
      mass: 0.7,
      stiffness: 120,
    },
  });

  // Logo animation
  const logoSpring = spring({
    frame: frame - 10,
    fps,
    config: {
      damping: 10,
      mass: 0.6,
      stiffness: 140,
    },
  });

  // Tagline animation: "Track protein. Feel good."
  const tagOpacity = interpolate(frame, [22, 45], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tagTranslateY = interpolate(frame, [22, 45], [30, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // CTA Pill animation
  const ctaSpring = spring({
    frame: frame - 32,
    fps,
    config: {
      damping: 11,
      mass: 0.6,
      stiffness: 130,
    },
  });

  // Smooth final outro
  const outroOpacity = interpolate(frame, [78, 90], [1, 0.95], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-between px-10 py-24"
      style={{
        opacity: entranceOpacity * outroOpacity,
      }}
    >
      {/* Top Spacer / Subtle Tag */}
      <div className="flex items-center gap-2">
        <span className="text-3xl">✨</span>
      </div>

      {/* Center Mascot & Brand Block */}
      <div className="flex flex-col items-center text-center">
        {/* Mascot */}
        <div
          style={{
            transform: `scale(${mascotSpring})`,
          }}
        >
          <Mascot size={420} />
        </div>

        {/* Brand Name "Protie" */}
        <div
          className="mt-8 flex items-baseline justify-center"
          style={{
            transform: `scale(${logoSpring})`,
          }}
        >
          <span
            className="text-8xl font-black tracking-tight"
            style={{ color: colors.textPrimary }}
          >
            Protie
          </span>
          <span
            className="ml-1 inline-block h-5 w-5 rounded-full"
            style={{ backgroundColor: colors.primary }}
          />
        </div>

        {/* Tagline: "Track protein. Feel good." */}
        <p
          className="mt-4 text-4xl font-bold tracking-tight"
          style={{
            color: colors.textSecondary,
            opacity: tagOpacity,
            transform: `translateY(${tagTranslateY}px)`,
          }}
        >
          Track protein. Feel good.
        </p>
      </div>

      {/* Bottom CTA Pill */}
      <div
        className="flex flex-col items-center"
        style={{
          transform: `scale(${ctaSpring})`,
        }}
      >
        <div
          className="flex items-center justify-center rounded-full px-12 py-6 shadow-2xl"
          style={{
            backgroundColor: colors.primary,
            boxShadow: '0 16px 36px rgba(217, 121, 53, 0.35)',
          }}
        >
          <span
            className="text-3xl font-extrabold tracking-wide uppercase"
            style={{ color: colors.white }}
          >
            Get Started Today 🚀
          </span>
        </div>

        <p
          className="mt-4 text-xl font-semibold"
          style={{ color: colors.textSecondary }}
        >
          Available for iOS & Android
        </p>
      </div>
    </div>
  );
};
