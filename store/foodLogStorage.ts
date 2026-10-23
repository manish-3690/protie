import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProteinFoodById } from '@/constants/proteinFoods';

export interface FoodLogEntry {
  id: string;
  date: string; // YYYY-MM-DD in local time
  timestamp: number; // Unix timestamp ms
  foodId: string;
  foodName: string;
  servingCount: number;
  proteinGrams: number;
  iconSymbol?: string;
}

export interface AddLogParams {
  foodId: string;
  grams: number;
  source?: string;
  id?: string;
  foodName?: string;
  servings?: number;
  iconSymbol?: string;
  date?: string;
  timestamp?: number;
}

export interface DailyStreakData {
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string | null; // YYYY-MM-DD
}

export const FOOD_LOGS_STORAGE_KEY = 'protie.food_logs.v1';
export const STREAK_STORAGE_KEY = 'protie.streak.v1';
export const CELEBRATED_DAYS_KEY = 'protie.celebrated_days.v1';
export const INSTALL_DATE_STORAGE_KEY = 'protie.install_date.v1';
export const MIGRATION_STORAGE_KEY = 'protie.migration.no_foodid_dedupe.v1';

/**
 * Get local date string in YYYY-MM-DD format.
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format timestamp into friendly 12-hour time (e.g. "1:45 PM").
 */
export function formatLogTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Get yesterday's date string in YYYY-MM-DD local format.
 */
export function getYesterdayDateString(dateStr: string = getLocalDateString()): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return getLocalDateString(date);
}

/**
 * Shift a YYYY-MM-DD date by N days (positive or negative).
 */
export function shiftDateString(dateStr: string, dayOffset: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + dayOffset);
  return getLocalDateString(date);
}

/**
 * Get or initialize the user's install date (YYYY-MM-DD).
 * Days before the install date are disabled.
 */
export async function getInstallDate(): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem(INSTALL_DATE_STORAGE_KEY);
    if (raw) return raw;

    // If no install date stored yet, check earliest food log date
    const allLogs = await getAllFoodLogs();
    let earliest = getLocalDateString();
    if (allLogs.length > 0) {
      for (const log of allLogs) {
        if (log.date && log.date < earliest) {
          earliest = log.date;
        }
      }
    }
    await AsyncStorage.setItem(INSTALL_DATE_STORAGE_KEY, earliest);
    return earliest;
  } catch (error) {
    console.warn('Failed to get install date:', error);
    return getLocalDateString();
  }
}

/**
 * Set the install date explicitly (e.g. for testing / demo data seeding).
 */
export async function setInstallDate(dateStr: string): Promise<void> {
  try {
    await AsyncStorage.setItem(INSTALL_DATE_STORAGE_KEY, dateStr);
  } catch (error) {
    console.warn('Failed to set install date:', error);
  }
}

let migrationHasRun = false;

/**
 * One-time migration on app start:
 * Remove entries with no foodId that match another entry's grams within 10 seconds.
 */
export async function runFoodLogMigration(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(FOOD_LOGS_STORAGE_KEY);
    if (!raw) return;

    const allLogs: FoodLogEntry[] = JSON.parse(raw);
    if (!Array.isArray(allLogs) || allLogs.length === 0) return;

    let modified = false;
    const cleaned: FoodLogEntry[] = [];

    for (let i = 0; i < allLogs.length; i++) {
      const entry = allLogs[i];
      const hasValidFoodId = Boolean(entry.foodId && entry.foodId.trim() !== '' && entry.foodId !== 'unknown');

      if (!hasValidFoodId) {
        // Check if there is another entry with a valid foodId that has matching grams within 10 seconds
        const duplicateMatch = allLogs.some((other, oIdx) => {
          if (oIdx === i) return false;
          const otherHasValidFoodId = Boolean(other.foodId && other.foodId.trim() !== '' && other.foodId !== 'unknown');
          if (!otherHasValidFoodId) return false;
          const sameGrams = Math.abs(Number(entry.proteinGrams) - Number(other.proteinGrams)) < 0.1;
          const timeDiff = Math.abs((entry.timestamp || 0) - (other.timestamp || 0));
          return sameGrams && timeDiff <= 10000;
        });

        if (duplicateMatch) {
          // Remove legacy entry with no foodId that matches another entry's grams within 10 seconds
          modified = true;
          continue;
        }

        // If it does not match another entry, assign a fallback foodId so it never has empty foodId
        entry.foodId = 'other';
        if (!entry.iconSymbol) entry.iconSymbol = '⚡';
        modified = true;
      }

      cleaned.push(entry);
    }

    if (modified) {
      await AsyncStorage.setItem(FOOD_LOGS_STORAGE_KEY, JSON.stringify(cleaned));
      await recalculateStreakFromLogs(cleaned);
    }
  } catch (error) {
    console.warn('Failed to run food log migration:', error);
  }
}

/**
 * Retrieve all food logs stored in the app.
 */
export async function getAllFoodLogs(): Promise<FoodLogEntry[]> {
  try {
    if (!migrationHasRun) {
      migrationHasRun = true;
      await runFoodLogMigration();
    }

    const raw = await AsyncStorage.getItem(FOOD_LOGS_STORAGE_KEY);
    if (!raw) return [];
    const allLogs: FoodLogEntry[] = JSON.parse(raw);
    if (!Array.isArray(allLogs)) return [];

    // Dedupe guard keyed by entry id
    const seenIds = new Set<string>();
    return allLogs.filter((entry) => {
      if (!entry.id || seenIds.has(entry.id)) return false;
      seenIds.add(entry.id);
      return true;
    });
  } catch (error) {
    console.warn('Failed to load all food logs:', error);
    return [];
  }
}

/**
 * Retrieve all food logs for a given date (defaults to today).
 * Dedupes entries by id.
 */
export async function getFoodLogsForDate(dateStr: string = getLocalDateString()): Promise<FoodLogEntry[]> {
  const allLogs = await getAllFoodLogs();
  const dateLogs = allLogs.filter((entry) => entry.date === dateStr);
  return dateLogs.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * The ONE canonical write path for adding a food log.
 * Guaranteed idempotency: if an entry with the target id already exists,
 * the second write is ignored.
 * Resolves foodName and iconSymbol strictly from foodId (no fallback to lightning for standard foods).
 */
export async function addLog(params: AddLogParams): Promise<FoodLogEntry> {
  try {
    const allLogs = await getAllFoodLogs();
    const targetId = params.id || `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Idempotency check: ignore duplicate write with identical id
    const existingIndex = allLogs.findIndex((e) => e.id === targetId);
    if (existingIndex >= 0) {
      return allLogs[existingIndex];
    }

    // Resolve food details
    const standardFood = getProteinFoodById(params.foodId);
    let foodName = params.foodName;
    let iconSymbol = params.iconSymbol;

    if (standardFood) {
      foodName = foodName || standardFood.name;
      iconSymbol = standardFood.iconSymbol;
    } else if (params.foodId === 'custom' || params.foodId === 'other') {
      foodName = foodName || 'Custom';
      iconSymbol = iconSymbol || '⚡';
    } else {
      foodName = foodName || 'Food';
      iconSymbol = iconSymbol || '🥚';
    }

    const targetDate = params.date || getLocalDateString();
    const newLog: FoodLogEntry = {
      id: targetId,
      date: targetDate,
      timestamp: params.timestamp || Date.now(),
      foodId: params.foodId || 'custom',
      foodName,
      servingCount: Math.max(0.1, params.servings ?? 1),
      proteinGrams: Math.max(0, Math.round(params.grams * 10) / 10),
      iconSymbol,
    };

    allLogs.push(newLog);
    await AsyncStorage.setItem(FOOD_LOGS_STORAGE_KEY, JSON.stringify(allLogs));
    await recalculateStreakFromLogs(allLogs);
    return newLog;
  } catch (error) {
    console.error('Failed to add food log via addLog:', error);
    throw error;
  }
}

/**
 * Compatibility wrapper pointing to canonical addLog.
 */
export async function addFoodLog(
  entry: Omit<FoodLogEntry, 'id' | 'timestamp' | 'date'> & { id?: string; timestamp?: number },
  dateStr: string = getLocalDateString()
): Promise<FoodLogEntry> {
  return addLog({
    id: entry.id,
    foodId: entry.foodId,
    foodName: entry.foodName,
    grams: entry.proteinGrams,
    servings: entry.servingCount,
    iconSymbol: entry.iconSymbol,
    date: dateStr,
    timestamp: entry.timestamp,
  });
}

/**
 * Restore a deleted food entry (used by Undo action).
 */
export async function restoreFoodLog(entry: FoodLogEntry): Promise<void> {
  await addLog({
    id: entry.id,
    foodId: entry.foodId,
    foodName: entry.foodName,
    grams: entry.proteinGrams,
    servings: entry.servingCount,
    iconSymbol: entry.iconSymbol,
    date: entry.date,
    timestamp: entry.timestamp,
    source: 'restore',
  });
}

/**
 * Delete a food log entry by id.
 * Automatically recalculates streak.
 */
export async function deleteFoodLog(id: string): Promise<void> {
  try {
    const allLogs = await getAllFoodLogs();
    const filtered = allLogs.filter((entry) => entry.id !== id);
    await AsyncStorage.setItem(FOOD_LOGS_STORAGE_KEY, JSON.stringify(filtered));
    await recalculateStreakFromLogs(filtered);
  } catch (error) {
    console.error('Failed to delete food log:', error);
    throw error;
  }
}

/**
 * Clear all logs for a specific date (useful for settings / test reset).
 */
export async function clearDateFoodLogs(dateStr: string = getLocalDateString()): Promise<void> {
  try {
    const allLogs = await getAllFoodLogs();
    const filtered = allLogs.filter((entry) => entry.date !== dateStr);
    await AsyncStorage.setItem(FOOD_LOGS_STORAGE_KEY, JSON.stringify(filtered));
    await recalculateStreakFromLogs(filtered);
  } catch (error) {
    console.error('Failed to clear date food logs:', error);
  }
}

/**
 * Completely clear all food logs and streak records (used on restart onboarding).
 */
export async function clearAllFoodLogs(): Promise<void> {
  try {
    migrationHasRun = false;
    await AsyncStorage.multiRemove([
      FOOD_LOGS_STORAGE_KEY,
      STREAK_STORAGE_KEY,
      CELEBRATED_DAYS_KEY,
      INSTALL_DATE_STORAGE_KEY,
      MIGRATION_STORAGE_KEY,
    ]);
    const emptyStreak: DailyStreakData = {
      currentStreak: 0,
      bestStreak: 0,
      lastCompletedDate: null,
    };
    await AsyncStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(emptyStreak));
  } catch (error) {
    console.error('Failed to clear all food logs:', error);
  }
}

/**
 * Calculate total protein grams logged for today or any given entry list.
 */
export function calculateTotalProtein(entries: FoodLogEntry[]): number {
  if (!entries || entries.length === 0) return 0;
  const sum = entries.reduce((acc, curr) => acc + (Number(curr.proteinGrams) || 0), 0);
  return Math.round(sum * 10) / 10;
}

/**
 * Recalculate streak dynamically from persistent food logs.
 * STAGE 5 SPECIFICATION: Streak = consecutive days with at least one log.
 * Editing a past day updates totals and streak.
 */
export async function recalculateStreakFromLogs(logs?: FoodLogEntry[]): Promise<DailyStreakData> {
  try {
    const allLogs = logs ?? (await getAllFoodLogs());
    const loggedDates = new Set<string>();

    for (const log of allLogs) {
      if (log.date && Number(log.proteinGrams) > 0) {
        loggedDates.add(log.date);
      }
    }

    if (loggedDates.size === 0) {
      const emptyStreak: DailyStreakData = {
        currentStreak: 0,
        bestStreak: 0,
        lastCompletedDate: null,
      };
      await AsyncStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(emptyStreak));
      return emptyStreak;
    }

    // 1. Calculate current active streak ending at today (or yesterday if nothing logged today)
    const todayStr = getLocalDateString();
    const yesterdayStr = getYesterdayDateString(todayStr);

    let currentStreak = 0;
    let anchorDate: string | null = null;

    if (loggedDates.has(todayStr)) {
      anchorDate = todayStr;
    } else if (loggedDates.has(yesterdayStr)) {
      anchorDate = yesterdayStr;
    }

    if (anchorDate) {
      let checkDate = anchorDate;
      while (loggedDates.has(checkDate)) {
        currentStreak += 1;
        checkDate = getYesterdayDateString(checkDate);
      }
    }

    // 2. Calculate best streak across all chronological dates
    const sortedDates = Array.from(loggedDates).sort();
    let bestStreak = 0;
    let runningStreak = 0;
    let prevDate: string | null = null;

    for (const d of sortedDates) {
      if (!prevDate) {
        runningStreak = 1;
      } else {
        const expectedNext = shiftDateString(prevDate, 1);
        if (d === expectedNext) {
          runningStreak += 1;
        } else {
          runningStreak = 1;
        }
      }
      if (runningStreak > bestStreak) {
        bestStreak = runningStreak;
      }
      prevDate = d;
    }

    if (currentStreak > bestStreak) {
      bestStreak = currentStreak;
    }

    // Find the latest completed date
    let lastCompletedDate: string | null = null;
    if (loggedDates.has(todayStr)) {
      lastCompletedDate = todayStr;
    } else if (loggedDates.has(yesterdayStr)) {
      lastCompletedDate = yesterdayStr;
    } else if (sortedDates.length > 0) {
      lastCompletedDate = sortedDates[sortedDates.length - 1];
    }

    const streakData: DailyStreakData = {
      currentStreak,
      bestStreak,
      lastCompletedDate,
    };

    await AsyncStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(streakData));
    return streakData;
  } catch (error) {
    console.warn('Failed to recalculate streak:', error);
    return { currentStreak: 0, bestStreak: 0, lastCompletedDate: null };
  }
}

/**
 * Retrieve persistent streak data.
 * Always dynamically syncs with persistent food logs.
 */
export async function getStreakData(): Promise<DailyStreakData> {
  return recalculateStreakFromLogs();
}

/**
 * Set persistent streak data directly (used for testing and resets).
 */
export async function setStreakData(streak: DailyStreakData): Promise<void> {
  try {
    await AsyncStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(streak));
  } catch (error) {
    console.warn('Failed to set streak data:', error);
  }
}

/**
 * Update streak when daily goal is reached (>= 100%).
 * Returns updated streak and whether this is a brand new goal achievement for today.
 */
export async function checkAndUpdateStreak(
  todayTotalGrams: number,
  goalGrams: number
): Promise<{ streak: DailyStreakData; isNewGoalCelebration: boolean }> {
  const currentStreakData = await recalculateStreakFromLogs();
  const todayStr = getLocalDateString();

  if (goalGrams <= 0 || todayTotalGrams < goalGrams) {
    return { streak: currentStreakData, isNewGoalCelebration: false };
  }

  const alreadyCelebrated = await hasCelebratedToday(todayStr);

  return {
    streak: currentStreakData,
    isNewGoalCelebration: !alreadyCelebrated,
  };
}

/**
 * Check if celebration has already been shown today.
 */
export async function hasCelebratedToday(dateStr: string = getLocalDateString()): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(CELEBRATED_DAYS_KEY);
    if (!raw) return false;
    const celebrated: string[] = JSON.parse(raw);
    return Array.isArray(celebrated) && celebrated.includes(dateStr);
  } catch {
    return false;
  }
}

/**
 * Record that today has been celebrated so it won't show again on re-render.
 */
export async function markCelebratedToday(dateStr: string = getLocalDateString()): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(CELEBRATED_DAYS_KEY);
    let celebrated: string[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(celebrated)) celebrated = [];
    if (!celebrated.includes(dateStr)) {
      celebrated.push(dateStr);
      if (celebrated.length > 30) celebrated = celebrated.slice(-30);
      await AsyncStorage.setItem(CELEBRATED_DAYS_KEY, JSON.stringify(celebrated));
    }
  } catch (error) {
    console.warn('Failed to mark celebrated today:', error);
  }
}

/**
 * Seed 14 days of realistic demo data for testing history, week stats, and calendar.
 * Sets the install date to 14 days ago so all 14 days are active and enabled.
 */
export async function seedDemoData14Days(dailyGoalGrams: number = 120): Promise<void> {
  const sampleFoods = [
    { foodId: 'eggs', foodName: 'Eggs (3 large)', proteinGrams: 18, iconSymbol: '🥚' },
    { foodId: 'chicken-breast', foodName: 'Grilled Chicken Breast', proteinGrams: 42, iconSymbol: '🍗' },
    { foodId: 'whey-isolate', foodName: 'Whey Protein Shake', proteinGrams: 25, iconSymbol: '🥛' },
    { foodId: 'greek-yogurt', foodName: 'Greek Yogurt (1 cup)', proteinGrams: 20, iconSymbol: '🥣' },
    { foodId: 'salmon', foodName: 'Baked Salmon Fillet', proteinGrams: 34, iconSymbol: '🐟' },
    { foodId: 'tofu', foodName: 'Firm Tofu (200g)', proteinGrams: 24, iconSymbol: '🧈' },
    { foodId: 'protein-bar', foodName: 'Protein Crunch Bar', proteinGrams: 20, iconSymbol: '🍫' },
  ];

  const now = new Date();
  const installDateStr = shiftDateString(getLocalDateString(now), -13);
  await setInstallDate(installDateStr);

  const demoLogs: FoodLogEntry[] = [];

  // Goal hit pattern for the past 14 days:
  // Days 0 to 13 (0 is 13 days ago, 13 is today)
  // Let 10 out of 14 days hit or exceed the goal!
  const goalHitSchedule = [
    true,  // -13 days (hit)
    true,  // -12 days (hit)
    false, // -11 days (missed, e.g. 70g)
    true,  // -10 days (hit)
    true,  // -9 days (hit)
    true,  // -8 days (hit)
    true,  // -7 days (hit)
    false, // -6 days (missed, e.g. 85g)
    true,  // -5 days (hit)
    true,  // -4 days (hit)
    false, // -3 days (missed, e.g. 60g)
    true,  // -2 days (hit)
    true,  // -1 day (hit)
    true,  // Today (hit)
  ];

  for (let i = 0; i < 14; i++) {
    const dayOffset = -13 + i;
    const dateStr = shiftDateString(getLocalDateString(now), dayOffset);
    const shouldHitGoal = goalHitSchedule[i];

    // Target protein for this day
    const targetDayProtein = shouldHitGoal
      ? Math.round(dailyGoalGrams * (1.02 + ((i * 3) % 25) / 100))
      : Math.round(dailyGoalGrams * 0.55 + ((i * 5) % 20));

    let currentDayProtein = 0;
    let foodIdx = i % sampleFoods.length;

    // Distribute across 2 to 4 meals
    while (currentDayProtein < targetDayProtein) {
      const food = sampleFoods[foodIdx % sampleFoods.length];
      const remaining = targetDayProtein - currentDayProtein;
      const servingCount = remaining < food.proteinGrams ? 1 : 1;
      const proteinToAdd = Math.min(remaining, food.proteinGrams * servingCount);

      const timestamp = new Date(dateStr + 'T12:00:00').getTime() + demoLogs.length * 3600000;
      demoLogs.push({
        id: `demo-${dateStr}-${demoLogs.length}`,
        date: dateStr,
        timestamp,
        foodId: food.foodId,
        foodName: food.foodName,
        servingCount: 1,
        proteinGrams: Math.round(proteinToAdd * 10) / 10,
        iconSymbol: food.iconSymbol,
      });

      currentDayProtein += proteinToAdd;
      foodIdx++;
    }
  }

  await AsyncStorage.setItem(FOOD_LOGS_STORAGE_KEY, JSON.stringify(demoLogs));
  await recalculateStreakFromLogs(demoLogs);
}
