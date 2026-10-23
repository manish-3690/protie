import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requestNotificationPermission,
  cancelDailyReminder,
  scheduleDailyReminder,
  REMINDER_NOTIFICATION_ID,
  cancelStreakReminder,
  scheduleStreakReminder,
  STREAK_REMINDER_NOTIFICATION_ID,
} from './notifications';

export {
  requestNotificationPermission,
  cancelDailyReminder,
  scheduleDailyReminder,
  REMINDER_NOTIFICATION_ID,
  cancelStreakReminder,
  scheduleStreakReminder,
  STREAK_REMINDER_NOTIFICATION_ID,
};

export type ProteinUnit = 'g' | 'oz';
export type WeekStart = 'sunday' | 'monday';
export type GoalMethod = 'calculated' | 'manual';

export interface InitialProteinEntry {
  id: string;
  foodId: string;
  foodName: string;
  amountGrams: number;
  proteinGrams: number;
  createdAt: string;
}

export interface OnboardingData {
  completed: boolean;
  onboardingComplete?: boolean;
  proteinUnit: ProteinUnit;
  weekStart: WeekStart;
  dailyGoalGrams: number | null;
  goalMethod: GoalMethod | null;
  age: number | null;
  gender: string | null;
  heightCm: number | null;
  heightUnit: 'cm' | 'ft_in';
  weightKg: number | null;
  weightUnit: 'kg' | 'lbs';
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  streakReminderEnabled?: boolean;
  streakReminderHour?: number;
  streakReminderMinute?: number;
  initialProteinEntries: InitialProteinEntry[];
}

export const GRAMS_PER_OZ = 28.3495;
export const ONBOARDING_STORAGE_KEY = 'protie.onboarding.v1';
export const LEGACY_BULKO_STORAGE_KEY = 'bulko.onboarding.v1';

export const DEFAULT_ONBOARDING_DATA: OnboardingData = {
  completed: false,
  onboardingComplete: false,
  proteinUnit: 'g',
  weekStart: 'monday',
  dailyGoalGrams: null,
  goalMethod: null,
  age: null,
  gender: null,
  heightCm: null,
  heightUnit: 'cm',
  weightKg: null,
  weightUnit: 'kg',
  reminderEnabled: false,
  reminderHour: 12, // Default 12:00 PM local
  reminderMinute: 0,
  streakReminderEnabled: true,
  streakReminderHour: 20, // Default 8:30 PM local
  streakReminderMinute: 30,
  initialProteinEntries: [],
};

/**
 * Format a canonical protein amount in grams into the user's preferred unit for display.
 */
export function formatProteinAmount(
  grams: number | null | undefined,
  unit: ProteinUnit = 'g'
): string {
  if (grams == null || isNaN(grams)) return `0 ${unit}`;
  if (unit === 'oz') {
    const oz = grams / GRAMS_PER_OZ;
    // Display to 1 decimal place if < 10, otherwise rounded or 1 dec
    return `${oz.toFixed(1)} oz`;
  }
  return `${Math.round(grams)} g`;
}

/**
 * Convert ounces to canonical grams.
 */
export function ouncesToGrams(oz: number): number {
  return oz * GRAMS_PER_OZ;
}

/**
 * Convert pounds to kilograms.
 */
export function lbsToKg(lbs: number): number {
  return lbs * 0.45359237;
}

/**
 * Convert feet & inches to centimetres.
 */
export function ftInToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * 2.54;
}

/**
 * Retrieve stored onboarding data with fallbacks for missing or malformed records.
 * Includes a one-time migration from the legacy 'bulko.onboarding.v1' key.
 */
export async function getOnboardingData(): Promise<OnboardingData> {
  console.log('[Storage] getOnboardingData: reading from AsyncStorage...');
  try {
    let raw = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
    // Automatic one-time migration from legacy storage key
    if (!raw) {
      const legacyRaw = await AsyncStorage.getItem(LEGACY_BULKO_STORAGE_KEY);
      if (legacyRaw) {
        console.log('[Storage] getOnboardingData: migrating legacy bulko.onboarding.v1 key');
        raw = legacyRaw;
        await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, legacyRaw);
        await AsyncStorage.removeItem(LEGACY_BULKO_STORAGE_KEY);
      }
    }

    if (!raw) {
      console.log('[Storage] getOnboardingData: no records found, returning default');
      return { ...DEFAULT_ONBOARDING_DATA };
    }
    const parsed = JSON.parse(raw);
    const isComplete = Boolean(parsed.completed || parsed.onboardingComplete);
    const result: OnboardingData = {
      ...DEFAULT_ONBOARDING_DATA,
      ...parsed,
      completed: isComplete,
      onboardingComplete: isComplete,
      initialProteinEntries: Array.isArray(parsed.initialProteinEntries)
        ? parsed.initialProteinEntries
        : [],
    };
    console.log('[Storage] getOnboardingData: loaded data, completed =', result.completed);
    return result;
  } catch (error) {
    console.warn('[Storage] Failed to load onboarding data from AsyncStorage:', error);
    return { ...DEFAULT_ONBOARDING_DATA };
  }
}

/**
 * Check if the onboarding has been completed.
 */
export function isOnboardingComplete(data: OnboardingData | null | undefined): boolean {
  if (!data) return false;
  return Boolean(data.completed || data.onboardingComplete);
}

/**
 * Update partial onboarding data safely without overwriting other stored fields.
 */
export async function saveOnboardingData(
  updates: Partial<OnboardingData>
): Promise<OnboardingData> {
  try {
    const current = await getOnboardingData();
    if (updates.completed !== undefined || updates.onboardingComplete !== undefined) {
      const isComplete = Boolean(updates.completed ?? updates.onboardingComplete);
      updates.completed = isComplete;
      updates.onboardingComplete = isComplete;
    }
    const merged: OnboardingData = {
      ...current,
      ...updates,
    };
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch (error) {
    console.error('Failed to save onboarding data to AsyncStorage:', error);
    throw error;
  }
}

/**
 * Clear onboarding data (useful for reset or fresh start).
 */
export async function clearOnboardingData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      ONBOARDING_STORAGE_KEY,
      LEGACY_BULKO_STORAGE_KEY,
      'protie.food_logs.v1',
      'protie.streak.v1',
      'protie.celebrated_days.v1',
      'protie.install_date.v1',
      'protie.selected_skin.v1',
    ]);
    await cancelDailyReminder();
    await cancelStreakReminder();
  } catch (error) {
    console.warn('Failed to clear onboarding data:', error);
  }
}

