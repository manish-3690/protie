import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { theme } from '@/constants/theme';
import { TankMascot } from '@/components/TankMascot';
import { WeeklyChallengesCard } from '@/components/challenges/WeeklyChallengesCard';
import {
  DailyStreakData,
  getStreakData,
  getAllFoodLogs,
  getLocalDateString,
  shiftDateString,
} from '@/store/foodLogStorage';
import { getOnboardingData } from '@/store/onboardingStorage';
import { getIsPro } from '@/store/purchaseStorage';
import {
  ChallengeProgress,
  getWeeklyChallengesProgress,
} from '@/store/challengeStorage';
import { STREAK_MILESTONES, MILESTONE_DETAILS } from '@/store/milestoneStorage';

/**
 * Dynamic Tank message generator based on streak length.
 */
function getTankStreakMessage(streak: number): string {
  if (streak === 0) {
    return 'Start your streak today! Every scoop and bite counts toward your goals.';
  }
  if (streak <= 2) {
    return 'Off to a strong start! Keep the momentum going today.';
  }
  if (streak <= 6) {
    return 'Tank is feeling pumped! Consistency is building muscle and habit.';
  }
  if (streak <= 13) {
    return "1 week strong! You're an absolute machine, keep fueling up.";
  }
  if (streak <= 29) {
    return 'Two weeks of pure gains! Tank is completely unstoppable with you.';
  }
  return "Legendary discipline! You're a true champion of consistency.";
}

export default function StreakScreen() {
  const { width: windowWidth } = useWindowDimensions();

  const [streakData, setStreakData] = useState<DailyStreakData>({
    currentStreak: 0,
    bestStreak: 0,
    lastCompletedDate: null,
  });
  const [loggedDates, setLoggedDates] = useState<Set<string>>(new Set());
  const [challenges, setChallenges] = useState<ChallengeProgress[]>([]);
  const [isPro, setIsPro] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [streak, profile, allLogs, proStatus] = await Promise.all([
        getStreakData(),
        getOnboardingData(),
        getAllFoodLogs(),
        getIsPro(),
      ]);

      setStreakData(streak);
      setIsPro(proStatus);
      const goal = profile.dailyGoalGrams || 100;
      
      // Unique logged dates
      const dates = new Set<string>();
      for (const log of allLogs) {
        if (log.date && Number(log.proteinGrams) > 0) {
          dates.add(log.date);
        }
      }
      setLoggedDates(dates);

      // Challenges progress
      const progress = await getWeeklyChallengesProgress(
        allLogs,
        goal,
        profile.weekStart || 'monday',
        proStatus
      );
      setChallenges(progress);
    } catch (err) {
      console.warn('Failed to load streak screen data:', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Compute 7-day strip (last 6 days + today)
  const todayStr = getLocalDateString();
  const past7Days: { dateStr: string; dayName: string; isToday: boolean; hasLogged: boolean }[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const dStr = shiftDateString(todayStr, -i);
    const dObj = new Date(dStr + 'T12:00:00');
    past7Days.push({
      dateStr: dStr,
      dayName: dayNames[dObj.getDay()],
      isToday: dStr === todayStr,
      hasLogged: loggedDates.has(dStr),
    });
  }

  const tankMessage = getTankStreakMessage(streakData.currentStreak);
  const mascotDimension = Math.min(130, windowWidth * 0.32);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Daily Streak</Text>
        <View style={styles.navRightPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Streak Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.streakFlameWrap}>
            <Text style={styles.flameEmoji}>🔥</Text>
          </View>

          <Text style={styles.currentStreakNumber}>
            {streakData.currentStreak}
          </Text>
          <Text style={styles.currentStreakLabel}>
            {streakData.currentStreak === 1 ? 'DAY STREAK' : 'DAYS STREAK'}
          </Text>

          <View style={styles.bestStreakPill}>
            <Text style={styles.bestStreakText}>
              🏆 Best Streak: {streakData.bestStreak} {streakData.bestStreak === 1 ? 'day' : 'days'}
            </Text>
          </View>
        </View>

        {/* 7-Day Dots Strip */}
        <View style={styles.dotsCard}>
          <Text style={styles.dotsCardTitle}>PAST 7 DAYS</Text>
          <View style={styles.dotsRow}>
            {past7Days.map((day) => {
              return (
                <View key={day.dateStr} style={styles.dotColumn}>
                  <Text
                    style={[
                      styles.dayLabel,
                      day.isToday && styles.dayLabelToday,
                    ]}
                  >
                    {day.dayName}
                  </Text>
                  <View
                    style={[
                      styles.dotCircle,
                      day.hasLogged && styles.dotCircleLogged,
                      day.isToday && !day.hasLogged && styles.dotCircleTodayPending,
                    ]}
                  >
                    {day.hasLogged ? (
                      <Text style={styles.dotFlame}>🔥</Text>
                    ) : day.isToday ? (
                      <View style={styles.dotInnerPending} />
                    ) : (
                      <View style={styles.dotInnerEmpty} />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Tank Dynamic Message Speech Bubble */}
        <View style={styles.mascotSection}>
          <TankMascot size={mascotDimension} style={styles.mascotImg} />
          <View style={styles.speechBubble}>
            <View style={styles.speechBubbleArrow} />
            <Text style={styles.speechBubbleName}>TANK SAYS</Text>
            <Text style={styles.speechBubbleText}>{tankMessage}</Text>
          </View>
        </View>

        {/* Milestones Road */}
        <View style={styles.milestonesCard}>
          <Text style={styles.milestonesCardTitle}>STREAK MILESTONES</Text>
          <View style={styles.milestoneGrid}>
            {STREAK_MILESTONES.map((days) => {
              const meta = MILESTONE_DETAILS[days];
              const isUnlocked = streakData.currentStreak >= days;

              return (
                <View
                  key={days}
                  style={[
                    styles.milestoneItem,
                    isUnlocked && styles.milestoneItemUnlocked,
                  ]}
                >
                  <View
                    style={[
                      styles.milestoneIconCircle,
                      isUnlocked && styles.milestoneIconCircleUnlocked,
                    ]}
                  >
                    <Text style={styles.milestoneIcon}>
                      {isUnlocked ? '✓' : days}
                    </Text>
                  </View>
                  <Text style={styles.milestoneDays}>{days} Days</Text>
                  <Text
                    style={[
                      styles.milestoneStatus,
                      isUnlocked && styles.milestoneStatusUnlocked,
                    ]}
                  >
                    {isUnlocked ? meta.badge.split(' ')[0] : 'LOCKED'}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Weekly Challenges Card */}
        <WeeklyChallengesCard
          challenges={challenges}
          isPro={isPro}
          onRefresh={loadData}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  navBar: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#17233D',
    fontWeight: '600',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#17233D',
  },
  navRightPlaceholder: {
    width: 36,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.xl,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#17233D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  streakFlameWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFE7BD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: '#D97935',
  },
  flameEmoji: {
    fontSize: 36,
  },
  currentStreakNumber: {
    fontSize: 54,
    fontWeight: '900',
    color: '#17233D',
    lineHeight: 60,
  },
  currentStreakLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97935',
    letterSpacing: 1.5,
    marginBottom: theme.spacing.md,
  },
  bestStreakPill: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  bestStreakText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  dotsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#17233D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  dotsCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: theme.spacing.md,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dotColumn: {
    alignItems: 'center',
    gap: 8,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  dayLabelToday: {
    color: '#D97935',
    fontWeight: '700',
  },
  dotCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  dotCircleLogged: {
    backgroundColor: '#FFE7BD',
    borderColor: '#D97935',
  },
  dotCircleTodayPending: {
    borderColor: '#D97935',
    borderStyle: 'dashed',
    backgroundColor: '#FFFBF7',
  },
  dotFlame: {
    fontSize: 18,
  },
  dotInnerPending: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D97935',
  },
  dotInnerEmpty: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  mascotSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    elevation: 2,
    shadowColor: '#17233D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  mascotImg: {
    width: 100,
    height: 100,
  },
  speechBubble: {
    flex: 1,
    backgroundColor: '#FFFBF7',
    padding: theme.spacing.md,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: '#FFE7BD',
    position: 'relative',
  },
  speechBubbleArrow: {
    position: 'absolute',
    left: -8,
    top: 24,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderTopColor: 'transparent',
    borderBottomWidth: 8,
    borderBottomColor: 'transparent',
    borderRightWidth: 8,
    borderRightColor: '#FFE7BD',
  },
  speechBubbleName: {
    fontSize: 10,
    fontWeight: '900',
    color: '#D97935',
    letterSpacing: 1,
    marginBottom: 4,
  },
  speechBubbleText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#17233D',
    lineHeight: 18,
  },
  milestonesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#17233D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  milestonesCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: theme.spacing.md,
  },
  milestoneGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  milestoneItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: 4,
    borderRadius: theme.radii.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  milestoneItemUnlocked: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  milestoneIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  milestoneIconCircleUnlocked: {
    backgroundColor: '#48BB78',
  },
  milestoneIcon: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  milestoneDays: {
    fontSize: 11,
    fontWeight: '800',
    color: '#17233D',
    marginBottom: 2,
  },
  milestoneStatus: {
    fontSize: 8,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  milestoneStatusUnlocked: {
    color: '#16A34A',
  },
});
