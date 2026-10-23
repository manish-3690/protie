import AsyncStorage from '@react-native-async-storage/async-storage';

export const CELEBRATED_MILESTONES_KEY = 'protie.celebrated_milestones.v1';

export const STREAK_MILESTONES = [3, 7, 14, 30] as const;
export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

export interface MilestoneMeta {
  days: StreakMilestone;
  title: string;
  badge: string;
  message: string;
}

export const MILESTONE_DETAILS: Record<StreakMilestone, MilestoneMeta> = {
  3: {
    days: 3,
    title: '3-Day Streak! 🔥',
    badge: 'BRONZE CONSISTENCY',
    message: 'Three days in a row! You are creating an unstoppable habit with Tank.',
  },
  7: {
    days: 7,
    title: '7-Day Streak! ⚡',
    badge: 'SILVER HABIT',
    message: 'A whole week of dedication! Tank is feeling bigger and stronger.',
  },
  14: {
    days: 14,
    title: '14-Day Streak! 🏆',
    badge: 'GOLD GAINS',
    message: 'Two straight weeks of hitting your targets. Your muscle consistency is unmatched!',
  },
  30: {
    days: 30,
    title: '30-Day Streak! 👑',
    badge: 'LEGENDARY TITAN',
    message: 'A whole month of pure discipline! You are officially a Protie Legend.',
  },
};

/**
 * Get all streak milestones that have already been celebrated.
 */
export async function getCelebratedMilestones(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(CELEBRATED_MILESTONES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to load celebrated milestones:', error);
    return [];
  }
}

/**
 * Mark a milestone as celebrated so it only shows once.
 */
export async function markMilestoneCelebrated(milestone: number): Promise<void> {
  try {
    const existing = await getCelebratedMilestones();
    if (!existing.includes(milestone)) {
      const updated = [...existing, milestone];
      await AsyncStorage.setItem(CELEBRATED_MILESTONES_KEY, JSON.stringify(updated));
    }
  } catch (error) {
    console.warn('Failed to mark milestone celebrated:', error);
  }
}

/**
 * Check if the user has reached an uncelebrated milestone (3, 7, 14, 30 days).
 * Returns the milestone number if uncelebrated, or null.
 */
export async function checkUncelebratedMilestone(currentStreak: number): Promise<StreakMilestone | null> {
  if (currentStreak < 3) return null;

  try {
    const celebrated = await getCelebratedMilestones();

    // Check descending so highest eligible milestone triggers
    for (let i = STREAK_MILESTONES.length - 1; i >= 0; i--) {
      const m = STREAK_MILESTONES[i];
      if (currentStreak >= m && !celebrated.includes(m)) {
        return m;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Clear all celebrated milestones (used on restart onboarding).
 */
export async function resetCelebratedMilestones(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CELEBRATED_MILESTONES_KEY);
  } catch (error) {
    console.warn('Failed to reset celebrated milestones:', error);
  }
}
