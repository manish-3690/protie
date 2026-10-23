import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { theme } from '@/constants/theme';

export type AppButtonVariant = 'primary' | 'secondary' | 'danger';

export interface AppButtonProps {
  title: string | React.ReactNode;
  onPress: () => void;
  variant?: AppButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  testID,
}) => {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (typeof title === 'string' ? title : undefined)}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary && styles.primary,
        isDanger && styles.danger,
        !isPrimary && !isDanger && styles.secondary,
        disabled && (isPrimary ? styles.primaryDisabled : isDanger ? styles.dangerDisabled : styles.secondaryDisabled),
        pressed && !disabled && (isPrimary ? styles.primaryPressed : isDanger ? styles.dangerPressed : styles.secondaryPressed),
        style,
      ]}
    >
      {typeof title === 'string' ? (
        <Text
          style={[
            styles.textBase,
            (isPrimary || isDanger) ? styles.primaryText : styles.secondaryText,
            disabled && styles.textDisabled,
            textStyle,
          ]}
        >
          {title}
        </Text>
      ) : (
        title
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: theme.buttonDimensions.minHeight,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.buttonDimensions.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primary: {
    backgroundColor: theme.colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 4px 12px rgba(217, 121, 53, 0.25)',
        cursor: 'pointer',
      },
    }),
  },
  primaryPressed: {
    backgroundColor: theme.colors.primaryPressed,
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  primaryDisabled: {
    backgroundColor: theme.colors.disabled,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
      web: { boxShadow: 'none' },
    }),
  },
  danger: {
    backgroundColor: '#DC2626',
    ...Platform.select({
      ios: {
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
        cursor: 'pointer',
      },
    }),
  },
  dangerPressed: {
    backgroundColor: '#B91C1C',
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  dangerDisabled: {
    backgroundColor: theme.colors.disabled,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
      web: { boxShadow: 'none' },
    }),
  },
  secondary: {
    backgroundColor: 'transparent',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  secondaryPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.98 }],
  },
  secondaryDisabled: {
    opacity: 0.5,
  },
  textBase: {
    ...theme.typography.button,
    textAlign: 'center',
  },
  primaryText: {
    color: theme.colors.white,
  },
  secondaryText: {
    color: theme.colors.textPrimary,
  },
  textDisabled: {
    color: theme.colors.disabledText,
  },
});

export default AppButton;
