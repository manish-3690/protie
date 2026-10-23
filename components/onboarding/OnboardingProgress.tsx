import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

export interface OnboardingProgressProps {
  currentStep: number;
  totalSteps?: number;
  style?: StyleProp<ViewStyle>;
}

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  currentStep,
  totalSteps = 5,
  style,
}) => {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: totalSteps, now: currentStep }}
      accessibilityLabel={`Step ${currentStep} of ${totalSteps}`}
    >
      {steps.map((step) => {
        const isActive = step <= currentStep;
        const isCurrent = step === currentStep;
        return (
          <View
            key={step}
            style={[
              styles.dot,
              isActive && styles.activeDot,
              isCurrent && styles.currentDot,
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  dot: {
    height: 6,
    width: 16,
    borderRadius: 3,
    backgroundColor: theme.colors.border,
  },
  activeDot: {
    backgroundColor: theme.colors.primary,
  },
  currentDot: {
    width: 28,
    backgroundColor: theme.colors.primary,
  },
});

export default OnboardingProgress;
