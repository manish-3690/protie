import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { theme } from '@/constants/theme';

export interface GoalInputProps {
  value: number;
  unit: string;
  onChange: (newValue: number) => void;
  min?: number;
  max?: number;
  step?: number;
  subtitle?: string;
  editable?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const GoalInput: React.FC<GoalInputProps> = ({
  value,
  unit,
  onChange,
  min = 20,
  max = 300,
  step = 5,
  subtitle,
  editable = false,
  style,
}) => {
  const handleDecrement = () => {
    const next = Math.max(min, value - step);
    onChange(next);
  };

  const handleIncrement = () => {
    const next = Math.min(max, value + step);
    onChange(next);
  };

  const handleTextChange = (text: string) => {
    const parsed = parseInt(text.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(parsed)) {
      onChange(Math.min(max, parsed));
    } else {
      onChange(0);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.stepperRow}>
        {/* Decrement Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${unit}`}
          disabled={value <= min}
          onPress={handleDecrement}
          style={({ pressed }) => [
            styles.stepButton,
            value <= min && styles.stepButtonDisabled,
            pressed && styles.stepButtonPressed,
          ]}
        >
          <Text style={[styles.stepButtonText, value <= min && styles.stepButtonTextDisabled]}>
            −
          </Text>
        </Pressable>

        {/* Display Center */}
        <View style={styles.valueDisplay}>
          {editable ? (
            <TextInput
              value={value > 0 ? String(Math.round(value)) : ''}
              onChangeText={handleTextChange}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={theme.colors.disabledText}
              style={styles.numberInput}
              accessibilityLabel="Manual protein goal in grams"
            />
          ) : (
            <Text style={styles.numberText}>{Math.round(value)}</Text>
          )}
          <Text style={styles.unitText}>{unit}</Text>
        </View>

        {/* Increment Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${unit}`}
          disabled={value >= max}
          onPress={handleIncrement}
          style={({ pressed }) => [
            styles.stepButton,
            value >= max && styles.stepButtonDisabled,
            pressed && styles.stepButtonPressed,
          ]}
        >
          <Text style={[styles.stepButtonText, value >= max && styles.stepButtonTextDisabled]}>
            +
          </Text>
        </Pressable>
      </View>

      {subtitle && <Text style={styles.subtitleText}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: theme.spacing.md,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    width: '100%',
    maxWidth: 320,
  },
  stepButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.secondarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stepButtonPressed: {
    backgroundColor: theme.colors.secondarySurfacePressed,
    transform: [{ scale: 0.95 }],
  },
  stepButtonDisabled: {
    opacity: 0.4,
  },
  stepButtonText: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    lineHeight: 28,
  },
  stepButtonTextDisabled: {
    color: theme.colors.disabledText,
  },
  valueDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  numberText: {
    fontSize: 44,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    lineHeight: 50,
  },
  numberInput: {
    fontSize: 44,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    lineHeight: 50,
    textAlign: 'center',
    padding: 0,
    minWidth: 90,
  },
  unitText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  subtitleText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
});

export default GoalInput;
