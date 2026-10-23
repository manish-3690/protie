import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AppButton } from '@/components/AppButton';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import {
  WeekStart,
  getOnboardingData,
  saveOnboardingData,
} from '@/store/onboardingStorage';
import { theme } from '@/constants/theme';

export default function WeekStartScreen() {
  const router = useRouter();
  const [selectedWeekStart, setSelectedWeekStart] = useState<WeekStart>('monday');

  useEffect(() => {
    getOnboardingData().then((data) => {
      if (data.weekStart) {
        setSelectedWeekStart(data.weekStart);
      }
    });
  }, []);

  const handleSelect = async (start: WeekStart) => {
    setSelectedWeekStart(start);
    await saveOnboardingData({ weekStart: start });
  };

  const handleContinue = () => {
    router.push('/onboarding/goal');
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/onboarding/first-protein');
    }
  };

  return (
    <ScreenContainer withHorizontalPadding style={styles.container}>
      <View style={styles.content}>
        {/* Progress & Header */}
        <View style={styles.headerSection}>
          <OnboardingProgress currentStep={3} totalSteps={5} />

          <Text style={styles.heading} accessibilityRole="header">
            When does your week start?
          </Text>

          <Text style={styles.description}>
            This setting will organize your weekly protein streaks and calendar views.
          </Text>
        </View>

        {/* Options Section */}
        <View style={styles.optionsSection}>
          {/* Monday Option (Default) */}
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedWeekStart === 'monday' }}
            accessibilityLabel="Monday - Recommended for workout cycles"
            onPress={() => handleSelect('monday')}
            style={({ pressed }) => [
              styles.optionCard,
              selectedWeekStart === 'monday' && styles.optionCardSelected,
              pressed && styles.cardPressed,
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.dayIconBox}>
                <Text style={styles.dayIconText}>M</Text>
              </View>
              <View style={styles.dayInfo}>
                <View style={styles.titleRow}>
                  <Text style={styles.dayTitle}>Monday</Text>
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>POPULAR</Text>
                  </View>
                </View>
                <Text style={styles.daySubtitle}>Align with weekly training and gym schedules</Text>
              </View>
              <View
                style={[
                  styles.radioIndicator,
                  selectedWeekStart === 'monday' && styles.radioIndicatorSelected,
                ]}
              >
                {selectedWeekStart === 'monday' && <View style={styles.radioInnerDot} />}
              </View>
            </View>
          </Pressable>

          {/* Sunday Option */}
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedWeekStart === 'sunday' }}
            accessibilityLabel="Sunday - Traditional calendar week"
            onPress={() => handleSelect('sunday')}
            style={({ pressed }) => [
              styles.optionCard,
              selectedWeekStart === 'sunday' && styles.optionCardSelected,
              pressed && styles.cardPressed,
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.dayIconBox}>
                <Text style={styles.dayIconText}>S</Text>
              </View>
              <View style={styles.dayInfo}>
                <Text style={styles.dayTitle}>Sunday</Text>
                <Text style={styles.daySubtitle}>Standard calendar week start</Text>
              </View>
              <View
                style={[
                  styles.radioIndicator,
                  selectedWeekStart === 'sunday' && styles.radioIndicatorSelected,
                ]}
              >
                {selectedWeekStart === 'sunday' && <View style={styles.radioInnerDot} />}
              </View>
            </View>
          </Pressable>
        </View>

        {/* Navigation Action Buttons */}
        <View style={styles.actionSection}>
          <AppButton
            testID="weekstart-continue-button"
            title="CONTINUE"
            variant="primary"
            onPress={handleContinue}
            accessibilityLabel="Continue to set protein goal"
          />

          <View style={styles.buttonSpacer} />

          <AppButton
            testID="weekstart-back-button"
            title="BACK"
            variant="secondary"
            onPress={handleBack}
            accessibilityLabel="Back to previous screen"
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
  },
  heading: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
  },
  optionsSection: {
    gap: theme.spacing.md,
    marginVertical: theme.spacing.lg,
  },
  optionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  optionCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.secondarySurface,
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.9,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.secondarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dayIconText: {
    ...theme.typography.button,
    fontWeight: '900',
    color: theme.colors.primary,
  },
  dayInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  dayTitle: {
    ...theme.typography.subtitle,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  defaultBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.sm,
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.white,
    letterSpacing: 0.5,
  },
  daySubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  radioIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioIndicatorSelected: {
    borderColor: theme.colors.primary,
  },
  radioInnerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
  actionSection: {
    width: '100%',
    paddingBottom: theme.spacing.md,
  },
  buttonSpacer: {
    height: theme.spacing.xs,
  },
});
