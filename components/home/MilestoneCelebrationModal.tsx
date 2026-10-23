import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';
import { AppButton } from '@/components/AppButton';
import { ConfettiOverlay } from '@/components/home/ConfettiOverlay';
import { TankMascot } from '@/components/TankMascot';
import { TankSpritePlayer } from '@/components/home/TankSpritePlayer';
import { StreakMilestone, MILESTONE_DETAILS } from '@/store/milestoneStorage';
import { getSelectedSkinId } from '@/store/skinStorage';
import { DEFAULT_SKIN_ID } from '@/constants/mascotSkins';

export interface MilestoneCelebrationModalProps {
  visible: boolean;
  milestone: StreakMilestone | null;
  onDismiss: () => void;
}

export const MilestoneCelebrationModal: React.FC<MilestoneCelebrationModalProps> = ({
  visible,
  milestone,
  onDismiss,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const [activeSkinId, setActiveSkinId] = React.useState<string>(DEFAULT_SKIN_ID);

  const scaleAnim = useSharedValue(0.8);
  const opacityAnim = useSharedValue(0);
  const mascotJumpAnim = useSharedValue(0);

  useEffect(() => {
    if (visible && milestone) {
      getSelectedSkinId().then(setActiveSkinId);

      // Trigger heavy celebration haptic
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Safe fallback on web / unsupported devices
      }

      // Enter card animation
      scaleAnim.value = withSpring(1, { damping: 12, stiffness: 180 });
      opacityAnim.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });

      // Mascot celebration jump
      mascotJumpAnim.value = withSequence(
        withTiming(-24, { duration: 250, easing: Easing.out(Easing.cubic) }),
        withSpring(0, { damping: 9, stiffness: 220 })
      );
    } else {
      scaleAnim.value = 0.8;
      opacityAnim.value = 0;
      mascotJumpAnim.value = 0;
    }
  }, [visible, milestone, scaleAnim, opacityAnim, mascotJumpAnim]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
    opacity: opacityAnim.value,
  }));

  const mascotJumpStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mascotJumpAnim.value }],
  }));

  if (!milestone) return null;

  const meta = MILESTONE_DETAILS[milestone];
  const isClassicSkin = activeSkinId === DEFAULT_SKIN_ID;
  const mascotSize = Math.min(200, windowWidth * 0.55);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        {/* Confetti Explosion */}
        <ConfettiOverlay />

        <Pressable style={styles.backdrop} onPress={onDismiss} />

        <Animated.View style={[styles.card, cardAnimatedStyle]}>
          {/* Milestone Badge Pill */}
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>{meta.badge}</Text>
          </View>

          {/* Animated Mascot: Flex Sprite for Classic or Spring Jump Mascot */}
          <Animated.View style={[styles.mascotWrapper, mascotJumpStyle]}>
            {isClassicSkin ? (
              <TankSpritePlayer
                mode="flex"
                width={mascotSize}
                height={mascotSize}
                accessibilityLabel="Tank flexing in milestone celebration"
              />
            ) : (
              <TankMascot
                skinId={activeSkinId}
                size={mascotSize}
                accessibilityLabel="Tank mascot celebration"
              />
            )}
          </Animated.View>

          <Text style={styles.title}>{meta.title}</Text>
          <Text style={styles.streakCount}>
            🔥 {milestone} DAYS OF PURE DEDICATION
          </Text>

          <Text style={styles.message}>{meta.message}</Text>

          <View style={styles.actionWrap}>
            <AppButton
              testID="milestone-dismiss-button"
              title="LET'S KEEP GOING! 💪"
              variant="primary"
              onPress={onDismiss}
              accessibilityLabel="Dismiss milestone celebration"
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 35, 61, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D97935',
    elevation: 8,
    shadowColor: '#17233D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    zIndex: 10,
  },
  badgePill: {
    backgroundColor: '#FFE7BD',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radii.full,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#D97935',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97935',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  mascotWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    height: 190,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#17233D',
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  streakCount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97935',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xs,
  },
  actionWrap: {
    width: '100%',
  },
});
