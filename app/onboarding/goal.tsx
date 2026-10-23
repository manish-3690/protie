import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AppButton } from '@/components/AppButton';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import { GoalInput } from '@/components/onboarding/GoalInput';
import {
  getOnboardingData,
  saveOnboardingData,
  lbsToKg,
} from '@/store/onboardingStorage';
import { theme } from '@/constants/theme';

export default function GoalScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'calculate' | 'manual'>('calculate');

  // Body weight with kg / lbs toggle (empty initially)
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [weightText, setWeightText] = useState('');

  // Daily target goal in grams (null initially until weight is entered or manual goal is set)
  const [dailyGoalGrams, setDailyGoalGrams] = useState<number | null>(null);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);

  useEffect(() => {
    getOnboardingData().then((data) => {
      if (data.dailyGoalGrams && data.dailyGoalGrams > 0) {
        setDailyGoalGrams(data.dailyGoalGrams);
      }
      if (data.weightKg) {
        if (data.weightUnit === 'lbs') {
          setWeightUnit('lbs');
          setWeightText(String(Math.round(data.weightKg / 0.45359237)));
        } else {
          setWeightUnit('kg');
          setWeightText(String(Math.round(data.weightKg)));
        }
      }
      if (data.goalMethod === 'manual') {
        setMode('manual');
      }
    });
  }, []);

  // Compute live 1.6 g/kg rounded to nearest gram
  const calculateGoalFromWeight = (text: string, unit: 'kg' | 'lbs') => {
    if (!text || text.trim() === '') {
      setValidationWarning(null);
      setDailyGoalGrams(null);
      return;
    }

    const rawWeight = parseFloat(text);
    if (isNaN(rawWeight) || rawWeight <= 0) {
      setValidationWarning('Please enter a valid weight.');
      setDailyGoalGrams(null);
      return;
    }

    const weightKg = unit === 'lbs' ? lbsToKg(rawWeight) : rawWeight;

    if (weightKg < 25 || weightKg > 350) {
      setValidationWarning(
        `Weight (${Math.round(weightKg)} kg) is outside our typical estimator range. You can set a manual goal.`
      );
    } else {
      setValidationWarning(null);
    }

    // Live calculation: 1.6 g/kg, rounded to the nearest gram
    const computedGoal = Math.round(weightKg * 1.6);
    setDailyGoalGrams(Math.max(20, Math.min(350, computedGoal)));
  };

  const handleWeightTextChange = (text: string) => {
    setWeightText(text);
    if (mode === 'calculate') {
      calculateGoalFromWeight(text, weightUnit);
    }
  };

  const handleWeightUnitChange = (unit: 'kg' | 'lbs') => {
    setWeightUnit(unit);
    if (mode === 'calculate') {
      calculateGoalFromWeight(weightText, unit);
    }
  };

  const handleModeChange = (newMode: 'calculate' | 'manual') => {
    setMode(newMode);
    if (newMode === 'calculate') {
      calculateGoalFromWeight(weightText, weightUnit);
    }
  };

  const handleSaveAndContinue = async () => {
    if (!dailyGoalGrams || dailyGoalGrams <= 0) return;

    const rawWeight = parseFloat(weightText);
    const weightKg = !isNaN(rawWeight) && rawWeight > 0
      ? (weightUnit === 'lbs' ? lbsToKg(rawWeight) : rawWeight)
      : null;

    await saveOnboardingData({
      dailyGoalGrams,
      goalMethod: mode === 'calculate' ? 'calculated' : 'manual',
      weightKg,
      weightUnit,
    });

    router.push('/onboarding/reminders');
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/onboarding/week-start');
    }
  };

  const canContinue = dailyGoalGrams !== null && dailyGoalGrams > 0;

  return (
    <ScreenContainer scrollable withHorizontalPadding style={styles.container}>
      <View style={styles.content}>
        {/* Step 4 of 5: Progress & Header */}
        <View style={styles.headerSection}>
          <OnboardingProgress currentStep={4} totalSteps={5} />

          <Text style={styles.heading} accessibilityRole="header">
            Find your protein goal
          </Text>

          <Text style={styles.description}>
            Enter your weight to estimate a daily target, or set your own goal.
          </Text>
        </View>

        {/* Mode Selector Tabs */}
        <View style={styles.modeTabs}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === 'calculate' }}
            accessibilityLabel="Estimate target from body weight"
            onPress={() => handleModeChange('calculate')}
            style={[styles.tabButton, mode === 'calculate' && styles.tabButtonActive]}
          >
            <Text
              style={[styles.tabButtonText, mode === 'calculate' && styles.tabButtonTextActive]}
            >
              ESTIMATE
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === 'manual' }}
            accessibilityLabel="Enter custom protein goal manually"
            onPress={() => handleModeChange('manual')}
            style={[styles.tabButton, mode === 'manual' && styles.tabButtonActive]}
          >
            <Text style={[styles.tabButtonText, mode === 'manual' && styles.tabButtonTextActive]}>
              ENTER MANUALLY
            </Text>
          </Pressable>
        </View>

        {/* ESTIMATE MODE: Body Weight with kg / lbs toggle */}
        {mode === 'calculate' ? (
          <View style={styles.calculatorSection}>
            <View style={styles.inputCard}>
              <View style={styles.inputCardHeader}>
                <Text style={styles.inputLabel}>Body Weight</Text>
                <View style={styles.unitToggleRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Use Kilograms"
                    onPress={() => handleWeightUnitChange('kg')}
                    style={[
                      styles.unitPill,
                      weightUnit === 'kg' && styles.unitPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.unitPillText,
                        weightUnit === 'kg' && styles.unitPillTextActive,
                      ]}
                    >
                      kg
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Use Pounds"
                    onPress={() => handleWeightUnitChange('lbs')}
                    style={[
                      styles.unitPill,
                      weightUnit === 'lbs' && styles.unitPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.unitPillText,
                        weightUnit === 'lbs' && styles.unitPillTextActive,
                      ]}
                    >
                      lbs
                    </Text>
                  </Pressable>
                </View>
              </View>

              <TextInput
                value={weightText}
                onChangeText={handleWeightTextChange}
                keyboardType="numeric"
                placeholder={weightUnit === 'kg' ? 'e.g. 70' : 'e.g. 155'}
                placeholderTextColor={theme.colors.disabledText}
                style={styles.textInput}
                accessibilityLabel="Enter your body weight"
              />
            </View>

            {validationWarning && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>{validationWarning}</Text>
              </View>
            )}

            {/* Scientific Explanation Note */}
            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>
                💡 Estimated using a general fitness target of 1.6 grams of protein per kilogram of body weight per day. This is a general fitness benchmark, not medical advice.
              </Text>
            </View>
          </View>
        ) : null}

        {/* Daily Target Card */}
        {mode === 'calculate' ? (
          dailyGoalGrams !== null && dailyGoalGrams > 0 ? (
            <View style={styles.goalDisplayCard}>
              <Text style={styles.goalHeading}>Daily Target</Text>
              <GoalInput
                value={dailyGoalGrams}
                unit="g / day"
                min={20}
                max={350}
                step={5}
                onChange={(val: number) => setDailyGoalGrams(val)}
              />
            </View>
          ) : (
            <View style={styles.enterWeightPromptCard}>
              <Text style={styles.enterWeightPromptText}>
                Enter your weight to see your daily target
              </Text>
            </View>
          )
        ) : (
          /* MANUAL MODE: Daily Target card as an editable value */
          <View style={styles.goalDisplayCard}>
            <Text style={styles.goalHeading}>Daily Target</Text>
            <GoalInput
              value={dailyGoalGrams ?? 0}
              unit="g / day"
              min={20}
              max={350}
              step={5}
              editable
              onChange={(val: number) => setDailyGoalGrams(val > 0 ? val : null)}
            />
          </View>
        )}

        {/* Navigation Action Buttons */}
        <View style={styles.actionSection}>
          <AppButton
            testID="goal-continue-button"
            title="CONTINUE"
            variant="primary"
            disabled={!canContinue}
            onPress={handleSaveAndContinue}
            accessibilityLabel="Continue to reminder setup"
          />

          <View style={styles.buttonSpacer} />

          <AppButton
            testID="goal-back-button"
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
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.secondarySurface,
    borderRadius: theme.radii.full,
    padding: 4,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.full,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  tabButtonText: {
    ...theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  tabButtonTextActive: {
    color: theme.colors.white,
  },
  calculatorSection: {
    marginBottom: theme.spacing.md,
  },
  inputCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  inputCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  inputLabel: {
    ...theme.typography.subtitle,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  unitToggleRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.full,
    padding: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  unitPill: {
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
  },
  unitPillActive: {
    backgroundColor: theme.colors.primary,
  },
  unitPillText: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  unitPillTextActive: {
    color: theme.colors.white,
  },
  textInput: {
    ...theme.typography.title,
    fontSize: 28,
    color: theme.colors.textPrimary,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
    paddingVertical: theme.spacing.xs,
  },
  warningBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    marginBottom: theme.spacing.md,
  },
  warningText: {
    ...theme.typography.caption,
    color: '#E65100',
    lineHeight: 18,
  },
  disclaimerBox: {
    backgroundColor: theme.colors.secondarySurface + '60',
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.gold,
    marginBottom: theme.spacing.md,
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  goalDisplayCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  enterWeightPromptCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
  },
  enterWeightPromptText: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: theme.spacing.md,
  },
  goalHeading: {
    ...theme.typography.subtitle,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  actionSection: {
    width: '100%',
    paddingBottom: theme.spacing.lg,
  },
  buttonSpacer: {
    height: theme.spacing.xs,
  },
});
