import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Image,
  Pressable,
  useWindowDimensions,
  StyleProp,
  ViewStyle,
  Platform,
  ImageSourcePropType,
} from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { theme } from '@/constants/theme';
import { triggerLightHaptic, triggerSuccessHaptic } from '@/components/utils/haptics';
import { ConfettiOverlay } from '@/components/home/ConfettiOverlay';
import { getSkinAssets, DEFAULT_SKIN_ID, getReactionAsset } from '@/constants/mascotSkins';
import { getSelectedSkinId } from '@/store/skinStorage';
import { TankSpritePlayer } from '@/components/home/TankSpritePlayer';

export interface TankProgressMascotProps {
  /**
   * Daily progress percentage (0 to 100+).
   */
  progressPercent: number;
  /**
   * Optional total protein consumed today in grams.
   */
  proteinConsumed?: number;
  /**
   * Optional daily protein goal in grams.
   */
  dailyGoal?: number;
  /**
   * User's preferred protein unit ('g' | 'oz').
   */
  proteinUnit?: 'g' | 'oz';
  /**
   * Optional custom size override. If omitted, uses ~55% of screen height.
   */
  size?: number;
  /**
   * Optional container style.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Optional mascot skin identifier (e.g. 'classic', 'gym', 'chef', 'explorer', 'hoodie', 'dhoti', 'astronaut').
   */
  skinId?: string;
  /**
   * Optional callback when Tank is pressed.
   */
  onPress?: () => void;
  /**
   * Explicitly triggers the goal-smashed celebration (Flex animation, confetti, banner).
   */
  triggerCelebration?: boolean;
  /**
   * Explicitly triggers the Sip animation when a food log is saved.
   */
  triggerSip?: boolean;
  /**
   * Optional ID of the food item that was just logged (e.g. 'whey', 'eggs', 'chicken').
   */
  loggedFoodId?: string;
  /**
   * Callback fired when Sip animation completes.
   */
  onSipComplete?: () => void;
  /**
   * Callback fired when Flex animation completes.
   */
  onFlexComplete?: () => void;
}


/**
 * Generate a smooth repeating sine wave path:
 * wavelength = 60px, amplitude = 4px, centered at y = 6px.
 */
function generateWavePath(totalWidth: number, wavelength: number = 60, amplitude: number = 4): string {
  const midY = 6;
  let d = `M 0 ${midY}`;
  const segments = Math.ceil(totalWidth / wavelength) + 2;

  for (let i = 0; i < segments; i++) {
    const startX = i * wavelength;
    const qx = startX + wavelength / 4;
    const qy = midY - amplitude;
    const midX = startX + wavelength / 2;
    const endX = startX + wavelength;

    d += ` Q ${qx} ${qy}, ${midX} ${midY} T ${endX} ${midY}`;
  }
  return d;
}

const RNMaskedView = MaskedView as unknown as React.ComponentType<{
  style?: StyleProp<ViewStyle>;
  maskElement: React.ReactElement;
  pointerEvents?: 'none' | 'box-none' | 'box-only' | 'auto';
  children: React.ReactNode;
}>;

/**
 * Cross-platform silhouette masking: clips wave line strictly to character's alpha mask.
 */
const SilhouetteMaskedWave: React.FC<{
  targetWidth: number;
  targetHeight: number;
  maskSource: ImageSourcePropType;
  children: React.ReactNode;
}> = ({
  targetWidth,
  targetHeight,
  maskSource,
  children,
}) => {
  if (Platform.OS === 'web') {
    let maskUri = '';
    try {
      if (typeof maskSource === 'string') {
        maskUri = maskSource;
      } else if (typeof (maskSource as Record<string, unknown>)?.default === 'string') {
        maskUri = (maskSource as Record<string, unknown>).default as string;
      } else if ((maskSource as Record<string, unknown>)?.uri) {
        maskUri = (maskSource as Record<string, unknown>).uri as string;
      } else if ((maskSource as Record<string, unknown>)?.src) {
        maskUri = (maskSource as Record<string, unknown>).src as string;
      } else {
        const resolved = Image.resolveAssetSource(maskSource);
        if (resolved?.uri) {
          maskUri = resolved.uri;
        }
      }
    } catch {
      maskUri = '';
    }

    return (
      <View
        style={[
          styles.fullLayer,
          {
            width: targetWidth,
            height: targetHeight,
            maskImage: maskUri ? `url("${maskUri}")` : undefined,
            WebkitMaskImage: maskUri ? `url("${maskUri}")` : undefined,
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskPosition: 'bottom center',
            WebkitMaskPosition: 'bottom center',
          } as unknown as ViewStyle,
        ]}
        pointerEvents="none"
      >
        {children}
      </View>
    );
  }

  return (
    <RNMaskedView
      style={[
        styles.fullLayer,
        {
          width: targetWidth,
          height: targetHeight,
        },
      ]}
      maskElement={
        <Image
          source={maskSource}
          style={{ width: targetWidth, height: targetHeight }}
          resizeMode="contain"
        />
      }
      pointerEvents="none"
    >
      {children}
    </RNMaskedView>
  );
};

export const TankProgressMascot: React.FC<TankProgressMascotProps> = ({
  progressPercent,
  proteinConsumed,
  dailyGoal = 110,
  size,
  style,
  skinId,
  onPress,
  triggerCelebration,
  triggerSip,
  loggedFoodId,
  onSipComplete,
  onFlexComplete,
}) => {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const isReducedMotion = useReducedMotion();
  const [storedSkinId, setStoredSkinId] = useState<string>(DEFAULT_SKIN_ID);

  // Reaction Overlay state and animation
  const [activeReactionAsset, setActiveReactionAsset] = useState<ImageSourcePropType | null>(null);
  const reactionOpacity = useSharedValue(0);
  const logBounceScale = useSharedValue(1);
  const reactionStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (reactionStartTimerRef.current) {
        clearTimeout(reactionStartTimerRef.current);
      }
      if (reactionTimerRef.current) {
        clearTimeout(reactionTimerRef.current);
      }
      if (reactionFadeTimerRef.current) {
        clearTimeout(reactionFadeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!skinId) {
      getSelectedSkinId().then(setStoredSkinId);
    }
  }, [skinId]);

  const activeSkinId = skinId || storedSkinId;
  const isClassicSkin = activeSkinId === 'classic';
  const skinAssets = getSkinAssets(activeSkinId);

  // Reaction handling when food is logged
  useEffect(() => {
    if (!triggerSip) {
      return;
    }

    // A new log restarts the timer: clear any existing timers
    if (reactionStartTimerRef.current) {
      clearTimeout(reactionStartTimerRef.current);
    }
    if (reactionTimerRef.current) {
      clearTimeout(reactionTimerRef.current);
    }
    if (reactionFadeTimerRef.current) {
      clearTimeout(reactionFadeTimerRef.current);
    }

    // Check if an asset exists for the selected skin and food
    const asset = getReactionAsset(activeSkinId, loggedFoodId);

    if (asset) {
      // 1. Asset exists (e.g. Classic skin + Whey):
      // The reaction is a separate overlay layer in the same absolute box as the mascot, resizeMode contain.
      // Crossfade in 200ms, hold 1500ms, crossfade out 300ms, then remove it.
      reactionStartTimerRef.current = setTimeout(() => {
        setActiveReactionAsset(asset);
        reactionOpacity.value = 0;
        reactionOpacity.value = withTiming(1, {
          duration: isReducedMotion ? 0 : 200,
          easing: Easing.inOut(Easing.ease),
        });
      }, 0);

      // Crossfade out at 200ms + 1500ms = 1700ms
      reactionFadeTimerRef.current = setTimeout(() => {
        reactionOpacity.value = withTiming(0, {
          duration: isReducedMotion ? 0 : 300,
          easing: Easing.inOut(Easing.ease),
        });
      }, 1700);

      // Remove after 2000ms (200 + 1500 + 300)
      reactionTimerRef.current = setTimeout(() => {
        setActiveReactionAsset(null);
        reactionOpacity.value = 0;
        onSipComplete?.();
      }, 2000);
    } else {
      // 2. No reaction asset exists (e.g. Eggs on astronaut skin, Chicken on classic):
      // Skip the swap and just do the 900ms fill animation plus a small scale bounce (1.0 to 1.05 to 1.0).
      reactionStartTimerRef.current = setTimeout(() => {
        setActiveReactionAsset(null);
        reactionOpacity.value = 0;
      }, 0);

      if (!isReducedMotion) {
        logBounceScale.value = withSequence(
          withTiming(1.05, { duration: 250, easing: Easing.out(Easing.quad) }),
          withTiming(1.0, { duration: 350, easing: Easing.inOut(Easing.quad) })
        );
      }

      reactionTimerRef.current = setTimeout(() => {
        onSipComplete?.();
      }, 900);
    }
  }, [triggerSip, loggedFoodId, activeSkinId, isReducedMotion, onSipComplete, reactionOpacity, logBounceScale]);

  // Sizing: Target about 55% of screen height, constrained to 90% screen width
  const calculatedHeight = Math.round(windowHeight * 0.55);
  const rawTargetSize = size ? size : Math.max(220, calculatedHeight);
  const targetDimension = Math.min(
    rawTargetSize,
    Math.round(windowWidth * 0.90)
  );
  const targetWidth = targetDimension;
  const targetHeight = targetDimension;

  // Compute progress ratio (strictly total / goal, clamped 0..1, NEVER changed by reaction)
  let fraction = progressPercent / 100;
  if (proteinConsumed !== undefined && dailyGoal > 0) {
    fraction = proteinConsumed / dailyGoal;
  }
  if (isNaN(fraction) || fraction < 0) {
    fraction = 0;
  }

  // Visual fill is capped at 100% (1.0)
  const clampedRatio = Math.min(1.0, fraction);
  const currentPercent = Math.round(clampedRatio * 100);

  // 1. Fill Height animation (900ms, Easing.out(cubic))
  const animatedFillRatio = useSharedValue(clampedRatio);

  useEffect(() => {
    animatedFillRatio.value = withTiming(clampedRatio, {
      duration: isReducedMotion ? 0 : 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [clampedRatio, animatedFillRatio, isReducedMotion]);

  const animatedFillStyle = useAnimatedStyle(() => {
    return {
      height: animatedFillRatio.value * targetHeight,
    };
  });

  // 2. Tap Squash & Spring
  const tapScale = useSharedValue(1);

  const handleTankPress = () => {
    tapScale.value = withSequence(
      withTiming(0.95, { duration: 80, easing: Easing.in(Easing.ease) }),
      withSpring(1, { damping: 10, stiffness: 220 })
    );
    triggerLightHaptic();
    onPress?.();
  };

  // 3. Milestone Bounces at 25%, 50%, 75%
  const bounceScale = useSharedValue(1);
  const prevPercentRef = useRef<number>(currentPercent);

  useEffect(() => {
    const prev = prevPercentRef.current;
    const curr = currentPercent;
    prevPercentRef.current = curr;

    const crossed25 = prev < 25 && curr >= 25;
    const crossed50 = prev < 50 && curr >= 50;
    const crossed75 = prev < 75 && curr >= 75;

    if (crossed25 || crossed50 || crossed75) {
      bounceScale.value = withSequence(
        withSpring(1.06, { damping: 8, stiffness: 220 }),
        withSpring(1, { damping: 8, stiffness: 180 })
      );
      triggerLightHaptic();
    }
  }, [currentPercent, bounceScale]);

  // 4. FLEX Animation Trigger: celebration when reaching 100%
  const [showConfetti, setShowConfetti] = useState(false);
  const [showGoalBanner, setShowGoalBanner] = useState(false);

  useEffect(() => {
    if (!triggerCelebration) {
      return;
    }

    triggerSuccessHaptic();

    const startTimer = setTimeout(() => {
      setShowGoalBanner(true);
      if (!isReducedMotion) {
        setShowConfetti(true);
      }
    }, 16);

    const confettiTimer = setTimeout(() => {
      setShowConfetti(false);
    }, 1600);

    const bannerTimer = setTimeout(() => {
      setShowGoalBanner(false);
    }, 2500);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(confettiTimer);
      clearTimeout(bannerTimer);
    };
  }, [triggerCelebration, isReducedMotion]);

  const handleFlexEnd = () => {
    onFlexComplete?.();
  };

  // 5. Horizontal wave loop (2400ms linear)
  const waveOffset = useSharedValue(0);

  useEffect(() => {
    if (isReducedMotion) {
      waveOffset.value = 0;
      return;
    }
    waveOffset.value = withRepeat(
      withTiming(-60, { duration: 2400, easing: Easing.linear }),
      -1,
      false
    );
  }, [waveOffset, isReducedMotion]);

  const animatedWaveStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: waveOffset.value }],
    };
  });

  const animatedWaveContainerStyle = useAnimatedStyle(() => {
    return {
      bottom: animatedFillRatio.value * targetHeight - 6,
    };
  });

  // Mascot scale transform (combines tap, milestone bounce, and log scale bounce)
  const mascotAnimatedStyle = useAnimatedStyle(() => {
    const scale = tapScale.value * bounceScale.value * logBounceScale.value;
    return {
      transform: [{ scale }],
    };
  });

  // Base and fill layers opacity: while reaction is visible, opacity is 0 so no ghosting is possible
  const mascotBaseLayersStyle = useAnimatedStyle(() => {
    const reactionVis = reactionOpacity.value;
    const baseOpacity = activeReactionAsset ? Math.max(0, 1 - reactionVis) : 1;
    return {
      opacity: baseOpacity,
    };
  });

  // Reaction overlay animation style
  const reactionOverlayStyle = useAnimatedStyle(() => {
    return {
      opacity: reactionOpacity.value,
    };
  });

  const waveSvgWidth = targetWidth + 120;
  const wavePath = generateWavePath(waveSvgWidth, 60, 4);

  return (
    <View style={[styles.container, style]}>
      {/* Confetti Particles on 100% Goal Smash */}
      {showConfetti && <ConfettiOverlay />}

      {/* Goal Smashed Banner */}
      {showGoalBanner && (
        <View style={styles.goalBannerContainer}>
          <View style={styles.goalBannerPill}>
            <Text style={styles.goalBannerText}>Goal smashed!</Text>
          </View>
        </View>
      )}

      {/* Interactive Mascot Canvas */}
      <Pressable
        onPress={handleTankPress}
        style={styles.pressableWrap}
        accessibilityRole="image"
        accessibilityLabel={`Tank the bull mascot, ${Math.round(fraction * 100)}% protein goal reached`}
      >
        <Animated.View
          style={[
            styles.mascotCanvas,
            {
              width: targetWidth,
              height: targetHeight,
            },
            mascotAnimatedStyle,
          ]}
        >
          {/* BASE & FILL LAYERS (Set to opacity 0 while reaction is visible to prevent outline ghosting) */}
          <Animated.View
            style={[
              styles.fullLayer,
              { width: targetWidth, height: targetHeight },
              mascotBaseLayersStyle,
            ]}
          >
            {/* LAYER 1: Base layer = <id>-empty.png in soft beige with navy outline */}
            <Image
              source={skinAssets.empty}
              style={[
                styles.fullLayer,
                {
                  width: targetWidth,
                  height: targetHeight,
                },
              ]}
              resizeMode="contain"
            />

            {/* LAYER 2: Colored fill clipped from bottom up to fill percentage */}
            {clampedRatio > 0 && (
              <Animated.View
                style={[
                  styles.fillClipContainer,
                  {
                    width: targetWidth,
                  },
                  animatedFillStyle,
                ]}
              >
                <Image
                  source={skinAssets.color}
                  style={[
                    styles.bottomAlignedImage,
                    {
                      width: targetWidth,
                      height: targetHeight,
                    },
                  ]}
                  resizeMode="contain"
                />
              </Animated.View>
            )}

            {/* LAYER 4: The reveal's top edge thin wavy line clipped strictly by the skin's alpha */}
            {clampedRatio > 0 && clampedRatio < 1.0 && (
              <SilhouetteMaskedWave
                targetWidth={targetWidth}
                targetHeight={targetHeight}
                maskSource={skinAssets.color}
              >
                <Animated.View style={[styles.waveRow, animatedWaveContainerStyle]}>
                  <Animated.View
                    style={[
                      styles.waveContainer,
                      { width: waveSvgWidth },
                      animatedWaveStyle,
                    ]}
                  >
                    <Svg width={waveSvgWidth} height={12} viewBox={`0 0 ${waveSvgWidth} 12`}>
                      <Path
                        d={wavePath}
                        fill="none"
                        stroke="#F2BB4B"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                      />
                    </Svg>
                  </Animated.View>
                </Animated.View>
              </SilhouetteMaskedWave>
            )}
          </Animated.View>

          {/* CELEBRATION LAYER (Flex on celebration smashed) */}
          {triggerCelebration && isClassicSkin && (
            <View style={styles.fullLayer} pointerEvents="none">
              <TankSpritePlayer
                mode="flex"
                width={targetWidth}
                height={targetHeight}
                isReducedMotion={isReducedMotion}
                fallbackSource={skinAssets.color}
                onAnimationEnd={handleFlexEnd}
                accessibilityLabel="Tank celebration animation"
              />
            </View>
          )}

          {/* REACTION OVERLAY LAYER: Separate overlay layer in the same absolute box as the mascot, resizeMode contain */}
          {activeReactionAsset && (
            <Animated.View
              style={[
                styles.fullLayer,
                {
                  width: targetWidth,
                  height: targetHeight,
                },
                reactionOverlayStyle,
              ]}
              pointerEvents="none"
            >
              <Image
                source={activeReactionAsset}
                style={{
                  width: targetWidth,
                  height: targetHeight,
                }}
                resizeMode="contain"
              />
            </Animated.View>
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: theme.spacing.xs,
  },
  pressableWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotCanvas: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullLayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  fillClipContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  bottomAlignedImage: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  waveRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 12,
  },
  waveContainer: {
    position: 'absolute',
    top: 0,
    left: -20,
    height: 12,
    zIndex: 10,
    pointerEvents: 'none',
  },
  goalBannerContainer: {
    position: 'absolute',
    top: -16,
    zIndex: 100,
    alignItems: 'center',
  },
  goalBannerPill: {
    backgroundColor: '#F2BB4B',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.radii.full,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#17233D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  goalBannerText: {
    ...theme.typography.caption,
    fontWeight: '900',
    color: '#17233D',
    letterSpacing: 0.5,
  },
});

export default TankProgressMascot;
