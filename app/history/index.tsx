import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';
import { BottomTabBar } from '@/components/navigation/BottomTabBar';
import { WeekStrip, DayProgress } from '@/components/history/WeekStrip';
import { WeeklyStatsCard } from '@/components/history/WeeklyStatsCard';
import { MonthCalendarModal } from '@/components/history/MonthCalendarModal';
import { DayEntriesList } from '@/components/history/DayEntriesList';
import { theme } from '@/constants/theme';
import {
  getOnboardingData,
  OnboardingData,
  DEFAULT_ONBOARDING_DATA,
} from '@/store/onboardingStorage';
import {
  FoodLogEntry,
  getAllFoodLogs,
  deleteFoodLog,
  restoreFoodLog,
  getInstallDate,
  getStreakData,
  DailyStreakData,
  getLocalDateString,
} from '@/store/foodLogStorage';
import { getIsPro } from '@/store/purchaseStorage';
import { triggerLightHaptic } from '@/components/utils/haptics';

export default function HistoryScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<OnboardingData>(DEFAULT_ONBOARDING_DATA);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [installDate, setInstallDate] = useState<string>(getLocalDateString());
  const [streakData, setStreakData] = useState<DailyStreakData>({
    currentStreak: 0,
    bestStreak: 0,
    lastCompletedDate: null,
  });

  // Selected date (defaults to today)
  const todayStr = getLocalDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // All logs and daily totals cache
  const [allLogs, setAllLogs] = useState<FoodLogEntry[]>([]);
  const [selectedDayEntries, setSelectedDayEntries] = useState<FoodLogEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Month Calendar Sheet state
  const [calendarVisible, setCalendarVisible] = useState(false);

  // Undo delete state
  const [deletedEntryForUndo, setDeletedEntryForUndo] = useState<FoodLogEntry | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load all data
  const loadHistoryData = useCallback(async () => {
    try {
      const [storedProfile, storedInstallDate, storedStreak, storedAllLogs, proStatus] =
        await Promise.all([
          getOnboardingData(),
          getInstallDate(),
          getStreakData(),
          getAllFoodLogs(),
          getIsPro(),
        ]);

      setProfile(storedProfile);
      setInstallDate(storedInstallDate);
      setStreakData(storedStreak);
      setAllLogs(storedAllLogs);
      setIsPro(proStatus);

      const dayLogs = storedAllLogs.filter((e) => e.date === selectedDate);
      setSelectedDayEntries(dayLogs.sort((a, b) => b.timestamp - a.timestamp));
    } catch (err) {
      console.warn('Failed to load history data:', err);
    }
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadHistoryData();
    }, [loadHistoryData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHistoryData();
    setRefreshing(false);
  };

  // Build daily totals map { 'YYYY-MM-DD': totalGrams }
  const dailyTotalsMap: Record<string, number> = {};
  for (const log of allLogs) {
    if (log.date) {
      dailyTotalsMap[log.date] = (dailyTotalsMap[log.date] || 0) + (Number(log.proteinGrams) || 0);
    }
  }

  // Calculate the 7 days of the week containing selectedDate
  const dailyGoal = profile.dailyGoalGrams || 120;
  const weekStart = profile.weekStart;

  const currentSelectedDateObj = (() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  })();

  // Day of week (0 = Sunday, 1 = Monday ... 6 = Saturday)
  const currentDayOfWeek = currentSelectedDateObj.getDay();
  // Offset to the first day of this week
  const daysFromWeekStart =
    weekStart === 'sunday'
      ? currentDayOfWeek
      : (currentDayOfWeek + 6) % 7;

  const weekStartDate = new Date(currentSelectedDateObj);
  weekStartDate.setDate(currentSelectedDateObj.getDate() - daysFromWeekStart);

  const weekDayLabels =
    weekStart === 'sunday'
      ? ['S', 'M', 'T', 'W', 'T', 'F', 'S']
      : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const weekDaysProgress: DayProgress[] = [];
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(weekStartDate);
    dayDate.setDate(weekStartDate.getDate() + i);
    const dateStr = getLocalDateString(dayDate);

    const proteinGrams = dailyTotalsMap[dateStr] || 0;
    const isToday = dateStr === todayStr;
    const isBeforeInstall = dateStr < installDate;
    const isFuture = dateStr > todayStr;
    const isDisabled = isBeforeInstall || isFuture;
    const isHitGoal = dailyGoal > 0 && proteinGrams >= dailyGoal;

    weekDaysProgress.push({
      dateStr,
      dayLabel: weekDayLabels[i],
      dayNumber: dayDate.getDate(),
      proteinGrams,
      goalGrams: dailyGoal,
      isToday,
      isDisabled,
      isHitGoal,
    });
  }

  // Handle day selection
  const handleSelectDay = (dateStr: string) => {
    setSelectedDate(dateStr);
    const dayLogs = allLogs.filter((e) => e.date === dateStr);
    setSelectedDayEntries(dayLogs.sort((a, b) => b.timestamp - a.timestamp));
  };

  // Delete an entry with undo support
  const handleDeleteEntry = async (entry: FoodLogEntry) => {
    try {
      // Clear any pending undo timer
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }

      await deleteFoodLog(entry.id);
      setDeletedEntryForUndo(entry);
      setShowUndoToast(true);

      // Refresh list and streak
      await loadHistoryData();

      // Auto dismiss undo after 5 seconds
      undoTimeoutRef.current = setTimeout(() => {
        setShowUndoToast(false);
        setDeletedEntryForUndo(null);
      }, 5000);
    } catch (err) {
      console.warn('Failed to delete entry in history:', err);
    }
  };

  // Undo delete
  const handleUndo = async () => {
    if (!deletedEntryForUndo) return;
    try {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
      await restoreFoodLog(deletedEntryForUndo);
      setShowUndoToast(false);
      setDeletedEntryForUndo(null);
      await loadHistoryData();
    } catch (err) {
      console.warn('Failed to undo entry deletion:', err);
    }
  };

  // Friendly month title for header
  const headerMonthTitle = currentSelectedDateObj.toLocaleDateString([], {
    month: 'short',
    year: 'numeric',
  });

  return (
    <ScreenContainer scrollable={false} withHorizontalPadding={false} style={styles.container}>
      {/* 1. Fixed Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>History</Text>
          <Text style={styles.headerSubtitle}>Track your daily protein habit</Text>
        </View>

        <View style={styles.headerRight}>
          {/* Month Calendar Opener */}
          <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => {
              if (Platform.OS !== 'web') triggerLightHaptic();
              setCalendarVisible(true);
            }}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Open ${headerMonthTitle} calendar sheet`}
          >
            <Text style={styles.calendarButtonIcon}>📅</Text>
            <Text style={styles.calendarButtonText}>{headerMonthTitle}</Text>
            <Text style={styles.calendarArrow}>▾</Text>
          </TouchableOpacity>

          {/* Streak Badge */}
          <TouchableOpacity
            style={styles.streakBadge}
            onPress={() => router.push('/streak')}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Current streak: ${streakData.currentStreak} days. Tap to open streak details`}
          >
            <Text style={styles.streakIcon}>🔥</Text>
            <Text style={styles.streakText}>{streakData.currentStreak}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Scrollable Body */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* TOP: Week Strip (respects Monday/Sunday setting) */}
        <WeekStrip
          days={weekDaysProgress}
          selectedDate={selectedDate}
          onSelectDay={handleSelectDay}
          weekStart={weekStart}
        />

        {/* BELOW: "This week" Card with average protein, goal hit days & 600ms bar chart */}
        <WeeklyStatsCard
          days={weekDaysProgress}
          dailyGoalGrams={dailyGoal}
          proteinUnit={profile.proteinUnit}
          onSelectDay={handleSelectDay}
          selectedDate={selectedDate}
        />

        {/* Pro Insights Card (Feature Gated with Lock Badge) */}
        <View style={styles.insightsCard}>
          <View style={styles.insightsHeaderRow}>
            <View style={styles.insightsTitleRow}>
              <Text style={styles.insightsTitle}>Pro Insights & Trends</Text>
              {!isPro && (
                <View style={styles.insightsLockBadge}>
                  <Text style={styles.insightsLockBadgeText}>🔒 PRO</Text>
                </View>
              )}
            </View>
          </View>

          {isPro ? (
            <View style={styles.unlockedInsights}>
              <View style={styles.insightItem}>
                <Text style={styles.insightLabel}>Protein Consistency</Text>
                <Text style={styles.insightValue}>92% Optimal</Text>
              </View>
              <View style={styles.insightItem}>
                <Text style={styles.insightLabel}>Top Protein Source</Text>
                <Text style={styles.insightValue}>Chicken & Eggs</Text>
              </View>
              <View style={styles.insightItem}>
                <Text style={styles.insightLabel}>Peak Logging Window</Text>
                <Text style={styles.insightValue}>Lunch (12:00 PM – 2:30 PM)</Text>
              </View>
            </View>
          ) : (
            <View style={styles.lockedInsightsBox}>
              <Text style={styles.lockedInsightsDesc}>
                Unlock weekly consistency ratings, top protein source breakdowns, and peak intake analytics with Protie Pro.
              </Text>
              <TouchableOpacity
                style={styles.unlockInsightsButton}
                onPress={() => {
                  if (Platform.OS !== 'web') triggerLightHaptic();
                  router.push({
                    pathname: '/paywall',
                    params: { source: 'feature' },
                  });
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Unlock Pro Insights"
              >
                <Text style={styles.unlockInsightsButtonText}>Unlock Pro Insights</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Selected Day's Logged Entries (with delete + undo + Tank empty state) */}
        <DayEntriesList
          entries={selectedDayEntries}
          selectedDate={selectedDate}
          dailyGoalGrams={dailyGoal}
          proteinUnit={profile.proteinUnit}
          onDeleteEntry={handleDeleteEntry}
        />
      </ScrollView>

      {/* Floating Undo Toast (5-second timeout) */}
      {showUndoToast && deletedEntryForUndo && (
        <View style={styles.toastContainer}>
          <View style={styles.toastCard}>
            <Text style={styles.toastText}>Entry deleted</Text>
            <TouchableOpacity
              style={styles.undoButton}
              onPress={handleUndo}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Undo delete food log"
            >
              <Text style={styles.undoButtonText}>UNDO</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Month Calendar Sheet */}
      <MonthCalendarModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        selectedDate={selectedDate}
        installDate={installDate}
        dailyGoalGrams={dailyGoal}
        dailyTotalsMap={dailyTotalsMap}
        weekStart={weekStart}
        onSelectDate={handleSelectDay}
      />

      {/* 3. Bottom Tab Bar */}
      <BottomTabBar currentTab="history" />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  headerTitle: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
    fontWeight: '900',
  },
  headerSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.full,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    gap: 4,
  },
  calendarButtonIcon: {
    fontSize: 13,
  },
  calendarButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  calendarArrow: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '900',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.secondarySurface,
    borderRadius: theme.radii.full,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    gap: 4,
  },
  streakIcon: {
    fontSize: 14,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 84, // Placed comfortably above the bottom tab bar
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#17233D',
    borderRadius: theme.radii.full,
    paddingVertical: 10,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    gap: 12,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  undoButton: {
    backgroundColor: '#D97935',
    borderRadius: theme.radii.full,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  undoButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  insightsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginVertical: theme.spacing.sm,
  },
  insightsHeaderRow: {
    marginBottom: theme.spacing.xs,
  },
  insightsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  insightsTitle: {
    ...theme.typography.subtitle,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  insightsLockBadge: {
    backgroundColor: theme.colors.secondarySurface,
    borderRadius: theme.radii.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  insightsLockBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  lockedInsightsBox: {
    marginTop: 4,
  },
  lockedInsightsDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },
  unlockInsightsButton: {
    backgroundColor: theme.colors.secondarySurface,
    borderRadius: theme.radii.full,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  unlockInsightsButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  unlockedInsights: {
    marginTop: 6,
    gap: 8,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.lg,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  insightLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  insightValue: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.primary,
  },
});
