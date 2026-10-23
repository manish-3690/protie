import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AppButton } from '@/components/AppButton';
import { TankMascot } from '@/components/TankMascot';
import {
  getOnboardingData,
  saveOnboardingData,
  formatProteinAmount,
  OnboardingData,
  DEFAULT_ONBOARDING_DATA,
} from '@/store/onboardingStorage';
import { theme } from '@/constants/theme';

export default function CompletionScreen() {
  const router = useRouter();
  const [data, setData] = useState<OnboardingData>(DEFAULT_ONBOARDING_DATA);

  useEffect(() => {
    getOnboardingData().then(setData);
  }, []);

  const handleLetsGo = async () => {
    try {
      await saveOnboardingData({ completed: true, onboardingComplete: true });
    } catch (err) {
      console.warn('Failed to mark onboarding complete:', err);
    }
    router.replace({ pathname: '/paywall', params: { source: 'onboarding' } });
  };

  const formattedReminder = data.reminderEnabled
    ? `${data.reminderHour % 12 === 0 ? 12 : data.reminderHour % 12}:${
        data.reminderMinute < 10 ? `0${data.reminderMinute}` : data.reminderMinute
      } ${data.reminderHour >= 12 ? 'PM' : 'AM'}`
    : 'Off';

  return (
    <ScreenContainer withHorizontalPadding style={styles.container}>
      <View style={styles.content}>
        {/* Top Header */}
        <View style={styles.headerSection}>
          <Text style={styles.heading} accessibilityRole="header">
            {"You're ready to get stronger"}
          </Text>

          <Text style={styles.description}>Your protein journey starts today.</Text>
        </View>

        {/* Mascot Centerpiece */}
        <View style={styles.mascotContainer}>
          <View style={styles.mascotCircle}>
            <TankMascot size={170} accessibilityLabel="Tank, the Protie mascot" />
          </View>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Your Setup Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Daily Protein Goal</Text>
            <Text style={styles.summaryValue}>
              {data.dailyGoalGrams ? formatProteinAmount(data.dailyGoalGrams, data.proteinUnit) : 'Not set'}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Week Starts On</Text>
            <Text style={styles.summaryValue}>
              {data.weekStart === 'sunday' ? 'Sunday' : 'Monday'}
            </Text>
          </View>

          <View style={[styles.summaryRow, styles.lastSummaryRow]}>
            <Text style={styles.summaryLabel}>Daily Reminder</Text>
            <Text style={styles.summaryValue}>{formattedReminder}</Text>
          </View>
        </View>

        {/* Primary Action Button (24px spacing above) */}
        <View style={styles.actionSection}>
          <AppButton
            testID="lets-go-button"
            title="LET'S GO"
            variant="primary"
            onPress={handleLetsGo}
            accessibilityLabel="Let's Go to Protie home screen"
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
  readyBadge: {
    backgroundColor: theme.colors.secondarySurface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  readyBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heading: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  mascotContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: theme.spacing.sm,
  },
  mascotCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: theme.colors.secondarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  summaryCard: {
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
  summaryTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.textPrimary,
    fontWeight: '800',
    marginBottom: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  lastSummaryRow: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  summaryLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  summaryValue: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    fontWeight: '800',
  },
  actionSection: {
    width: '100%',
    marginTop: 24,
    paddingBottom: theme.spacing.md,
  },
});
