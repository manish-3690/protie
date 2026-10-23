import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodLogEntry, getLocalDateString, shiftDateString } from './foodLogStorage';
import { WeekStart } from './onboardingStorage';

export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  target: number;
  unit: string;
  icon: string;
  isProOnly?: boolean;
}

export interface ChallengeProgress {
  challenge: WeeklyChallenge;
  current: number;
  target: number;
  progressPercent: number;
  isCompleted: boolean;
  isActive: boolean;
  isLocked: boolean;
}

export const ACTIVE_CHALLENGE_KEY = 'protie.active_challenge.v1';

export const WEEKLY_CHALLENGES: WeeklyChallenge[] = [
  {
    id: 'goal_5_days',
    title: 'Hit your goal 5 days this week',
    description: 'Reach or exceed your daily protein target 5 times this week.',
    target: 5,
    unit: 'days',
    icon: '🎯',
    isProOnly: false,
  },
  {
    id: 'before_10am_3x',
    title: 'Log protein before 10 AM 3 times',
    description: 'Fuel your mornings early with high quality protein 3 times this week.',
    target: 3,
    unit: 'mornings',
    icon: '⏰',
    isProOnly: false,
  },
  {
    id: 'try_3_foods',
    title: 'Try 3 different foods',
    description: 'Diversify your sources! Log at least 3 distinct protein foods this week.',
    target: 3,
    unit: 'foods',
    icon: '🥗',
    isProOnly: false,
  },
];

/**
 * Get active challenge id (defaults to 'goal_5_days').
 */
export async function getActiveChallengeId(): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_CHALLENGE_KEY);
    return raw || 'goal_5_days';
  } catch {
    return 'goal_5_days';
  }
}

/**
 * Set active challenge id for free users (pro users track all).
 */
export async function setActiveChallengeId(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(ACTIVE_CHALLENGE_KEY, id);
  } catch (error) {
    console.warn('Failed to set active challenge:', error);
  }
}

/**
 * Compute the date strings for the current calendar week.
 */
export function getCurrentWeekDates(
  referenceDate: Date = new Date(),
  weekStart: WeekStart = 'monday'
): string[] {
  const dayOfWeek = referenceDate.getDay(); // 0 is Sunday, 1 is Monday...
  let diffToStart = 0;

  if (weekStart === 'monday') {
    // If today is Sunday (0), it's 6 days after Monday
    diffToStart = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  } else {
    // Week starts on Sunday (0)
    diffToStart = -dayOfWeek;
  }

  const startOfWeek = new Date(referenceDate);
  startOfWeek.setDate(referenceDate.getDate() + diffToStart);

  const dates: string[] = [];
  const startStr = getLocalDateString(startOfWeek);

  for (let i = 0; i < 7; i++) {
    dates.push(shiftDateString(startStr, i));
  }
  return dates;
}

/**
 * Calculate progress for all 3 challenges dynamically from local food logs.
 */
export async function getWeeklyChallengesProgress(
  allLogs: FoodLogEntry[],
  dailyGoalGrams: number = 100,
  weekStart: WeekStart = 'monday',
  isPro: boolean = false
): Promise<ChallengeProgress[]> {
  const activeId = await getActiveChallengeId();
  const weekDates = getCurrentWeekDates(new Date(), weekStart);
  const weekDateSet = new Set(weekDates);

  // Filter logs that occurred in the current week
  const weekLogs = allLogs.filter((log) => weekDateSet.has(log.date));

  // 1. Goal 5 days calculation: count of unique days where total >= goal
  const dayTotals: Record<string, number> = {};
  for (const log of weekLogs) {
    dayTotals[log.date] = (dayTotals[log.date] || 0) + (Number(log.proteinGrams) || 0);
  }
  let goalHitDays = 0;
  for (const d of weekDates) {
    if ((dayTotals[d] || 0) >= dailyGoalGrams && dailyGoalGrams > 0) {
      goalHitDays += 1;
    }
  }

  // 2. Before 10 AM 3 times calculation: count of unique days with a log before 10 AM
  const morningLogDays = new Set<string>();
  for (const log of weekLogs) {
    if (log.timestamp) {
      const hour = new Date(log.timestamp).getHours();
      if (hour < 10) {
        morningLogDays.add(log.date);
      }
    }
  }
  const morningCount = morningLogDays.size;

  // 3. Try 3 different foods calculation: count of distinct foodIds logged this week
  const distinctFoods = new Set<string>();
  for (const log of weekLogs) {
    if (log.foodId) {
      distinctFoods.add(log.foodId);
    }
  }
  const foodCount = distinctFoods.size;

  const currentValues: Record<string, number> = {
    goal_5_days: goalHitDays,
    before_10am_3x: morningCount,
    try_3_foods: foodCount,
  };

  return WEEKLY_CHALLENGES.map((challenge) => {
    const current = Math.min(challenge.target, currentValues[challenge.id] || 0);
    const progressPercent = Math.min(100, Math.round((current / challenge.target) * 100));
    const isCompleted = current >= challenge.target;

    // Pro users have all 3 active simultaneously.
    // Free users have one active challenge at a time; others are locked extras.
    const isActive = isPro ? true : challenge.id === activeId;
    const isLocked = isPro ? false : challenge.id !== activeId;

    return {
      challenge,
      current,
      target: challenge.target,
      progressPercent,
      isCompleted,
      isActive,
      isLocked,
    };
  });
}
