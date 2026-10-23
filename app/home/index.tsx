import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
  Pressable,
  useWindowDimensions,
  GestureResponderEvent,
  Alert,
  BackHandler,
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AppButton } from '@/components/AppButton';
import { BottomTabBar } from '@/components/navigation/BottomTabBar';
import {
  getOnboardingData,
  OnboardingData,
  DEFAULT_ONBOARDING_DATA,
  formatProteinAmount,
  scheduleStreakReminder,
} from '@/store/onboardingStorage';
import {
  FoodLogEntry,
  getFoodLogsForDate,
  addLog,
  deleteFoodLog,
  calculateTotalProtein,
  getStreakData,
  checkAndUpdateStreak,
  markCelebratedToday,
  DailyStreakData,
} from '@/store/foodLogStorage';
import { PROTEIN_FOODS } from '@/constants/proteinFoods';
import { TankProgressMascot } from '@/components/home/TankProgressMascot';
import { TodayActivityList } from '@/components/home/TodayActivityList';
import { GoalCelebrationModal } from '@/components/home/GoalCelebrationModal';
import { MilestoneCelebrationModal } from '@/components/home/MilestoneCelebrationModal';
import {
  checkUncelebratedMilestone,
  markMilestoneCelebrated,
  StreakMilestone,
} from '@/store/milestoneStorage';
import { triggerLightHaptic } from '@/components/utils/haptics';
import { getIsPro } from '@/store/purchaseStorage';
import { getSelectedSkinId } from '@/store/skinStorage';
import { theme } from '@/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();

  // Onboarding profile & preferences
  const [profile, setProfile] = useState<OnboardingData>(DEFAULT_ONBOARDING_DATA);

  // Daily log state
  const [foodLogs, setFoodLogs] = useState<FoodLogEntry[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Streak state
  const [streakData, setStreakData] = useState<DailyStreakData>({
    currentStreak: 0,
    bestStreak: 0,
    lastCompletedDate: null,
  });

  // Pro status
  const [isPro, setIsProState] = useState<boolean>(false);

  // Selected mascot skin
  const [selectedSkin, setSelectedSkin] = useState<string>('classic');

  // Bottom Sheet state
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState<boolean>(false);
  // Search params for food logging feedback
  const { justLogged, loggedFoodId } = useLocalSearchParams<{
    justLogged?: string;
    loggedFoodId?: string;
  }>();

  // Celebration & Mascot animation states
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [triggerMascotCelebration, setTriggerMascotCelebration] = useState<boolean>(false);
  const [triggerMascotSip, setTriggerMascotSip] = useState<boolean>(false);
  const [uncelebratedMilestone, setUncelebratedMilestone] = useState<StreakMilestone | null>(null);
  const isSipTriggered = justLogged === 'true' || triggerMascotSip;

  // Undo delete toast state (5-second timeout)
  const [deletedEntryForUndo, setDeletedEntryForUndo] = useState<FoodLogEntry | null>(null);
  const [showUndoToast, setShowUndoToast] = useState<boolean>(false);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDismissMilestone = async () => {
    if (uncelebratedMilestone) {
      await markMilestoneCelebrated(uncelebratedMilestone);
    }
    setUncelebratedMilestone(null);
  };

  // Load all data
  const loadHomeData = useCallback(async () => {
    try {
      const [storedProfile, todayLogs, streak, proStatus, activeSkin] = await Promise.all([
        getOnboardingData(),
        getFoodLogsForDate(),
        getStreakData(),
        getIsPro(),
        getSelectedSkinId(),
      ]);

      setProfile(storedProfile);
      setFoodLogs(todayLogs);
      setStreakData(streak);
      setIsProState(proStatus);
      setSelectedSkin(activeSkin);

      // Sync streak-at-risk reminder (default 8:30 PM, safe if food logged today)
      if (storedProfile.streakReminderEnabled !== false) {
        scheduleStreakReminder(
          storedProfile.streakReminderHour ?? 20,
          storedProfile.streakReminderMinute ?? 30,
          todayLogs.length > 0
        );
      }

      // Check if goal was met
      let effectiveStreak = streak.currentStreak;
      const total = calculateTotalProtein(todayLogs);
      const goal = storedProfile.dailyGoalGrams;
      if (goal && goal > 0 && total >= goal) {
        const { streak: updatedStreak, isNewGoalCelebration } =
          await checkAndUpdateStreak(total, goal);
        setStreakData(updatedStreak);
        effectiveStreak = updatedStreak.currentStreak;

        if (isNewGoalCelebration) {
          await markCelebratedToday();
          setShowCelebration(true);
          setTriggerMascotCelebration(true);
        }
      } else {
        const currentStreak = await getStreakData();
        setStreakData(currentStreak);
        effectiveStreak = currentStreak.currentStreak;
      }

      // Check uncelebrated milestone (3, 7, 14, 30 days)
      const milestone = await checkUncelebratedMilestone(effectiveStreak);
      if (milestone) {
        setUncelebratedMilestone(milestone);
      }
    } catch (err) {
      console.warn('Failed to load home data:', err);
    }
  }, []);

  // Reload when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadHomeData();
    }, [loadHomeData])
  );

  // Handle Android hardware back button: exiting the app from Home
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        BackHandler.exitApp();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  };

  // Open dedicated food-entry screen
  const handleOpenFoodEntry = (foodId: string) => {
    setIsBottomSheetVisible(false);
    triggerLightHaptic();
    router.push({
      pathname: '/food-entry/[id]',
      params: { id: foodId },
    });
  };

  const handleQuickAddOther = () => {
    setIsBottomSheetVisible(false);
    triggerLightHaptic();
    if (!isPro) {
      router.push({
        pathname: '/paywall',
        params: { source: 'feature' },
      });
      return;
    }
    router.push({
      pathname: '/food-entry/[id]',
      params: { id: 'other' },
    });
  };

  const handleOpenAiScan = () => {
    setIsBottomSheetVisible(false);
    triggerLightHaptic();
    if (!isPro) {
      router.push({
        pathname: '/paywall',
        params: { source: 'feature' },
      });
      return;
    }
    Alert.alert('AI Food Scanner 📸', 'Point your camera at any meal to automatically calculate protein.');
  };



  // Delete entry with 5-second undo toast
  const handleDeleteEntry = async (entry: FoodLogEntry) => {
    try {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }

      await deleteFoodLog(entry.id);
      setDeletedEntryForUndo(entry);
      setShowUndoToast(true);

      const updatedLogs = foodLogs.filter((item) => item.id !== entry.id);
      setFoodLogs(updatedLogs);

      const latestStreak = await getStreakData();
      setStreakData(latestStreak);

      undoTimeoutRef.current = setTimeout(() => {
        setShowUndoToast(false);
        setDeletedEntryForUndo(null);
      }, 5000);
    } catch (err) {
      console.warn('Failed to delete food log:', err);
    }
  };

  // Undo delete
  const handleUndoDelete = async () => {
    if (!deletedEntryForUndo) return;
    try {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
      setShowUndoToast(false);

      await addLog({
        id: deletedEntryForUndo.id,
        foodId: deletedEntryForUndo.foodId,
        foodName: deletedEntryForUndo.foodName,
        servings: deletedEntryForUndo.servingCount,
        grams: deletedEntryForUndo.proteinGrams,
        iconSymbol: deletedEntryForUndo.iconSymbol,
        source: 'undo',
      });

      setDeletedEntryForUndo(null);
      await loadHomeData();
    } catch (err) {
      console.warn('Failed to undo food log deletion:', err);
    }
  };

  // Calculations
  const todayTotalGrams = calculateTotalProtein(foodLogs);
  const dailyGoal = profile.dailyGoalGrams;
  const progressRatio = dailyGoal && dailyGoal > 0 ? todayTotalGrams / dailyGoal : 0;
  const displayPercent = Math.min(100, Math.round(progressRatio * 100));

  // Tank mascot at ~55% of viewport height
  const mascotHeight = Math.round(windowHeight * 0.55);

  // Friendly date
  const todayFriendlyDate = new Date().toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <ScreenContainer scrollable={false} withHorizontalPadding={false} style={styles.container}>
      {/* 1. Header Row (Fixed at top) */}
      <View style={styles.header}>
        <View style={styles.brandContainer}>
          <Text style={styles.wordmark} accessibilityRole="header">
            PROTIE
          </Text>
          <Text style={styles.dateText}>{todayFriendlyDate}</Text>
        </View>

        <View style={styles.headerRight}>
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

          {/* Settings Button */}
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/settings')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Open settings screen"
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Scrollable View */}
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
        {/* FIRST FOLD: Hero intake + Tank (~38% height) + Docked "+ Add protein" button */}
        <View style={styles.firstFoldBlock}>
          {/* Hero Protein Intake Display */}
          <View style={styles.intakeHeaderBlock}>
            <View style={styles.intakeNumbersRow}>
              <Text style={styles.intakeLoggedText}>
                {Math.round(todayTotalGrams)}
              </Text>
              <Text style={styles.intakeSlashText}> / </Text>
              <Text style={styles.intakeGoalText}>
                {dailyGoal ? Math.round(dailyGoal) : '—'}
              </Text>
              <Text style={styles.intakeUnitText}>
                {profile.proteinUnit === 'oz' ? ' oz' : ' g'}
              </Text>
            </View>

            <Text style={styles.toGoText}>
              {dailyGoal && dailyGoal > 0
                ? todayTotalGrams >= dailyGoal
                  ? todayTotalGrams > dailyGoal
                    ? `Goal smashed! (+${Math.round(todayTotalGrams - dailyGoal)}g over)`
                    : 'Goal reached! 🎉'
                  : `${Math.round(dailyGoal - todayTotalGrams)} g to go`
                : 'Log your protein to fill Tank'}
            </Text>
          </View>

          {/* Center: Tank Progress Mascot (~38% of viewport height) */}
          <View style={styles.mascotSection}>
            <TankProgressMascot
              progressPercent={dailyGoal ? displayPercent : (todayTotalGrams > 0 ? Math.min(100, Math.round(todayTotalGrams)) : 0)}
              proteinConsumed={todayTotalGrams}
              dailyGoal={dailyGoal ?? 100}
              proteinUnit={profile.proteinUnit}
              size={mascotHeight}
              skinId={selectedSkin}
              triggerCelebration={triggerMascotCelebration}
              triggerSip={isSipTriggered}
              loggedFoodId={loggedFoodId}
              onSipComplete={() => {
                setTriggerMascotSip(false);
                if (justLogged === 'true' || loggedFoodId) {
                  router.setParams({ justLogged: undefined, loggedFoodId: undefined });
                }
              }}
              onFlexComplete={() => setTriggerMascotCelebration(false)}
            />
          </View>

          {/* Docked "+ Add protein" Button */}
          <View style={styles.dockedButtonSection}>
            <AppButton
              testID="docked-add-protein-button"
              title="+ Add protein"
              variant="primary"
              onPress={() => setIsBottomSheetVisible(true)}
              accessibilityLabel="Add protein - opens quick add options"
            />
          </View>
        </View>

        {/* BELOW THE FOLD: Today's Protein Activity */}
        <View style={styles.belowFoldSection}>
          <TodayActivityList
            entries={foodLogs}
            proteinUnit={profile.proteinUnit}
            onDeleteEntry={handleDeleteEntry}
            onOpenQuickAdd={handleQuickAddOther}
          />
        </View>
      </ScrollView>

      {/* Quick-Add Bottom Sheet Modal */}
      <Modal
        visible={isBottomSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsBottomSheetVisible(false)}
      >
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setIsBottomSheetVisible(false)}
        >
          <Pressable
            style={styles.sheetCard}
            onPress={(e: GestureResponderEvent) => e.stopPropagation()}
          >
            <View style={styles.sheetHandleBar} />
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>Quick-Add Protein</Text>
              <TouchableOpacity
                onPress={() => setIsBottomSheetVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close bottom sheet"
              >
                <Text style={styles.sheetCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* 3-Column Wrap Grid showing all 9 chips */}
            <View style={styles.sheetGridContainer}>
              {PROTEIN_FOODS.map((food) => (
                <TouchableOpacity
                  key={food.id}
                  style={styles.sheetFoodCard}
                  activeOpacity={0.75}
                  onPress={() => handleOpenFoodEntry(food.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Log ${food.name}, ~${food.defaultProteinGrams} grams protein`}
                >
                  <View style={[styles.sheetIconBox, { backgroundColor: food.badgeColor + '20' }]}>
                    <Text style={styles.sheetFoodEmoji}>{food.iconSymbol}</Text>
                  </View>
                  <Text style={styles.sheetFoodName} numberOfLines={1}>
                    {food.name}
                  </Text>
                  <View style={styles.sheetProteinBadge}>
                    <Text style={styles.sheetProteinBadgeText}>
                      +{formatProteinAmount(food.defaultProteinGrams, profile.proteinUnit)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              {/* 9th chip: Other (Custom) with Lock Badge if !isPro */}
              <TouchableOpacity
                key="other"
                style={[styles.sheetFoodCard, styles.sheetCustomCard]}
                activeOpacity={0.75}
                onPress={handleQuickAddOther}
                accessibilityRole="button"
                accessibilityLabel={isPro ? "Custom protein entry" : "Custom protein entry, Pro feature"}
              >
                {!isPro && (
                  <View style={styles.lockBadgeCorner}>
                    <Text style={styles.lockBadgeIcon}>🔒</Text>
                  </View>
                )}
                <View style={[styles.sheetIconBox, styles.sheetCustomIconBox]}>
                  <Text style={styles.sheetCustomIcon}>➕</Text>
                </View>
                <Text style={styles.sheetFoodName} numberOfLines={1}>
                  Custom
                </Text>
                <View style={[styles.sheetProteinBadge, styles.sheetCustomBadge]}>
                  <Text style={styles.sheetCustomBadgeText}>{isPro ? 'Any g' : 'Pro'}</Text>
                </View>
              </TouchableOpacity>

              {/* 10th chip: AI Logging Placeholder with Lock Badge */}
              <TouchableOpacity
                key="ai-scan"
                style={[styles.sheetFoodCard, styles.sheetAiCard]}
                activeOpacity={0.75}
                onPress={handleOpenAiScan}
                accessibilityRole="button"
                accessibilityLabel="AI Food Scan, Pro feature"
              >
                <View style={styles.lockBadgeCorner}>
                  <Text style={styles.lockBadgeIcon}>🔒</Text>
                </View>
                <View style={[styles.sheetIconBox, styles.sheetAiIconBox]}>
                  <Text style={styles.sheetCustomIcon}>📸</Text>
                </View>
                <Text style={styles.sheetFoodName} numberOfLines={1}>
                  AI Scan
                </Text>
                <View style={[styles.sheetProteinBadge, styles.sheetAiBadge]}>
                  <Text style={styles.sheetAiBadgeText}>Pro</Text>
                </View>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>



      {/* Goal Celebration Modal */}
      <GoalCelebrationModal
        visible={showCelebration}
        totalGrams={todayTotalGrams}
        goalGrams={dailyGoal ?? 100}
        streak={streakData.currentStreak}
        proteinUnit={profile.proteinUnit}
        onDismiss={() => {
          setShowCelebration(false);
          setTriggerMascotCelebration(false);
        }}
      />

      {/* Milestone Celebration Modal (3, 7, 14, 30 days) */}
      <MilestoneCelebrationModal
        visible={uncelebratedMilestone !== null}
        milestone={uncelebratedMilestone}
        onDismiss={handleDismissMilestone}
      />

      {/* In-app "Entry deleted. Undo" Toast (5 seconds) */}
      {showUndoToast && (
        <View style={styles.toastContainer} pointerEvents="box-none">
          <View style={styles.toastCard}>
            <Text style={styles.toastText}>Entry deleted.</Text>
            <TouchableOpacity
              onPress={handleUndoDelete}
              style={styles.undoButton}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Undo delete food entry"
            >
              <Text style={styles.undoButtonText}>Undo</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Bottom Tab Bar */}
      <BottomTabBar currentTab="home" />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  brandContainer: {
    flexDirection: 'column',
  },
  wordmark: {
    ...theme.typography.subtitle,
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    letterSpacing: 1.5,
  },
  dateText: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.secondarySurface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radii.full,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    gap: 4,
  },
  streakIcon: {
    fontSize: 14,
  },
  streakText: {
    ...theme.typography.caption,
    fontWeight: '900',
    color: theme.colors.primary,
  },
  settingsButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.secondarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  settingsIcon: {
    fontSize: 18,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
  firstFoldBlock: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    justifyContent: 'space-between',
  },
  intakeHeaderBlock: {
    alignItems: 'center',
    marginVertical: 4,
  },
  intakeNumbersRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  intakeLoggedText: {
    fontSize: 38,
    fontWeight: '900',
    color: theme.colors.primary,
    lineHeight: 44,
  },
  intakeSlashText: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  intakeGoalText: {
    fontSize: 34,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    lineHeight: 40,
  },
  intakeUnitText: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    marginLeft: 2,
  },
  toGoText: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  mascotSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  dockedButtonSection: {
    width: '100%',
    paddingTop: theme.spacing.sm,
  },
  belowFoldSection: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 35, 61, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radii.xl,
    borderTopRightRadius: theme.radii.xl,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  sheetHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: theme.spacing.sm,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.xs,
  },
  sheetTitle: {
    ...theme.typography.subtitle,
    fontWeight: '900',
    color: theme.colors.textPrimary,
  },
  sheetCloseButton: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    padding: 4,
  },
  sheetGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: theme.spacing.sm,
  },
  sheetFoodCard: {
    width: '31.5%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: 2,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  sheetIconBox: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  sheetFoodEmoji: {
    fontSize: 22,
  },
  sheetFoodName: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  sheetProteinBadge: {
    backgroundColor: theme.colors.secondarySurface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
  },
  sheetProteinBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  sheetCustomCard: {
    borderStyle: 'dashed',
    borderColor: theme.colors.primary + '80',
    backgroundColor: theme.colors.background,
  },
  sheetCustomIconBox: {
    backgroundColor: theme.colors.secondarySurface,
  },
  sheetCustomIcon: {
    fontSize: 18,
  },
  sheetCustomBadge: {
    backgroundColor: theme.colors.border,
  },
  sheetCustomBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  lockBadgeCorner: {
    position: 'absolute',
    top: 4,
    right: 6,
    zIndex: 10,
  },
  lockBadgeIcon: {
    fontSize: 12,
  },
  sheetAiCard: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.card,
  },
  sheetAiIconBox: {
    backgroundColor: theme.colors.secondarySurface,
  },
  sheetAiBadge: {
    backgroundColor: theme.colors.primary,
  },
  sheetAiBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 84,
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
});
