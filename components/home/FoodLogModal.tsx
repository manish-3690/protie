import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ProteinFood } from '@/constants/proteinFoods';
import { theme } from '@/constants/theme';
import { AppButton } from '@/components/AppButton';
import { ProteinUnit, formatProteinAmount } from '@/store/onboardingStorage';

export interface FoodLogModalProps {
  visible: boolean;
  food: ProteinFood | null;
  isCustom?: boolean;
  proteinUnit?: ProteinUnit;
  onClose: () => void;
  onConfirm: (entry: {
    foodId: string;
    foodName: string;
    servingCount: number;
    proteinGrams: number;
    iconSymbol?: string;
  }) => Promise<void>;
}

interface FoodLogContentProps {
  food: ProteinFood | null;
  isCustom: boolean;
  proteinUnit: ProteinUnit;
  onClose: () => void;
  onConfirm: FoodLogModalProps['onConfirm'];
}

const FoodLogContent: React.FC<FoodLogContentProps> = ({
  food,
  isCustom,
  proteinUnit,
  onClose,
  onConfirm,
}) => {
  const [servings, setServings] = useState<number>(1);
  const [customName, setCustomName] = useState<string>(
    food ? food.name : 'Protein Snack'
  );
  const [customGrams, setCustomGrams] = useState<string>(
    food ? String(food.defaultProteinGrams) : '25'
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStepServing = (delta: number) => {
    setServings((prev) => {
      const next = Math.max(0.5, Math.min(10, Math.round((prev + delta) * 2) / 2));
      return next;
    });
    setErrorMessage(null);
  };

  const calculatedGrams = food
    ? Math.round(food.defaultProteinGrams * servings * 10) / 10
    : Math.max(0, parseFloat(customGrams) || 0);

  const handleConfirm = async () => {
    if (isSubmitting) return; // Prevent double submission

    if (isCustom) {
      const grams = parseFloat(customGrams);
      if (isNaN(grams) || grams <= 0) {
        setErrorMessage('Please enter a valid protein amount greater than 0g.');
        return;
      }
      if (grams > 300) {
        setErrorMessage('Protein amount cannot exceed 300g per entry.');
        return;
      }
      if (!customName.trim()) {
        setErrorMessage('Please enter a name for the food.');
        return;
      }

      setIsSubmitting(true);
      try {
        await onConfirm({
          foodId: 'custom',
          foodName: customName.trim(),
          servingCount: 1,
          proteinGrams: grams,
          iconSymbol: '⚡',
        });
        onClose();
      } catch {
        setErrorMessage('Failed to save entry. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    } else if (food) {
      if (servings <= 0) {
        setErrorMessage('Serving count must be greater than 0.');
        return;
      }

      setIsSubmitting(true);
      try {
        await onConfirm({
          foodId: food.id,
          foodName: food.name,
          servingCount: servings,
          proteinGrams: calculatedGrams,
          iconSymbol: food.iconSymbol,
        });
        onClose();
      } catch {
        setErrorMessage('Failed to save entry. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <View style={styles.sheetContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Text style={styles.headerIcon}>
            {isCustom ? '⚡' : food?.iconSymbol || '🍗'}
          </Text>
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>
            {isCustom ? 'Log Custom Protein' : `Log ${food?.name}`}
          </Text>
          <Text style={styles.subtitle}>
            {isCustom
              ? 'Enter custom protein details'
              : food?.defaultServingLabel}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Close food log modal"
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Body Content */}
      {isCustom ? (
        <View style={styles.body}>
          <Text style={styles.inputLabel}>Food / Item Name</Text>
          <TextInput
            style={styles.textInput}
            value={customName}
            onChangeText={(text) => {
              setCustomName(text);
              setErrorMessage(null);
            }}
            placeholder="e.g. Protein Bar, Salmon, Shake"
            placeholderTextColor={theme.colors.disabledText}
            maxLength={30}
          />

          <Text style={styles.inputLabel}>Protein Amount (grams)</Text>
          <TextInput
            style={[styles.textInput, styles.numericInput]}
            value={customGrams}
            onChangeText={(text) => {
              setCustomGrams(text.replace(/[^0-9.]/g, ''));
              setErrorMessage(null);
            }}
            placeholder="25"
            placeholderTextColor={theme.colors.disabledText}
            keyboardType="numeric"
            maxLength={5}
          />
        </View>
      ) : (
        <View style={styles.body}>
          <Text style={styles.inputLabel}>Adjust Servings</Text>

          {/* Stepper controls */}
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={[
                styles.stepButton,
                servings <= 0.5 && styles.stepButtonDisabled,
              ]}
              onPress={() => handleStepServing(-0.5)}
              disabled={servings <= 0.5}
              accessibilityRole="button"
              accessibilityLabel="Decrease servings by half"
            >
              <Text style={styles.stepButtonText}>−</Text>
            </TouchableOpacity>

            <View style={styles.servingDisplay}>
              <Text style={styles.servingNumber}>{servings}x</Text>
              <Text style={styles.servingUnit}>
                {food?.servingUnitName || 'serving'}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.stepButton,
                servings >= 10 && styles.stepButtonDisabled,
              ]}
              onPress={() => handleStepServing(0.5)}
              disabled={servings >= 10}
              accessibilityRole="button"
              accessibilityLabel="Increase servings by half"
            >
              <Text style={styles.stepButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Serving Chips */}
          <View style={styles.chipsRow}>
            {[0.5, 1, 1.5, 2, 3].map((chip) => (
              <TouchableOpacity
                key={chip}
                style={[
                  styles.chip,
                  servings === chip && styles.chipActive,
                ]}
                onPress={() => {
                  setServings(chip);
                  setErrorMessage(null);
                }}
              >
                <Text
                  style={[
                    styles.chipText,
                    servings === chip && styles.chipTextActive,
                  ]}
                >
                  {chip}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Protein Total Highlight */}
      <View style={styles.summaryBox}>
        <Text style={styles.summaryLabel}>Total Protein Added:</Text>
        <Text style={styles.summaryValue}>
          +{formatProteinAmount(calculatedGrams, proteinUnit)}
        </Text>
      </View>

      {/* Validation Error Message */}
      {errorMessage && (
        <Text style={styles.errorText}>{errorMessage}</Text>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        <AppButton
          testID="confirm-food-log-button"
          title={
            isSubmitting ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              `LOG +${formatProteinAmount(calculatedGrams, proteinUnit)}`
            )
          }
          variant="primary"
          onPress={handleConfirm}
          disabled={isSubmitting || calculatedGrams <= 0}
          accessibilityLabel={`Confirm logging ${calculatedGrams} grams of protein`}
        />

        <TouchableOpacity
          onPress={onClose}
          style={styles.cancelButton}
          disabled={isSubmitting}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const FoodLogModal: React.FC<FoodLogModalProps> = ({
  visible,
  food,
  isCustom = false,
  proteinUnit = 'g',
  onClose,
  onConfirm,
}) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <FoodLogContent
          key={`${food?.id || 'custom'}-${isCustom}`}
          food={food}
          isCustom={isCustom}
          proteinUnit={proteinUnit}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(23, 35, 61, 0.45)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.radii.xl,
    borderTopRightRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    borderTopWidth: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.secondarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  headerIcon: {
    fontSize: 24,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    ...theme.typography.subtitle,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '700',
  },
  body: {
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  textInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  numericInput: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xs,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.secondarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonDisabled: {
    opacity: 0.4,
  },
  stepButtonText: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.primary,
    lineHeight: 28,
  },
  servingDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  servingNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: theme.colors.textPrimary,
  },
  servingUnit: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
  },
  chip: {
    flex: 1,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
    color: theme.colors.white,
  },
  summaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.secondarySurface + '60',
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  summaryLabel: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.primary,
  },
  errorText: {
    ...theme.typography.caption,
    color: '#D32F2F',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  actions: {
    gap: theme.spacing.xs,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  cancelText: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
});

export default FoodLogModal;
