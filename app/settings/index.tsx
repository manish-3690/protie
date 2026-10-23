import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
  Switch,
  Modal,
  Pressable,
  GestureResponderEvent,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';
import {
  getOnboardingData,
  saveOnboardingData,
  clearOnboardingData,
  OnboardingData,
  DEFAULT_ONBOARDING_DATA,
  formatProteinAmount,
  ProteinUnit,
  WeekStart,
  requestNotificationPermission,
  scheduleDailyReminder,
  cancelDailyReminder,
  scheduleStreakReminder,
  cancelStreakReminder,
} from '@/store/onboardingStorage';
import { clearDateFoodLogs, seedDemoData14Days, clearAllFoodLogs } from '@/store/foodLogStorage';
import { resetCelebratedMilestones } from '@/store/milestoneStorage';
import {
  getIsPro,
  setIsPro,
  mockRestorePurchases,
  resetDownsellState,
} from '@/store/purchaseStorage';
import { MASCOT_SKINS, MascotSkin } from '@/constants/mascotSkins';
import { getSelectedSkinId, setSelectedSkinId } from '@/store/skinStorage';
import { BottomTabBar } from '@/components/navigation/BottomTabBar';
import { theme } from '@/constants/theme';

const PRESET_TIMES = [
  { label: '9:00 AM', hour: 9, minute: 0 },
  { label: '12:00 PM', hour: 12, minute: 0 },
  { label: '3:00 PM', hour: 15, minute: 0 },
  { label: '6:00 PM', hour: 18, minute: 0 },
  { label: '8:30 PM', hour: 20, minute: 30 },
];

export default function SettingsScreen() {
  const router = useRouter();
  const [data, setData] = useState<OnboardingData>(DEFAULT_ONBOARDING_DATA);
  const [isPro, setIsProState] = useState(false);
  const [selectedSkin, setSelectedSkin] = useState<string>('classic');
  const [restoreNotice, setRestoreNotice] = useState<string | null>(null);
  const [downsellResetNotice, setDownsellResetNotice] = useState(false);
  const [showClearLogsModal, setShowClearLogsModal] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [logsClearedNotice, setLogsClearedNotice] = useState(false);
  const [seededNotice, setSeededNotice] = useState(false);

  useEffect(() => {
    getOnboardingData().then(setData);
    getIsPro().then(setIsProState);
    getSelectedSkinId().then(setSelectedSkin);
  }, []);

  useFocusEffect(
    useCallback(() => {
      getIsPro().then((pro) => {
        setIsProState(pro);
        getSelectedSkinId().then(setSelectedSkin);
      });
    }, [])
  );

  const handleUpdateUnit = async (unit: ProteinUnit) => {
    const updated = await saveOnboardingData({ proteinUnit: unit });
    setData(updated);
  };

  const handleUpdateWeekStart = async (weekStart: WeekStart) => {
    const updated = await saveOnboardingData({ weekStart });
    setData(updated);
  };

  const handleAdjustGoal = async (delta: number) => {
    const currentGoal = data.dailyGoalGrams || 110;
    const newGoal = Math.max(30, Math.min(350, currentGoal + delta));
    const updated = await saveOnboardingData({ dailyGoalGrams: newGoal });
    setData(updated);
  };

  // Toggle daily reminder switch
  const handleToggleReminder = async (newVal: boolean) => {
    const hour = data.reminderHour ?? 12;
    const minute = data.reminderMinute ?? 0;

    if (newVal) {
      let isGranted = true;
      if (Platform.OS !== 'web') {
        const granted = await requestNotificationPermission();
        isGranted = granted;
        if (granted) {
          await scheduleDailyReminder(hour, minute);
        }
      }
      const updated = await saveOnboardingData({
        reminderEnabled: isGranted,
        reminderHour: hour,
        reminderMinute: minute,
      });
      setData(updated);
    } else {
      if (Platform.OS !== 'web') {
        await cancelDailyReminder();
      }
      const updated = await saveOnboardingData({
        reminderEnabled: false,
      });
      setData(updated);
    }
  };

  // Select one of the 5 preset time chips
  const handleSelectTimeChip = async (hour: number, minute: number) => {
    if (Platform.OS !== 'web' && data.reminderEnabled) {
      await scheduleDailyReminder(hour, minute);
    }
    const updated = await saveOnboardingData({
      reminderHour: hour,
      reminderMinute: minute,
    });
    setData(updated);
  };

  // Toggle streak-at-risk reminder switch (default 8:30 PM, only if nothing is logged today)
  const handleToggleStreakReminder = async (newVal: boolean) => {
    const hour = data.streakReminderHour ?? 20;
    const minute = data.streakReminderMinute ?? 30;

    if (newVal) {
      let isGranted = true;
      if (Platform.OS !== 'web') {
        const granted = await requestNotificationPermission();
        isGranted = granted;
        if (granted) {
          await scheduleStreakReminder(hour, minute);
        }
      }
      const updated = await saveOnboardingData({
        streakReminderEnabled: isGranted,
        streakReminderHour: hour,
        streakReminderMinute: minute,
      });
      setData(updated);
    } else {
      if (Platform.OS !== 'web') {
        await cancelStreakReminder();
      }
      const updated = await saveOnboardingData({
        streakReminderEnabled: false,
      });
      setData(updated);
    }
  };

  // Select preset time for streak-at-risk reminder
  const handleSelectStreakTimeChip = async (hour: number, minute: number) => {
    if (Platform.OS !== 'web' && data.streakReminderEnabled !== false) {
      await scheduleStreakReminder(hour, minute);
    }
    const updated = await saveOnboardingData({
      streakReminderHour: hour,
      streakReminderMinute: minute,
    });
    setData(updated);
  };

  // Select skin (gated for Pro skins)
  const handleSelectSkin = async (skin: MascotSkin) => {
    if (skin.isPro && !isPro) {
      router.push({
        pathname: '/paywall',
        params: { source: 'feature' },
      });
      return;
    }
    const success = await setSelectedSkinId(skin.id);
    if (success || !skin.isPro) {
      setSelectedSkin(skin.id);
    }
  };

  // Restore Purchases (Mock)
  const handleRestorePurchases = async () => {
    try {
      const res = await mockRestorePurchases();
      if (res.isPro) {
        setIsProState(true);
        setRestoreNotice('✓ Purchases restored: Protie Pro is active! ✨');
        if (Platform.OS !== 'web') {
          Alert.alert('Purchases Restored', 'Your Protie Pro membership has been restored successfully.');
        }
      } else {
        setRestoreNotice('No previous purchases found on this device.');
        if (Platform.OS !== 'web') {
          Alert.alert('No Purchases Found', 'No prior Protie Pro purchases were found.');
        }
      }
      setTimeout(() => setRestoreNotice(null), 4000);
    } catch {
      setRestoreNotice('Failed to restore purchases. Please try again.');
    }
  };

  // Dev Toggle for isPro
  const handleToggleDevPro = async (val: boolean) => {
    await setIsPro(val);
    setIsProState(val);
    const validSkin = await getSelectedSkinId();
    setSelectedSkin(validSkin);
  };

  // Dev Reset Downsell Modal
  const handleResetDownsell = async () => {
    await resetDownsellState();
    setDownsellResetNotice(true);
    setTimeout(() => setDownsellResetNotice(false), 3000);
  };

  // Confirm Clear Today's Logs
  const handleConfirmClearLogs = async () => {
    await clearDateFoodLogs();
    setShowClearLogsModal(false);
    setLogsClearedNotice(true);
    setTimeout(() => {
      setLogsClearedNotice(false);
    }, 3000);
  };

  // Seed 14 Days of Demo Data (DEV ONLY)
  const handleSeedDemoData = async () => {
    await seedDemoData14Days(data.dailyGoalGrams || 120);
    setSeededNotice(true);
    setTimeout(() => {
      setSeededNotice(false);
    }, 3000);
  };

  // Confirm Restart Onboarding
  const handleConfirmRestart = async () => {
    setShowRestartModal(false);
    await Promise.all([
      clearOnboardingData(),
      clearAllFoodLogs(),
      resetCelebratedMilestones(),
    ]);
    router.replace('/onboarding');
  };

  const dailyGoal = data.dailyGoalGrams;

  return (
    <ScreenContainer scrollable={false} withHorizontalPadding style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Back to Protie Home"
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Protie Pro Upgrade Card or Active Status */}
        {!isPro ? (
          <View style={styles.upgradeCard}>
            <View style={styles.upgradeHeaderRow}>
              <View style={styles.upgradeBadge}>
                <Text style={styles.upgradeBadgeText}>PROTIE PRO</Text>
              </View>
              <Text style={styles.upgradePriceHint}>From ₹299/mo</Text>
            </View>
            <Text style={styles.upgradeCardTitle}>Upgrade to Protie Pro 🚀</Text>
            <Text style={styles.upgradeCardSubtitle}>
              Unlock Custom Foods, Advanced Insights & Trends, AI Scanning, and exclusive mascot skins.
            </Text>
            <TouchableOpacity
              style={styles.upgradeActionButton}
              onPress={() =>
                router.push({
                  pathname: '/paywall',
                  params: { source: 'feature' },
                })
              }
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Start 3-Day Free Trial"
            >
              <Text style={styles.upgradeActionText}>Start 3-Day Free Trial</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.proActiveCard}>
            <View style={styles.upgradeHeaderRow}>
              <View style={styles.proActiveBadge}>
                <Text style={styles.proActiveBadgeText}>✓ PRO MEMBER</Text>
              </View>
              <Text style={styles.proActiveSub}>All Features Unlocked</Text>
            </View>
            <Text style={styles.proActiveTitle}>Protie Pro is Active ✨</Text>
            <Text style={styles.proActiveSubtitle}>
              You have full access to Custom Foods, Pro Insights, AI logging, and exclusive skins. Thank you for your support!
            </Text>
          </View>
        )}

        {/* 1. Daily Protein Goal Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily Protein Goal</Text>
          <Text style={styles.cardSubtitle}>
            Your target protein intake for each day.
          </Text>

          <View style={styles.goalRow}>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => handleAdjustGoal(-10)}
              disabled={!dailyGoal || dailyGoal <= 30}
              accessibilityRole="button"
              accessibilityLabel="Decrease daily goal by 10 grams"
            >
              <Text style={styles.stepperButtonText}>−</Text>
            </TouchableOpacity>

            <View style={styles.goalDisplay}>
              <Text style={styles.goalNumber}>
                {dailyGoal ? formatProteinAmount(dailyGoal, data.proteinUnit) : 'Not set'}
              </Text>
              <Text style={styles.goalUnitLabel}>daily target</Text>
            </View>

            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => handleAdjustGoal(10)}
              disabled={dailyGoal !== null && dailyGoal >= 350}
              accessibilityRole="button"
              accessibilityLabel="Increase daily goal by 10 grams"
            >
              <Text style={styles.stepperButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Mascot Skins & Themes (Feature Gated) */}
        <View style={styles.card}>
          <View style={styles.skinsHeaderRow}>
            <Text style={styles.cardTitle}>Mascot Skins & Themes</Text>
            {!isPro && (
              <View style={styles.proPill}>
                <Text style={styles.proPillText}>🔒 PRO</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardSubtitle}>
            Customize Tank’s look across the app. Extra skins require Protie Pro.
          </Text>

          <View style={styles.skinsGrid}>
            {MASCOT_SKINS.map((skin) => {
              const isSelected = selectedSkin === skin.id;
              const isLocked = skin.isPro && !isPro;
              return (
                <TouchableOpacity
                  key={skin.id}
                  style={[
                    styles.skinCard,
                    isSelected && styles.skinCardSelected,
                    isLocked && styles.skinCardLocked,
                  ]}
                  onPress={() => handleSelectSkin(skin)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`${skin.name}${isLocked ? ' (Locked with Pro)' : isSelected ? ' (Currently selected)' : ''}`}
                >
                  <View style={styles.skinImageContainer}>
                    <Image
                      source={skin.image}
                      style={styles.skinImage}
                      resizeMode="contain"
                    />
                    {isLocked && (
                      <View style={styles.skinLockBadge}>
                        <Text style={styles.skinLockText}>🔒 Pro</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.skinName}>{skin.name}</Text>
                  <Text style={styles.skinDesc} numberOfLines={1}>{skin.subtitle}</Text>
                  {isSelected && (
                    <View style={styles.skinActivePill}>
                      <Text style={styles.skinActiveText}>Selected</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 3. Units Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Display Units</Text>
          <Text style={styles.cardSubtitle}>
            Choose whether to view protein in grams (g) or ounces (oz).
          </Text>

          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[
                styles.segmentOption,
                data.proteinUnit === 'g' && styles.segmentActive,
              ]}
              onPress={() => handleUpdateUnit('g')}
              accessibilityRole="button"
              accessibilityLabel="Display in Grams"
            >
              <Text
                style={[
                  styles.segmentText,
                  data.proteinUnit === 'g' && styles.segmentTextActive,
                ]}
              >
                Grams (g)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentOption,
                data.proteinUnit === 'oz' && styles.segmentActive,
              ]}
              onPress={() => handleUpdateUnit('oz')}
              accessibilityRole="button"
              accessibilityLabel="Display in Ounces"
            >
              <Text
                style={[
                  styles.segmentText,
                  data.proteinUnit === 'oz' && styles.segmentTextActive,
                ]}
              >
                Ounces (oz)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. Week Starts On Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Week Starts On</Text>
          <Text style={styles.cardSubtitle}>
            Choose which day your weekly progress calculations begin.
          </Text>

          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[
                styles.segmentOption,
                (data.weekStart || 'monday') === 'monday' && styles.segmentActive,
              ]}
              onPress={() => handleUpdateWeekStart('monday')}
              accessibilityRole="button"
              accessibilityLabel="Week starts on Monday"
            >
              <Text
                style={[
                  styles.segmentText,
                  (data.weekStart || 'monday') === 'monday' && styles.segmentTextActive,
                ]}
              >
                Monday
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentOption,
                data.weekStart === 'sunday' && styles.segmentActive,
              ]}
              onPress={() => handleUpdateWeekStart('sunday')}
              accessibilityRole="button"
              accessibilityLabel="Week starts on Sunday"
            >
              <Text
                style={[
                  styles.segmentText,
                  data.weekStart === 'sunday' && styles.segmentTextActive,
                ]}
              >
                Sunday
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. Reminders Section */}
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.cardTitle}>Daily Reminders</Text>
              <Text style={styles.cardSubtitleInline}>
                Tank sends a friendly nudge at your chosen time.
              </Text>
              {Platform.OS === 'web' && (
                <Text style={styles.webReminderNote}>
                  ℹ️ Reminders work in the phone app
                </Text>
              )}
            </View>
            <Switch
              value={Boolean(data.reminderEnabled)}
              onValueChange={handleToggleReminder}
              trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
              thumbColor={theme.colors.white}
              accessibilityLabel="Enable daily reminder"
            />
          </View>

          {data.reminderEnabled && (
            <View style={styles.presetChipsSection}>
              <Text style={styles.chipsSectionLabel}>Reminder Time</Text>
              <View style={styles.presetsGrid}>
                {PRESET_TIMES.map((preset) => {
                  const isSelected =
                    data.reminderHour === preset.hour &&
                    data.reminderMinute === preset.minute;
                  return (
                    <TouchableOpacity
                      key={preset.label}
                      onPress={() => handleSelectTimeChip(preset.hour, preset.minute)}
                      style={[
                        styles.timeChip,
                        isSelected && styles.timeChipSelected,
                      ]}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityLabel={`Set reminder to ${preset.label}`}
                    >
                      <Text
                        style={[
                          styles.timeChipText,
                          isSelected && styles.timeChipTextSelected,
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Streak-at-Risk Reminder Section */}
          <View style={[styles.switchRow, styles.streakReminderRow]}>
            <View style={styles.switchInfo}>
              <Text style={styles.cardTitle}>Streak-at-Risk Reminder</Text>
              <Text style={styles.cardSubtitleInline}>
                Fires in the evening only if nothing is logged today to protect your streak.
              </Text>
            </View>
            <Switch
              value={data.streakReminderEnabled !== false}
              onValueChange={handleToggleStreakReminder}
              trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
              thumbColor={theme.colors.white}
              accessibilityLabel="Enable streak-at-risk reminder"
            />
          </View>

          {data.streakReminderEnabled !== false && (
            <View style={styles.presetChipsSection}>
              <Text style={styles.chipsSectionLabel}>Streak Check Time</Text>
              <View style={styles.presetsGrid}>
                {PRESET_TIMES.map((preset) => {
                  const isSelected =
                    (data.streakReminderHour ?? 20) === preset.hour &&
                    (data.streakReminderMinute ?? 30) === preset.minute;
                  return (
                    <TouchableOpacity
                      key={`streak-${preset.label}`}
                      onPress={() => handleSelectStreakTimeChip(preset.hour, preset.minute)}
                      style={[
                        styles.timeChip,
                        isSelected && styles.timeChipSelected,
                      ]}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityLabel={`Set streak-at-risk check time to ${preset.label}`}
                    >
                      <Text
                        style={[
                          styles.timeChipText,
                          isSelected && styles.timeChipTextSelected,
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* 6. Membership & Purchases (Restore) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Membership & Purchases</Text>
          <Text style={styles.cardSubtitle}>
            Purchased on another device? Restore your Protie Pro access anytime.
          </Text>

          {restoreNotice && (
            <View style={styles.clearedBanner}>
              <Text style={styles.clearedBannerText}>{restoreNotice}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestorePurchases}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Restore Purchases"
          >
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          </TouchableOpacity>
        </View>

        {/* 7. Logs & Data Management */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{"Today's Logged Protein"}</Text>
          <Text style={styles.cardSubtitle}>
            Reset entries logged today if you made mistakes or want a fresh start.
          </Text>

          {logsClearedNotice && (
            <View style={styles.clearedBanner}>
              <Text style={styles.clearedBannerText}>{"✓ Today's logs have been cleared."}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.clearLogsButton}
            onPress={() => setShowClearLogsModal(true)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Clear Today's Logs"
          >
            <Text style={styles.clearLogsButtonText}>{"Clear today's logs"}</Text>
          </TouchableOpacity>
        </View>

        {/* 8. Developer Tools (DEV ONLY) */}
        {__DEV__ && (
          <View style={styles.card}>
            <View style={styles.devHeaderRow}>
              <Text style={styles.cardTitle}>Developer Tools</Text>
              <View style={styles.devBadge}>
                <Text style={styles.devBadgeText}>DEV ONLY</Text>
              </View>
            </View>
            <Text style={styles.cardSubtitle}>
              Test paywalls, subscriptions, mock states, and history charts without real payments.
            </Text>

            {/* Dev Toggle: isPro */}
            <View style={styles.devSwitchRow}>
              <View style={styles.devSwitchInfo}>
                <Text style={styles.devSwitchLabel}>Mock Pro Status (isPro)</Text>
                <Text style={styles.devSwitchSub}>
                  Current: {isPro ? 'PRO ACTIVE 🟢' : 'FREE TIER ⚪'}
                </Text>
              </View>
              <Switch
                value={isPro}
                onValueChange={handleToggleDevPro}
                trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
                thumbColor={theme.colors.white}
              />
            </View>

            {/* Reset Downsell Modal */}
            <TouchableOpacity
              style={styles.devSecondaryButton}
              onPress={handleResetDownsell}
              activeOpacity={0.75}
            >
              <Text style={styles.devSecondaryButtonText}>
                {downsellResetNotice ? '✓ Downsell Flag Reset!' : 'Reset Downsell Timer & Shown Flag'}
              </Text>
            </TouchableOpacity>

            {/* Seed 14 Days Demo Data */}
            {seededNotice && (
              <View style={styles.clearedBanner}>
                <Text style={styles.clearedBannerText}>✓ 14 days of demo data seeded!</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.seedButton}
              onPress={handleSeedDemoData}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Seed 14 days of demo data"
            >
              <Text style={styles.seedButtonText}>Seed 14 Days Demo Data</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 9. Restart Onboarding */}
        <View style={styles.restartSection}>
          <TouchableOpacity
            style={styles.restartOutlineButton}
            onPress={() => setShowRestartModal(true)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Restart Onboarding"
          >
            <Text style={styles.restartOutlineText}>Restart Onboarding</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Confirmation Modal: Clear Today's Logs */}
      <Modal
        visible={showClearLogsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClearLogsModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowClearLogsModal(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e: GestureResponderEvent) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{"Clear today's logs?"}</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete all protein entries logged for today? Your past streak and history will remain safe.
            </Text>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowClearLogsModal(false)}
                activeOpacity={0.75}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmClearButton}
                onPress={handleConfirmClearLogs}
                activeOpacity={0.75}
              >
                <Text style={styles.modalConfirmClearText}>Clear Logs</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Confirmation Modal: Restart Onboarding */}
      <Modal
        visible={showRestartModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRestartModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowRestartModal(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e: GestureResponderEvent) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: '#D32F2F' }]}>
              Restart Onboarding?
            </Text>
            <Text style={styles.modalMessage}>
              This will reset your preferences and goals, and take you back to the initial setup screens.
            </Text>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowRestartModal(false)}
                activeOpacity={0.75}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmRestartButton}
                onPress={handleConfirmRestart}
                activeOpacity={0.75}
              >
                <Text style={styles.modalConfirmRestartText}>Restart</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Bottom Tab Bar */}
      <BottomTabBar currentTab="settings" />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  backButtonText: {
    ...theme.typography.body,
    fontWeight: '800',
    color: theme.colors.primary,
    fontSize: 18,
  },
  headerTitle: {
    ...theme.typography.subtitle,
    fontWeight: '900',
    color: theme.colors.textPrimary,
  },
  backButtonPlaceholder: {
    width: 50,
  },
  content: {
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  upgradeCard: {
    backgroundColor: '#FFF8F0',
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    borderWidth: 2,
    borderColor: '#FED7AA',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  upgradeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  upgradeBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  upgradeBadgeText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  upgradePriceHint: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  upgradeCardTitle: {
    ...theme.typography.title,
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    marginTop: 6,
    marginBottom: 4,
  },
  upgradeCardSubtitle: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  upgradeActionButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.full,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  upgradeActionText: {
    ...theme.typography.button,
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  proActiveCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
  },
  proActiveBadge: {
    backgroundColor: '#16A34A',
    borderRadius: theme.radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  proActiveBadgeText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  proActiveSub: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: '#16A34A',
  },
  proActiveTitle: {
    ...theme.typography.title,
    fontSize: 18,
    fontWeight: '900',
    color: '#166534',
    marginTop: 6,
    marginBottom: 4,
  },
  proActiveSubtitle: {
    ...theme.typography.body,
    fontSize: 13,
    color: '#15803D',
    lineHeight: 18,
  },
  skinsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  proPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#D97706',
  },
  skinsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  skinCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    position: 'relative',
  },
  skinCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.secondarySurface,
  },
  skinCardLocked: {
    opacity: 0.85,
  },
  skinImageContainer: {
    width: '100%',
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
    position: 'relative',
  },
  skinImage: {
    width: '100%',
    height: '100%',
  },
  skinLockBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FEF3C7',
    borderRadius: theme.radii.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  skinLockText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  skinName: {
    ...theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  skinDesc: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  skinActivePill: {
    marginTop: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  skinActiveText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  restoreButton: {
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderRadius: theme.radii.full,
    paddingVertical: theme.spacing.sm + 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  restoreButtonText: {
    ...theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  devSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  devSwitchInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  devSwitchLabel: {
    ...theme.typography.body,
    fontWeight: '800',
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  devSwitchSub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  devSecondaryButton: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  devSecondaryButtonText: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    ...theme.typography.subtitle,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  cardSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  cardSubtitleInline: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  webReminderNote: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '700',
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakReminderRow: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  switchInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  presetChipsSection: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  chipsSectionLabel: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  timeChip: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  timeChipSelected: {
    backgroundColor: theme.colors.secondarySurface,
    borderColor: theme.colors.primary,
  },
  timeChipText: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  timeChipTextSelected: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.secondarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.primary,
    lineHeight: 28,
  },
  goalDisplay: {
    alignItems: 'center',
  },
  goalNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.textPrimary,
  },
  goalUnitLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.full,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  segmentOption: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.radii.full,
  },
  segmentActive: {
    backgroundColor: theme.colors.primary,
  },
  segmentText: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  segmentTextActive: {
    color: theme.colors.white,
  },
  clearLogsButton: {
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderRadius: theme.radii.full,
    paddingVertical: theme.spacing.sm + 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  clearLogsButtonText: {
    ...theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  clearedBanner: {
    backgroundColor: '#E8F5E9',
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.xs + 2,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  clearedBannerText: {
    ...theme.typography.caption,
    color: '#2E7D32',
    fontWeight: '700',
    textAlign: 'center',
  },
  restartSection: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  restartOutlineButton: {
    borderWidth: 1.5,
    borderColor: '#E53E3E',
    borderRadius: theme.radii.full,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  restartOutlineText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E53E3E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 35, 61, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    ...theme.typography.subtitle,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  modalMessage: {
    ...theme.typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  modalCancelButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalCancelText: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  modalConfirmClearButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.primary,
  },
  modalConfirmClearText: {
    ...theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.white,
  },
  modalConfirmRestartButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.full,
    backgroundColor: '#E53E3E',
  },
  modalConfirmRestartText: {
    ...theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.white,
  },
  devHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  devBadge: {
    backgroundColor: theme.colors.secondarySurface,
    borderRadius: theme.radii.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  devBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  seedButton: {
    backgroundColor: theme.colors.secondarySurface,
    borderRadius: theme.radii.full,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    marginTop: theme.spacing.sm,
  },
  seedButtonText: {
    ...theme.typography.button,
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primary,
  },
});

