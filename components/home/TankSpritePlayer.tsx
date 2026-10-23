import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  StyleSheet,
  StyleProp,
  ImageStyle,
  ViewStyle,
  ImageSourcePropType,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import {
  TANK_ANIMATIONS,
  TankAnimationMode,
  FRAME_DURATION_MS,
} from '@/constants/tankAnimationManifest';

export interface TankSpritePlayerProps {
  /**
   * Current animation mode:
   * - 'idle': Continuous 24 fps breathing/smiling loop
   * - 'sip': Plays once on food log, then calls onAnimationEnd
   * - 'flex': Plays once on 100% goal smash, then calls onAnimationEnd
   */
  mode: TankAnimationMode;
  /**
   * Width of the mascot display.
   */
  width: number;
  /**
   * Height of the mascot display.
   */
  height: number;
  /**
   * Optional custom style for the container.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Optional custom style for the image.
   */
  imageStyle?: StyleProp<ImageStyle>;
  /**
   * Callback fired when a one-shot animation ('sip' or 'flex') completes.
   */
  onAnimationEnd?: () => void;
  /**
   * Whether reduced motion is requested by system preferences.
   */
  isReducedMotion?: boolean;
  /**
   * Fallback static image if animation cannot be loaded or when custom skin is selected.
   */
  fallbackSource?: ImageSourcePropType;
  /**
   * Accessibility label for the animation.
   */
  accessibilityLabel?: string;
}

/**
 * High-performance 24 fps sprite player for Tank character animations.
 * Provides frame-accurate transitions between Idle, Sip, and Flex.
 */
export const TankSpritePlayer: React.FC<TankSpritePlayerProps> = ({
  mode,
  width,
  height,
  style,
  imageStyle,
  onAnimationEnd,
  isReducedMotion = false,
  fallbackSource,
  accessibilityLabel = 'Tank mascot animation',
}) => {
  const [frameIndex, setFrameIndex] = useState<number>(0);
  const [prevMode, setPrevMode] = useState<TankAnimationMode>(mode);
  const [hasError, setHasError] = useState<boolean>(false);
  const modeRef = useRef<TankAnimationMode>(mode);
  const onEndRef = useRef<(() => void) | undefined>(onAnimationEnd);

  // Sync refs and props safely
  useEffect(() => {
    onEndRef.current = onAnimationEnd;
  }, [onAnimationEnd]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Adjust frameIndex during render when mode changes (recommended by React docs)
  if (prevMode !== mode) {
    setPrevMode(mode);
    setFrameIndex(0);
  }

  // Reduced motion animation values (scale & fade)
  const reducedMotionScale = useSharedValue(1);
  const reducedMotionOpacity = useSharedValue(1);

  // Handle reduced motion mode transitions
  useEffect(() => {
    if (isReducedMotion && (mode === 'sip' || mode === 'flex')) {
      reducedMotionScale.value = withSequence(
        withTiming(1.08, { duration: 300 }),
        withSpring(1, { damping: 12, stiffness: 200 })
      );
      const timer = setTimeout(() => {
        onEndRef.current?.();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [mode, isReducedMotion, reducedMotionScale]);

  // Frame ticker loop for 24 fps playback
  useEffect(() => {
    if (isReducedMotion || hasError) {
      return;
    }

    const frames = TANK_ANIMATIONS[mode];
    if (!frames || !frames.length) {
      return;
    }

    let isMounted = true;
    let lastTick = Date.now();
    let currentIdx = 0;

    const intervalId = setInterval(() => {
      if (!isMounted) return;

      const now = Date.now();
      const elapsed = now - lastTick;

      if (elapsed >= FRAME_DURATION_MS) {
        lastTick = now;
        currentIdx += 1;

        if (currentIdx >= frames.length) {
          if (modeRef.current === 'idle') {
            // Loop idle continuously
            currentIdx = 0;
            setFrameIndex(0);
          } else {
            // One-shot complete (Sip or Flex)
            clearInterval(intervalId);
            onEndRef.current?.();
            return;
          }
        } else {
          setFrameIndex(currentIdx);
        }
      }
    }, Math.floor(FRAME_DURATION_MS / 2)); // Sub-tick for smoother timing

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [mode, isReducedMotion, hasError]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: reducedMotionScale.value }],
      opacity: reducedMotionOpacity.value,
    };
  });

  // Determine current image source
  const frames = TANK_ANIMATIONS[mode] || TANK_ANIMATIONS.idle;
  const clampedIndex = Math.min(frameIndex, frames.length - 1);
  const activeSource = hasError || !frames[clampedIndex]
    ? (fallbackSource || require('@/assets/mascot/tank.png'))
    : frames[clampedIndex];

  return (
    <Animated.View style={[styles.container, { width, height }, style, animatedContainerStyle]}>
      <Image
        source={activeSource}
        style={[
          styles.spriteImage,
          {
            width,
            height,
          },
          imageStyle,
        ]}
        resizeMode="contain"
        onError={() => setHasError(true)}
        accessibilityLabel={accessibilityLabel}
        accessible
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spriteImage: {
    width: '100%',
    height: '100%',
  },
});

export default TankSpritePlayer;
