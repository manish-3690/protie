import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AppButton } from '@/components/AppButton';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import { TankMascot } from '@/components/TankMascot';
import { PROTEIN_FOODS } from '@/constants/proteinFoods';
import { theme } from '@/constants/theme';

export default function TrackYourProteinScreen() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const opacity = useSharedValue(1);
  const isScreenFocusedRef = useRef(true);

  // Cycling through 7 food items every 1.5 seconds with 250ms crossfade
  useFocusEffect(
    useCallback(() => {
      isScreenFocusedRef.current = true;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let intervalId: ReturnType<typeof setInterval> | null = null;

      intervalId = setInterval(() => {
        if (!isScreenFocusedRef.current) return;

        // Start 250ms fade-out
        opacity.value = withTiming(0.2, {
          duration: 250,
          easing: Easing.inOut(Easing.ease),
        });

        timeoutId = setTimeout(() => {
          if (!isScreenFocusedRef.current) return;
          setActiveIndex((prev) => (prev + 1) % PROTEIN_FOODS.length);
          // Fade-in
          opacity.value = withTiming(1, {
            duration: 250,
            easing: Easing.inOut(Easing.ease),
          });
        }, 250);
      }, 1500);

      return () => {
        isScreenFocusedRef.current = false;
        if (intervalId) clearInterval(intervalId);
        if (timeoutId) clearTimeout(timeoutId);
      };
    }, [opacity])
  );

  const activeFood = PROTEIN_FOODS[activeIndex];

  const animatedBadgeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleNext = () => {
    router.push('/onboarding/first-protein');
  };

  return (
    <ScreenContainer withHorizontalPadding style={styles.container}>
      <View style={styles.content}>
        {/* Progress & Header */}
        <View style={styles.headerSection}>
          <OnboardingProgress currentStep={1} totalSteps={5} />

          <View style={styles.iconCircle}>
            <Text style={styles.proteinIcon}>⚡</Text>
          </View>

          <Text style={styles.heading} accessibilityRole="header">
            Track your protein
          </Text>

          <Text style={styles.subheading}>
            Log your daily intake effortlessly and watch your consistency grow.
          </Text>
        </View>

        {/* Mascot & Cycling Food Silhouette Section */}
        <View style={styles.mascotSection}>
          <View style={styles.mascotCircleBackground}>
            <TankMascot size={190} accessibilityLabel="Tank, the Protie mascot" />
          </View>

          {/* Cycling Food Accent Badge */}
          <Animated.View style={[styles.foodBadge, animatedBadgeStyle]}>
            <Text style={styles.foodEmoji}>{activeFood.iconSymbol}</Text>
            <View style={styles.foodBadgeTextWrapper}>
              <Text style={styles.foodName}>{activeFood.name}</Text>
              <Text style={styles.foodProtein}>
                ~{activeFood.defaultProteinGrams}g protein / serving
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* Bottom Button */}
        <View style={styles.actionSection}>
          <AppButton
            testID="track-continue-button"
            title="CONTINUE"
            variant="primary"
            onPress={handleNext}
            accessibilityLabel="Continue to first protein entry"
            accessibilityHint="Navigates to adding your first protein scoop"
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
  },
  headerSection: {
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.secondarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  proteinIcon: {
    fontSize: 22,
  },
  heading: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  subheading: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 22,
  },
  mascotSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: theme.spacing.md,
  },
  mascotCircleBackground: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: theme.colors.secondarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  foodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    gap: theme.spacing.sm,
  },
  foodEmoji: {
    fontSize: 24,
  },
  foodBadgeTextWrapper: {
    alignItems: 'flex-start',
  },
  foodName: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  foodProtein: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  actionSection: {
    width: '100%',
    paddingBottom: theme.spacing.md,
  },
});
