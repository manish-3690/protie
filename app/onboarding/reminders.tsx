import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Switch,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AppButton } from '@/components/AppButton';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import {
  getOnboardingData,
  saveOnboardingData,
  requestNotificationPermission,
  scheduleDailyReminder,
  cancelDailyReminder,
} from '@/store/onboardingStorage';
import { theme } from '@/constants/theme';

const PRESET_TIMES = [
  { label: '9:00 AM', hour: 9, minute: 0 },
  { label: '12:00 PM', hour: 12, minute: 0 },
  { label: '3:00 PM', hour: 15, minute: 0 },
  { label: '6:00 PM', hour: 18, minute: 0 },
  { label: '8:30 PM', hour: 20, minute: 30 },
];

export default function RemindersScreen() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    getOnboardingData().then((data) => {
      if (data.reminderHour !== undefined) {
        setSelectedHour(data.reminderHour);
        setSelectedMinute(data.reminderMinute);
      }
      if (data.reminderEnabled !== undefined) {
        setEnabled(data.reminderEnabled);
      }
    });
  }, []);

  const handleToggle = (val: boolean) => {
    setEnabled(val);
    setPermissionNotice(null);
  };

  const handleSelectPreset = (hour: number, minute: number) => {
    setSelectedHour(hour);
    setSelectedMinute(minute);
  };

  const formatDisplayTime = (hour: number, minute: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const displayMinute = minute < 10 ? `0${minute}` : `${minute}`;
    return `${displayHour}:${displayMinute} ${period}`;
  };

  const handleSaveAndContinue = async () => {
    setIsProcessing(true);

    try {
      if (enabled) {
        // Request notifications permission
        const granted = await requestNotificationPermission();

        if (granted) {
          await scheduleDailyReminder(selectedHour, selectedMinute);
          await saveOnboardingData({
            reminderEnabled: true,
            reminderHour: selectedHour,
            reminderMinute: selectedMinute,
          });
          router.push('/onboarding/completion');
          return;
        }

        // If permission wasn't granted or scheduling failed
        if (!granted && Platform.OS !== 'web') {
          setPermissionNotice(
            'Notification permission was not granted. You can still continue, and enable reminders later in Android Settings.'
          );
          await saveOnboardingData({
            reminderEnabled: false,
            reminderHour: selectedHour,
            reminderMinute: selectedMinute,
          });
          setIsProcessing(false);
          return;
        }

        // Web or fallback
        await saveOnboardingData({
          reminderEnabled: false,
          reminderHour: selectedHour,
          reminderMinute: selectedMinute,
        });
      } else {
        await cancelDailyReminder();
        await saveOnboardingData({
          reminderEnabled: false,
          reminderHour: selectedHour,
          reminderMinute: selectedMinute,
        });
      }

      router.push('/onboarding/completion');
    } catch (err) {
      console.log('Error during reminder setup:', err);
      router.push('/onboarding/completion');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = async () => {
    await cancelDailyReminder();
    await saveOnboardingData({
      reminderEnabled: false,
    });
    router.push('/onboarding/completion');
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/onboarding/goal');
    }
  };

  return (
    <ScreenContainer scrollable withHorizontalPadding style={styles.container}>
      <View style={styles.content}>
        {/* Progress & Header */}
        <View style={styles.headerSection}>
          <OnboardingProgress currentStep={5} totalSteps={5} />

          <View style={styles.bellCircle}>
            <Text style={styles.bellIcon}>🔔</Text>
          </View>

          <Text style={styles.heading} accessibilityRole="header">
            Stay on track
          </Text>

          <Text style={styles.description}>
            Choose when Tank should remind you to eat protein and keep your daily streak alive.
          </Text>
        </View>

        {/* Toggle Switch Card */}
        <View style={styles.reminderCard}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchTitle}>Daily Protein Reminder</Text>
              <Text style={styles.switchSubtitle}>
                {enabled ? `Active at ${formatDisplayTime(selectedHour, selectedMinute)}` : 'Reminders are turned off'}
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={handleToggle}
              trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
              thumbColor={theme.colors.white}
              accessibilityLabel="Enable daily protein reminder"
            />
          </View>

          {enabled && (
            <View style={styles.timeSection}>
              <Text style={styles.sectionLabel}>Suggested Reminder Times</Text>

              <View style={styles.presetsGrid}>
                {PRESET_TIMES.map((preset) => {
                  const isSelected =
                    selectedHour === preset.hour && selectedMinute === preset.minute;
                  return (
                    <Pressable
                      key={preset.label}
                      accessibilityRole="button"
                      accessibilityLabel={`Set reminder to ${preset.label}`}
                      onPress={() => handleSelectPreset(preset.hour, preset.minute)}
                      style={[styles.presetChip, isSelected && styles.presetChipSelected]}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          isSelected && styles.presetChipTextSelected,
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Time Stepper Controls */}
              <View style={styles.timeAdjuster}>
                <Text style={styles.adjusterLabel}>Selected Daily Reminder:</Text>
                <View style={styles.timeBadge}>
                  <Text style={styles.timeBadgeText}>
                    {formatDisplayTime(selectedHour, selectedMinute)}
                  </Text>
                </View>
              </View>

              {/* Preview Notification Bubble */}
              <View style={styles.previewBox}>
                <Text style={styles.previewHeader}>Notification Preview</Text>
                <Text style={styles.previewTitle}>Tank says: Protein time!</Text>
                <Text style={styles.previewBody}>
                  Take a moment to log your protein and keep building your streak.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Permission warning banner if permission is not granted */}
        {permissionNotice && (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{permissionNotice}</Text>
            <AppButton
              title="CONTINUE ANYWAY"
              variant="secondary"
              onPress={() => router.push('/onboarding/completion')}
              style={styles.continueAnywayBtn}
            />
          </View>
        )}

        {/* Navigation Action Buttons */}
        <View style={styles.actionSection}>
          <AppButton
            testID="reminder-primary-button"
            title={
              isProcessing
                ? 'CONFIGURING...'
                : enabled
                ? 'REMIND ME TO EAT PROTEIN'
                : 'CONTINUE'
            }
            variant="primary"
            disabled={isProcessing}
            onPress={handleSaveAndContinue}
            accessibilityLabel={
              enabled ? 'Remind me to eat protein' : 'Continue without reminders'
            }
          />

          <View style={styles.buttonSpacer} />

          <AppButton
            testID="reminder-skip-button"
            title="Skip for now"
            variant="secondary"
            onPress={handleSkip}
            accessibilityLabel="Skip reminders"
          />

          <View style={styles.buttonSpacer} />

          <AppButton
            testID="reminder-back-button"
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
    paddingVertical: theme.spacing.md,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  bellCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.secondarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  bellIcon: {
    fontSize: 22,
  },
  heading: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 22,
  },
  reminderCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  switchTitle: {
    ...theme.typography.subtitle,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  switchSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  timeSection: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  sectionLabel: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  presetChip: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  presetChipSelected: {
    backgroundColor: theme.colors.secondarySurface,
    borderColor: theme.colors.primary,
  },
  presetChipText: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  presetChipTextSelected: {
    color: theme.colors.primary,
  },
  timeAdjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  adjusterLabel: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  timeBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  timeBadgeText: {
    ...theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.white,
  },
  previewBox: {
    backgroundColor: theme.colors.secondarySurface + '40',
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  previewHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  previewTitle: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  previewBody: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  noticeBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    marginBottom: theme.spacing.lg,
  },
  noticeText: {
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },
  continueAnywayBtn: {
    minHeight: 40,
    paddingVertical: theme.spacing.xs,
  },
  actionSection: {
    width: '100%',
    paddingBottom: theme.spacing.lg,
  },
  buttonSpacer: {
    height: theme.spacing.xs,
  },
});
