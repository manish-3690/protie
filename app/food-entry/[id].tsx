import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';
import { theme } from '@/constants/theme';
import {
  OTHER_FOOD,
  getProteinFoodById,
  ProteinFood,
} from '@/constants/proteinFoods';
import { addLog } from '@/store/foodLogStorage';
import { getOnboardingData, OnboardingData, DEFAULT_ONBOARDING_DATA } from '@/store/onboardingStorage';
import { triggerLightHaptic, triggerSuccessHaptic } from '@/components/utils/haptics';
import { DraggableAmountSelector } from '@/components/food/DraggableAmountSelector';
import { NumericKeypad } from '@/components/food/NumericKeypad';

const CUSTOM_EMOJIS = ['⚡', '🥩', '🥤', '🥗', '🥪', '🥣', '🍳', '🥜'];

export default function FoodEntryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Determine selected food
  const food: ProteinFood = useMemo(() => {
    return getProteinFoodById(id || 'other') || OTHER_FOOD;
  }, [id]);

  const isCustom = food.id === 'other';

  // User profile
  const [profile, setProfile] = useState<OnboardingData>(DEFAULT_ONBOARDING_DATA);

  // Form State
  const [servings, setServings] = useState<number>(1);
  const [customName, setCustomName] = useState<string>('Protein Snack');
  const [customEmoji, setCustomEmoji] = useState<string>('⚡');
  const [customGrams, setCustomGrams] = useState<number>(25);
  const [keypadBuffer, setKeypadBuffer] = useState<string>('1');
  const [activeInputMode, setActiveInputMode] = useState<'slider' | 'keypad'>('slider');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    getOnboardingData()
      .then(setProfile)
      .catch((err) => console.warn('Failed to load profile for food entry:', err));
  }, []);

  // Sync keypad buffer when servings / custom grams change externally
  const handleServingChange = (val: number) => {
    const clamped = Math.max(0.25, Math.min(food.maxServings, Math.round(val * 4) / 4));
    setServings(clamped);
    setKeypadBuffer(String(clamped));
    setErrorMessage(null);
  };

  const handleCustomGramsChange = (val: number) => {
    const clamped = Math.max(1, Math.min(250, Math.round(val)));
    setCustomGrams(clamped);
    setKeypadBuffer(String(clamped));
    setErrorMessage(null);
  };

  // Stepper handlers
  const handleMinus = () => {
    triggerLightHaptic();
    if (isCustom) {
      handleCustomGramsChange(customGrams - 5);
    } else {
      handleServingChange(servings - food.stepServings);
    }
  };

  const handlePlus = () => {
    triggerLightHaptic();
    if (isCustom) {
      handleCustomGramsChange(customGrams + 5);
    } else {
      handleServingChange(servings + food.stepServings);
    }
  };

  // Keypad handlers
  const handleKeypadDigit = (digit: string) => {
    setErrorMessage(null);
    let next: string;
    if (keypadBuffer === '0' && digit !== '.') {
      next = digit;
    } else {
      if (digit === '.' && keypadBuffer.includes('.')) {
        return; // Only one decimal
      }
      next = keypadBuffer + digit;
    }

    if (next.length > 5) return; // Cap length

    setKeypadBuffer(next);
    const parsed = parseFloat(next);
    if (!isNaN(parsed)) {
      if (isCustom) {
        setCustomGrams(Math.min(300, parsed));
      } else {
        setServings(Math.min(food.maxServings, parsed));
      }
    }
  };

  const handleKeypadDelete = () => {
    setErrorMessage(null);
    if (keypadBuffer.length <= 1) {
      setKeypadBuffer('0');
      if (isCustom) setCustomGrams(0);
      else setServings(0);
    } else {
      const next = keypadBuffer.slice(0, -1);
      setKeypadBuffer(next);
      const parsed = parseFloat(next);
      if (!isNaN(parsed)) {
        if (isCustom) setCustomGrams(parsed);
        else setServings(parsed);
      }
    }
  };

  const handleKeypadClear = () => {
    triggerLightHaptic();
    setKeypadBuffer('0');
    if (isCustom) setCustomGrams(0);
    else setServings(0);
  };

  // Instant calculated protein amount
  const calculatedProtein = useMemo(() => {
    if (isCustom) {
      return Math.round(customGrams);
    }
    return Math.round(food.defaultProteinGrams * servings * 10) / 10;
  }, [isCustom, customGrams, food.defaultProteinGrams, servings]);

  const [isAddDisabled, setIsAddDisabled] = useState<boolean>(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Save entry and return home
  const handleAddProtein = async () => {
    if (isSaving || isAddDisabled) return;

    if (isCustom) {
      if (!customName.trim()) {
        setErrorMessage('Please enter a name for the food.');
        return;
      }
      if (customGrams <= 0) {
        setErrorMessage('Protein amount must be greater than 0g.');
        return;
      }
    } else {
      if (servings <= 0) {
        setErrorMessage('Serving size must be greater than 0.');
        return;
      }
    }

    setIsAddDisabled(true);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setIsAddDisabled(false);
    }, 600);

    setIsSaving(true);
    triggerSuccessHaptic();

    try {
      const entryId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const targetFoodId = isCustom ? 'custom' : food.id;

      await addLog({
        id: entryId,
        foodId: targetFoodId,
        foodName: isCustom ? customName.trim() : food.name,
        servings: isCustom ? 1 : servings,
        grams: calculatedProtein,
        iconSymbol: isCustom ? customEmoji : food.iconSymbol,
        source: 'food-entry',
      });

      // Return home and trigger Tank reaction with loggedFoodId
      router.replace({
        pathname: '/home',
        params: { justLogged: 'true', loggedFoodId: targetFoodId },
      });
    } catch (err) {
      console.warn('Failed to save food log:', err);
      setErrorMessage('Failed to save protein entry. Please try again.');
      setIsSaving(false);
    }
  };

  const presetServings = [0.5, 1, 1.5, 2, 3, 4];
  const presetCustomGrams = [15, 25, 35, 50, 75];

  return (
    <ScreenContainer scrollable={false} withHorizontalPadding={false} style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Cancel and return to home"
        >
          <Text style={styles.backButtonText}>✕ Cancel</Text>
        </TouchableOpacity>

        <Text style={styles.navTitle} numberOfLines={1}>
          {isCustom ? 'Custom Entry' : `Log ${food.name}`}
        </Text>

        <View style={[styles.badgePill, { backgroundColor: food.badgeColor + '25' }]}>
          <Text style={[styles.badgePillText, { color: food.badgeColor }]}>
            {food.iconSymbol} {isCustom ? 'Custom' : food.name}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* 1. Food Illustration & Hero Card */}
          <View style={[styles.heroCard, { borderColor: food.badgeColor + '40' }]}>
            <View style={[styles.iconCircle, { backgroundColor: food.badgeColor + '20' }]}>
              <Text style={styles.heroEmoji}>
                {isCustom ? customEmoji : food.iconSymbol}
              </Text>
            </View>

            <View style={styles.heroTextWrap}>
              {isCustom ? (
                <View style={styles.customNameInputWrap}>
                  <Text style={styles.inputLabel}>Food Name</Text>
                  <TextInput
                    style={styles.customNameInput}
                    value={customName}
                    onChangeText={setCustomName}
                    placeholder="e.g. Protein Bar, Greek Bowl"
                    placeholderTextColor={theme.colors.disabledText}
                    maxLength={32}
                    accessibilityLabel="Enter custom food name"
                  />
                </View>
              ) : (
                <>
                  <Text style={styles.foodTitle}>{food.name}</Text>
                  <Text style={styles.foodSubtitle}>{food.defaultServingLabel}</Text>
                  <Text style={styles.foodMetricHint}>
                    Base: ~{food.defaultProteinGrams}g protein per {food.servingUnitName}
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Custom Food Emoji Picker */}
          {isCustom && (
            <View style={styles.emojiPickerCard}>
              <Text style={styles.sectionSmallTitle}>Choose Icon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiRow}>
                {CUSTOM_EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.emojiChip,
                      customEmoji === emoji && styles.emojiChipSelected,
                    ]}
                    onPress={() => {
                      triggerLightHaptic();
                      setCustomEmoji(emoji);
                    }}
                  >
                    <Text style={styles.emojiChipText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* 2. Instant Live Calculated Protein Display */}
          <View style={styles.liveCalculationCard}>
            <Text style={styles.calculationLabel}>TOTAL PROTEIN</Text>
            <View style={styles.bigProteinRow}>
              <Text style={[styles.bigProteinNumber, { color: food.badgeColor }]}>
                {calculatedProtein}
              </Text>
              <Text style={styles.bigProteinUnit}>
                {profile.proteinUnit === 'oz' ? ' oz' : ' g'}
              </Text>
            </View>

            <Text style={styles.calculationBreakdown}>
              {isCustom
                ? `${calculatedProtein}g direct protein entry`
                : `${servings} ${servings === 1 ? 'serving' : 'servings'} × ${food.defaultProteinGrams}g = ${calculatedProtein}g protein`}
            </Text>
          </View>

          {/* Error Message if any */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          )}

          {/* 3. Serving-Size Controls (Stepper & Quick Presets) */}
          <View style={styles.controlsCard}>
            <View style={styles.stepperHeader}>
              <Text style={styles.stepperTitle}>
                {isCustom ? 'Adjust Protein Grams' : 'Adjust Servings'}
              </Text>
              <View style={styles.modeToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.modeToggleBtn,
                    activeInputMode === 'slider' && styles.modeToggleBtnActive,
                  ]}
                  onPress={() => {
                    triggerLightHaptic();
                    setActiveInputMode('slider');
                  }}
                >
                  <Text
                    style={[
                      styles.modeToggleText,
                      activeInputMode === 'slider' && styles.modeToggleTextActive,
                    ]}
                  >
                    Slider
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modeToggleBtn,
                    activeInputMode === 'keypad' && styles.modeToggleBtnActive,
                  ]}
                  onPress={() => {
                    triggerLightHaptic();
                    setActiveInputMode('keypad');
                  }}
                >
                  <Text
                    style={[
                      styles.modeToggleText,
                      activeInputMode === 'keypad' && styles.modeToggleTextActive,
                    ]}
                  >
                    Keypad
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Stepper Buttons Row */}
            <View style={styles.stepperActionRow}>
              <TouchableOpacity
                onPress={handleMinus}
                style={[styles.stepperButton, { borderColor: food.badgeColor }]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Decrease amount"
              >
                <Text style={[styles.stepperButtonText, { color: food.badgeColor }]}>−</Text>
              </TouchableOpacity>

              <View style={styles.stepperCenterDisplay}>
                <Text style={styles.stepperAmount}>
                  {isCustom ? `${customGrams} g` : `${servings}`}
                </Text>
                <Text style={styles.stepperUnitLabel}>
                  {isCustom ? 'protein grams' : food.servingUnitName}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handlePlus}
                style={[styles.stepperButton, { borderColor: food.badgeColor }]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Increase amount"
              >
                <Text style={[styles.stepperButtonText, { color: food.badgeColor }]}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Presets Chips */}
            <View style={styles.presetChipsRow}>
              {(isCustom ? presetCustomGrams : presetServings).map((val) => {
                const isSelected = isCustom ? customGrams === val : servings === val;
                return (
                  <TouchableOpacity
                    key={String(val)}
                    style={[
                      styles.presetChip,
                      isSelected && { backgroundColor: food.badgeColor, borderColor: food.badgeColor },
                    ]}
                    onPress={() => {
                      triggerLightHaptic();
                      if (isCustom) handleCustomGramsChange(val);
                      else handleServingChange(val);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Set to ${val} ${isCustom ? 'grams' : 'servings'}`}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        isSelected && styles.presetChipTextSelected,
                      ]}
                    >
                      {val}{isCustom ? 'g' : 'x'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 4. Draggable Amount Selector (Slider Mode) */}
            {activeInputMode === 'slider' && (
              <DraggableAmountSelector
                value={isCustom ? customGrams : servings}
                min={isCustom ? 5 : food.minServings}
                max={isCustom ? 150 : food.maxServings}
                step={isCustom ? 5 : food.stepServings}
                activeColor={food.badgeColor}
                unitLabel={isCustom ? 'grams' : food.servingUnitName}
                onValueChange={(val) => {
                  if (isCustom) handleCustomGramsChange(val);
                  else handleServingChange(val);
                }}
              />
            )}

            {/* 5. Numeric Keypad (Keypad Mode) */}
            {activeInputMode === 'keypad' && (
              <NumericKeypad
                onPressDigit={handleKeypadDigit}
                onPressDelete={handleKeypadDelete}
                onPressClear={handleKeypadClear}
                accentColor={food.badgeColor}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 6. Prominent Food-Coloured ADD PROTEIN Button */}
      <View style={styles.dockedFooter}>
        <TouchableOpacity
          style={[styles.addProteinButton, { backgroundColor: food.badgeColor }]}
          activeOpacity={0.85}
          onPress={handleAddProtein}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel={`Add ${calculatedProtein} grams protein to daily log`}
        >
          <Text style={styles.addProteinButtonText}>
            {isSaving ? 'ADDING...' : `ADD ${calculatedProtein}G PROTEIN`}
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flexOne: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.secondarySurface,
  },
  backButtonText: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  navTitle: {
    ...theme.typography.subtitle,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
  },
  badgePillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.md,
    borderWidth: 2,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: theme.spacing.md,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  heroEmoji: {
    fontSize: 34,
  },
  heroTextWrap: {
    flex: 1,
  },
  foodTitle: {
    ...theme.typography.title,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    color: theme.colors.textPrimary,
  },
  foodSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  foodMetricHint: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '700',
    marginTop: 4,
  },
  customNameInputWrap: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  customNameInput: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    backgroundColor: '#FAF5ED',
  },
  emojiPickerCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  sectionSmallTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  emojiRow: {
    gap: 8,
  },
  emojiChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.secondarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  emojiChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#FFE5CA',
  },
  emojiChipText: {
    fontSize: 20,
  },
  liveCalculationCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: theme.radii.xl,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  calculationLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  bigProteinRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bigProteinNumber: {
    fontSize: 48,
    fontWeight: '900',
    lineHeight: 56,
  },
  bigProteinUnit: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  calculationBreakdown: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#FDE8E8',
    borderRadius: theme.radii.md,
    padding: 10,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#F8B4B4',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9B1C1C',
    textAlign: 'center',
  },
  controlsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  stepperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  stepperTitle: {
    ...theme.typography.subtitle,
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F0E6D8',
    borderRadius: theme.radii.full,
    padding: 2,
  },
  modeToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
  },
  modeToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  modeToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  modeToggleTextActive: {
    color: theme.colors.textPrimary,
  },
  stepperActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: theme.spacing.sm,
  },
  stepperButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  stepperButtonText: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
  },
  stepperCenterDisplay: {
    alignItems: 'center',
  },
  stepperAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: theme.colors.textPrimary,
  },
  stepperUnitLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  presetChipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: theme.spacing.sm,
  },
  presetChip: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 8,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.secondarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  presetChipTextSelected: {
    color: '#FFFFFF',
  },
  dockedFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: Math.max(theme.spacing.md, Platform.OS === 'ios' ? 24 : 16),
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  addProteinButton: {
    height: 54,
    borderRadius: theme.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  addProteinButtonText: {
    ...theme.typography.button,
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 1,
  },
});
