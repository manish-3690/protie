import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { theme } from '@/constants/theme';
import { TankMascot } from '@/components/TankMascot';
import { ConfettiOverlay } from '@/components/home/ConfettiOverlay';
import {
  getFoodLogsForDate,
  calculateTotalProtein,
  getStreakData,
  getLocalDateString,
} from '@/store/foodLogStorage';
import {
  getOnboardingData,
  formatProteinAmount,
  ProteinUnit,
} from '@/store/onboardingStorage';
import { getSelectedSkinId } from '@/store/skinStorage';
import { DEFAULT_SKIN_ID } from '@/constants/mascotSkins';

export default function GoalSmashedScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const cardRef = useRef<View>(null);

  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [totalGrams, setTotalGrams] = useState(0);
  const [goalGrams, setGoalGrams] = useState(100);
  const [streak, setStreak] = useState(1);
  const [unit, setUnit] = useState<ProteinUnit>('g');
  const [skinId, setSkinId] = useState(DEFAULT_SKIN_ID);

  useEffect(() => {
    async function loadStats() {
      try {
        const [todayLogs, profile, streakData, skin] = await Promise.all([
          getFoodLogsForDate(),
          getOnboardingData(),
          getStreakData(),
          getSelectedSkinId(),
        ]);

        const total = calculateTotalProtein(todayLogs);
        setTotalGrams(total);
        setGoalGrams(profile.dailyGoalGrams || 100);
        setStreak(streakData.currentStreak || 1);
        setUnit(profile.proteinUnit || 'g');
        setSkinId(skin);
      } catch (err) {
        console.warn('Failed to load goal smashed data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const handleShare = async () => {
    if (!cardRef.current) return;
    setSharing(true);

    try {
      // Capture the card view into an image
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

      // Web guard with direct download fallback
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = uri;
        link.download = `protie-goal-smashed-${getLocalDateString()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // Native mobile sharing
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your Protie protein victory!',
          UTI: 'public.png',
        });
      } else {
        Alert.alert('Sharing unavailable', 'Sharing is not supported on this device.');
      }
    } catch (error) {
      console.warn('Share error:', error);
      Alert.alert('Share Failed', 'Unable to generate or share the recap card.');
    } finally {
      setSharing(false);
    }
  };

  const todayDateFormatted = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const cardWidth = Math.min(360, windowWidth - 40);
  const mascotDimension = Math.min(180, cardWidth * 0.52);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Confetti Celebration */}
      <ConfettiOverlay />

      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Close screen"
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Goal Smashed</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color="#D97935" style={styles.loader} />
        ) : (
          <>
            {/* Shareable Card Ref */}
            <View
              ref={cardRef}
              collapsable={false}
              style={[styles.shareCard, { width: cardWidth }]}
            >
              {/* Protie Branding Pill */}
              <View style={styles.brandRow}>
                <View style={styles.brandLogoWrap}>
                  <Text style={styles.brandLogo}>⚡ PROTIE</Text>
                </View>
                <Text style={styles.cardDate}>{todayDateFormatted}</Text>
              </View>

              {/* Celebration Title */}
              <Text style={styles.cardTitle}>GOAL SMASHED!</Text>
              <Text style={styles.cardSubtitle}>Tank is fully charged today</Text>

              {/* Mascot Asset in Active Skin */}
              <View style={styles.mascotWrap}>
                <TankMascot
                  skinId={skinId}
                  size={mascotDimension}
                  accessibilityLabel="Tank celebration"
                />
              </View>

              {/* Stats Highlights */}
              <View style={styles.statsCardInner}>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>PROTEIN</Text>
                  <Text style={styles.statValue}>
                    {formatProteinAmount(totalGrams, unit)}
                  </Text>
                  <Text style={styles.statTarget}>
                    Target: {formatProteinAmount(goalGrams, unit)}
                  </Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>STREAK</Text>
                  <Text style={styles.streakValue}>🔥 {streak}</Text>
                  <Text style={styles.statTarget}>
                    {streak === 1 ? 'Day Active' : 'Days Active'}
                  </Text>
                </View>
              </View>

              {/* Card Footer Tagline */}
              <View style={styles.cardFooter}>
                <Text style={styles.footerTagline}>protie.app • Muscle consistency</Text>
              </View>
            </View>

            {/* Bottom Sharing Actions */}
            <View style={styles.actionsWrap}>
              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShare}
                disabled={sharing}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Share recap card"
              >
                {sharing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.shareButtonText}>
                    {Platform.OS === 'web' ? 'DOWNLOAD CARD 📥' : 'SHARE RECAP CARD 🚀'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => router.replace('/home')}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Return home"
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 36,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  loader: {
    marginVertical: 40,
  },
  shareCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D97935',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  brandRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  brandLogoWrap: {
    backgroundColor: '#D97935',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  brandLogo: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  cardDate: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#CBD5E1',
    marginTop: 2,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  mascotWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: theme.spacing.xs,
  },
  statsCardInner: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    alignItems: 'center',
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 38,
    backgroundColor: '#334155',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#38BDF8',
  },
  streakValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FB923C',
  },
  statTarget: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  cardFooter: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.xs,
  },
  footerTagline: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  actionsWrap: {
    width: '100%',
    maxWidth: 360,
    marginTop: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  shareButton: {
    backgroundColor: '#D97935',
    paddingVertical: 14,
    borderRadius: theme.radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#D97935',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  doneButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
});
