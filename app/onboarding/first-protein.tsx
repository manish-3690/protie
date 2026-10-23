import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AppButton } from '@/components/AppButton';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import { TankProgressMascot } from '@/components/home/TankProgressMascot';
import { PROTEIN_FOODS, ProteinFood } from '@/constants/proteinFoods';
import { addLog } from '@/store/foodLogStorage';
import { triggerLightHaptic } from '@/components/utils/haptics';
import { theme } from '@/constants/theme';

export default function FirstProteinScreen() {
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();

  const [selectedFood, setSelectedFood] = useState<ProteinFood>(PROTEIN_FOODS[0]);
  const [servings, setServings] = useState<number>(1);
  const [addedProtein, setAddedProtein] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddDisabled, setIsAddDisabled] = useState(false);
  const [frozenToast, setFrozenToast] = useState<{
    foodId: string;
    foodName: string;
    grams: number;
  } | null>(null);

  const disabledTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (disabledTimerRef.current) {
        clearTimeout(disabledTimerRef.current);
      }
    };
  }, []);

  // Tank mascot at ~30% of viewport height
  const mascotHeight = Math.max(160, Math.round(windowHeight * 0.30));

  const calculatedProtein = Math.round(selectedFood.defaultProteinGrams * servings);

  const handleSelectFood = (food: ProteinFood) => {
    setSelectedFood(food);
    setServings(1);
  };

  const handleMinus = () => {
    if (servings > selectedFood.minServings) {
      setServings((prev) => Math.max(selectedFood.minServings, prev - selectedFood.stepServings));
    }
  };

  const handlePlus = () => {
    if (servings < selectedFood.maxServings) {
      setServings((prev) => Math.min(selectedFood.maxServings, prev + selectedFood.stepServings));
    }
  };

  const handleAddProtein = async () => {
    if (isSaving || isAddDisabled) return;

    // Disable Add button for 600ms after tap
    setIsAddDisabled(true);
    if (disabledTimerRef.current) {
      clearTimeout(disabledTimerRef.current);
    }
    disabledTimerRef.current = setTimeout(() => {
      setIsAddDisabled(false);
    }, 600);

    setIsSaving(true);

    try {
      // Freeze food name and grams at the exact moment of tapping Add
      const gramsToAdd = calculatedProtein;
      const foodIdToAdd = selectedFood.id;
      const foodNameToAdd = selectedFood.name;

      setFrozenToast({
        foodId: foodIdToAdd,
        foodName: foodNameToAdd,
        grams: gramsToAdd,
      });

      // Animate Tank's fill (900ms inside TankProgressMascot)
      setAddedProtein(gramsToAdd);

      // Light haptic feedback (guarded for web)
      triggerLightHaptic();

      // Generate the entry id once per tap for idempotency
      const entryId = `first-protein-log-${Date.now()}`;

      // Single write path: addLog with foodId and idempotency
      await addLog({
        id: entryId,
        foodId: foodIdToAdd,
        foodName: foodNameToAdd,
        grams: gramsToAdd,
        servings: servings,
        source: 'onboarding',
      });
    } catch (err) {
      console.warn('Failed to save initial protein entry:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinue = () => {
    router.push('/onboarding/week-start');
  };

  const canContinue = addedProtein > 0;

  return (
    <ScreenContainer scrollable={false} withHorizontalPadding style={styles.container}>
      <View style={styles.content}>
        {/* Step 2 of 5: Progress & Compact Header */}
        <View style={styles.headerSection}>
          <OnboardingProgress currentStep={2} totalSteps={5} />

          <Text style={styles.heading} accessibilityRole="header">
            Add your first scoop
          </Text>
          <Text style={styles.subtitle}>
            Tap a food to see Tank fill up!
          </Text>
        </View>

        {/* Mascot Centerpiece (~30% of viewport height, fixed) */}
        <View style={styles.mascotSection}>
          <TankProgressMascot
            size={mascotHeight}
            dailyGoal={110}
            proteinConsumed={addedProtein}
            progressPercent={Math.round((addedProtein / 110) * 100)}
          />
        </View>

        {/* Horizontally swipeable food chip row (snap scrolling, 8 foods) */}
        <View style={styles.foodRowContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={108}
            decelerationRate="fast"
            contentContainerStyle={styles.foodScrollContent}
          >
            {PROTEIN_FOODS.map((food) => {
              const isSelected = selectedFood.id === food.id;
              return (
                <TouchableOpacity
                  key={food.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${food.name}, approximately ${food.defaultProteinGrams} grams protein`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => handleSelectFood(food)}
                  style={[
                    styles.foodChip,
                    isSelected && styles.foodChipSelected,
                  ]}
                  activeOpacity={0.75}
                >
                  <View style={[styles.foodChipIconBox, { backgroundColor: food.badgeColor + '25' }]}>
                    <Text style={styles.foodChipEmoji}>{food.iconSymbol}</Text>
                  </View>
                  <Text style={[styles.foodChipName, isSelected && styles.foodChipNameSelected]} numberOfLines={1}>
                    {food.name}
                  </Text>
                  <View style={styles.foodChipBadge}>
                    <Text style={styles.foodChipBadgeText}>~{food.defaultProteinGrams}g</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Serving Stepper & Add Button */}
        <View style={styles.controlsCard}>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Decrease servings"
              disabled={servings <= selectedFood.minServings}
              onPress={handleMinus}
              style={[
                styles.stepButton,
                servings <= selectedFood.minServings && styles.stepButtonDisabled,
              ]}
              activeOpacity={0.7}
            >
              <Text style={styles.stepButtonText}>−</Text>
            </TouchableOpacity>

            <View style={styles.amountDisplay}>
              <Text style={styles.proteinTotalNumber}>{calculatedProtein}</Text>
              <Text style={styles.proteinTotalLabel}>g PROTEIN</Text>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Increase servings"
              disabled={servings >= selectedFood.maxServings}
              onPress={handlePlus}
              style={[
                styles.stepButton,
                servings >= selectedFood.maxServings && styles.stepButtonDisabled,
              ]}
              activeOpacity={0.7}
            >
              <Text style={styles.stepButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Frozen Toast Banner when protein was added */}
          {frozenToast && (
            <View style={styles.toastBanner}>
              <Text style={styles.toastBannerText}>
                ✓ Added {frozenToast.grams}g {frozenToast.foodName}!
              </Text>
            </View>
          )}

          {/* Add / Added Button */}
          {frozenToast && selectedFood.id === frozenToast.foodId ? (
            <TouchableOpacity
              style={styles.addedConfirmationButton}
              onPress={handleAddProtein}
              disabled={isSaving || isAddDisabled}
              activeOpacity={0.8}
            >
              <Text style={styles.addedConfirmationText}>
                ✓ Added {frozenToast.grams}g {frozenToast.foodName}!
              </Text>
            </TouchableOpacity>
          ) : (
            <AppButton
              testID="add-entry-button"
              title={isSaving ? 'ADDING...' : `ADD +${calculatedProtein}g PROTEIN`}
              variant="primary"
              disabled={isSaving || isAddDisabled}
              onPress={handleAddProtein}
              style={styles.addEntryButton}
            />
          )}
        </View>

        {/* Action Buttons: CONTINUE (enabled after Add) & Skip for now */}
        <View style={styles.actionSection}>
          <AppButton
            testID="first-protein-continue"
            title="CONTINUE"
            variant="primary"
            disabled={!canContinue}
            onPress={handleContinue}
            accessibilityLabel="Continue to week start setup"
          />

          <TouchableOpacity
            onPress={handleContinue}
            style={styles.skipButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Skip first protein entry"
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 2,
  },
  heading: {
    ...theme.typography.subtitle,
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginTop: 2,
  },
  subtitle: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 1,
  },
  mascotSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  foodRowContainer: {
    marginVertical: 4,
  },
  foodScrollContent: {
    paddingHorizontal: theme.spacing.xs,
    gap: 8,
  },
  foodChip: {
    width: 100,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  foodChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.secondarySurface,
  },
  foodChipIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  foodChipEmoji: {
    fontSize: 18,
  },
  foodChipName: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  foodChipNameSelected: {
    color: theme.colors.primary,
  },
  foodChipBadge: {
    backgroundColor: theme.colors.border + '60',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.radii.full,
    marginTop: 2,
  },
  foodChipBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textSecondary,
  },
  controlsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    marginVertical: 2,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.secondarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stepButtonDisabled: {
    opacity: 0.35,
  },
  stepButtonText: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    lineHeight: 24,
  },
  amountDisplay: {
    alignItems: 'center',
    minWidth: 90,
  },
  proteinTotalNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    lineHeight: 32,
  },
  proteinTotalLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 0.8,
  },
  addEntryButton: {
    width: '100%',
    minHeight: 44,
  },
  toastBanner: {
    backgroundColor: '#E8F5E9',
    borderRadius: theme.radii.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#A5D6A7',
    alignSelf: 'center',
  },
  toastBannerText: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
  },
  addedConfirmationButton: {
    width: '100%',
    minHeight: 44,
    backgroundColor: '#E8F5E9',
    borderRadius: theme.radii.full,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  addedConfirmationText: {
    ...theme.typography.button,
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '800',
  },
  actionSection: {
    width: '100%',
    paddingBottom: theme.spacing.xs,
    alignItems: 'center',
    gap: 4,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.md,
  },
  skipText: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});
