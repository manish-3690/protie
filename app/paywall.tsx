import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AppButton } from '@/components/AppButton';
import { TankMascot } from '@/components/TankMascot';
import { theme } from '@/constants/theme';
import { PRICING_PLANS, PAID_FEATURES } from '@/constants/pricing';
import {
  mockPurchase,
  mockRestorePurchases,
  hasDownsellBeenShown,
  markDownsellShown,
  getDownsellExpiryTime,
} from '@/store/purchaseStorage';
import { triggerLightHaptic } from '@/components/utils/haptics';

export default function PaywallScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { source } = useLocalSearchParams<{ source?: 'onboarding' | 'feature' }>();

  // Screen step: 1 = Trial Explainer Timeline, 2 = Plans & Checkout
  const [screenStep, setScreenStep] = useState<1 | 2>(1);

  // Selected plan on Screen 2 (default Monthly with 3-day free trial)
  const [selectedPlanId, setSelectedPlanId] = useState<'monthly' | 'lifetime'>('monthly');

  // Close button timer (appears after 3 seconds)
  const [showCloseButton, setShowCloseButton] = useState<boolean>(false);

  // Rotating headline index & animation for Screen 2
  const [currentFeatureIdx, setCurrentFeatureIdx] = useState<number>(0);
  const featureOpacity = useSharedValue(1);

  // Downsell modal state
  const [showDownsellModal, setShowDownsellModal] = useState<boolean>(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(3600); // 60 minutes
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Terms & Privacy modal
  const [legalModalText, setLegalModalText] = useState<{ title: string; content: string } | null>(null);

  // Timer: Show close button after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowCloseButton(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Timer: Rotate paid feature headline every 3 seconds with 300ms fade
  useEffect(() => {
    if (screenStep !== 2) return;

    const interval = setInterval(() => {
      // Fade out (300ms)
      featureOpacity.value = withTiming(0, { duration: 300, easing: Easing.ease }, () => {
        // Change text
        // Note: Using runOnJS or direct interval update
      });

      setTimeout(() => {
        setCurrentFeatureIdx((prev) => (prev + 1) % PAID_FEATURES.length);
        // Fade in (300ms)
        featureOpacity.value = withTiming(1, { duration: 300, easing: Easing.ease });
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, [screenStep, featureOpacity]);

  const animatedFeatureStyle = useAnimatedStyle(() => ({
    opacity: featureOpacity.value,
  }));

  // Countdown timer for Downsell modal (60-minute countdown)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (showDownsellModal) {
      getDownsellExpiryTime().then((expiry) => {
        const updateRemaining = () => {
          const diff = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
          setCountdownSeconds(diff);
        };
        updateRemaining();
        interval = setInterval(updateRemaining, 1000);
      });
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showDownsellModal]);

  // Clear stack and navigate directly to Home
  const exitToHome = () => {
    try {
      navigation.reset({
        index: 0,
        routes: [{ name: 'home/index' as never }],
      });
    } catch {
      router.replace('/home');
    }
  };

  // Downsell modal dismiss handler
  const handleDismissDownsell = () => {
    setShowDownsellModal(false);
    exitToHome();
  };

  // Exit handler for "Maybe later" buttons
  const handleExit = () => {
    if (Platform.OS !== 'web') triggerLightHaptic();
    if (source === 'feature') {
      if (router.canGoBack()) {
        router.back();
      } else {
        exitToHome();
      }
    } else {
      exitToHome();
    }
  };

  // Handle Close Button (X) press
  const handleClose = async () => {
    if (Platform.OS !== 'web') triggerLightHaptic();
    if (source === 'feature') {
      if (router.canGoBack()) {
        router.back();
      } else {
        exitToHome();
      }
      return;
    }

    const alreadyShown = await hasDownsellBeenShown();
    if (!alreadyShown) {
      await markDownsellShown();
      setShowDownsellModal(true);
    } else {
      exitToHome();
    }
  };

  // Handle Start Free Trial / Purchase
  const handleStartPurchase = async (planId: string) => {
    setIsSubmitting(true);
    if (Platform.OS !== 'web') triggerLightHaptic();

    try {
      const result = await mockPurchase(planId);
      if (result.success) {
        Alert.alert('Welcome to Protie Pro! 🎉', 'All premium features are now unlocked for your account.', [
          {
            text: "Let's Go",
            onPress: () => {
              if (source === 'feature' && router.canGoBack()) {
                router.back();
              } else {
                exitToHome();
              }
            },
          },
        ]);
      } else {
        Alert.alert('Purchase error', 'Could not complete mock purchase. Please try again.');
      }
    } catch {
      Alert.alert('Purchase error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Restore Purchases
  const handleRestore = async () => {
    if (Platform.OS !== 'web') triggerLightHaptic();
    setIsSubmitting(true);
    try {
      const result = await mockRestorePurchases();
      if (result.isPro) {
        Alert.alert('Purchases Restored', 'Your Protie Pro access is active!', [
          {
            text: 'Continue',
            onPress: () => {
              if (source === 'feature' && router.canGoBack()) {
                router.back();
              } else {
                exitToHome();
              }
            },
          },
        ]);
      } else {
        Alert.alert('No Active Subscription', 'No prior active purchases were found for this account.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format MM:SS for 60-min countdown
  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <ScreenContainer scrollable={false} withHorizontalPadding={false} style={styles.container}>
      {/* Header with Close Button appearing after 3s (safe-area aware, 44px hit area) */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.headerSpacer} />
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>PROTIE PRO</Text>
        </View>
        <View style={styles.headerCloseBox}>
          {showCloseButton && (
            <Animated.View entering={FadeIn.duration(400)}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Close paywall"
              >
                <Text style={styles.closeButtonIcon}>✕</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ================= SCREEN 1: TRIAL EXPLAINER TIMELINE ================= */}
        {screenStep === 1 && (
          <View style={styles.stepContainer}>
            {/* Mascot Banner */}
            <View style={styles.mascotWrapper}>
              <TankMascot skinId="astronaut" size={150} accessibilityLabel="Tank welcoming you to Pro" />
            </View>

            <Text style={styles.mainTitle}>Try Protie Pro Free</Text>
            <Text style={styles.mainSubtitle}>
              Experience the ultimate character-driven protein tracking companion.
            </Text>

            {/* Trial Explainer Timeline Card */}
            <View style={styles.timelineCard}>
              {/* Step 1: Today */}
              <View style={styles.timelineItem}>
                <View style={styles.timelineNodeActive}>
                  <Text style={styles.nodeIcon}>🔓</Text>
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Today: unlock everything</Text>
                  <Text style={styles.timelineSubtitle}>
                    Instant access to custom foods, AI scanning, insights, and all mascot skins.
                  </Text>
                </View>
              </View>

              <View style={styles.timelineConnector} />

              {/* Step 2: Day 2 */}
              <View style={styles.timelineItem}>
                <View style={styles.timelineNode}>
                  <Text style={styles.nodeIcon}>🔔</Text>
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Day 2: reminder before trial ends</Text>
                  <Text style={styles.timelineSubtitle}>
                    We will send a friendly reminder notification so you are always in control.
                  </Text>
                </View>
              </View>

              <View style={styles.timelineConnector} />

              {/* Step 3: Day 3 */}
              <View style={styles.timelineItem}>
                <View style={styles.timelineNode}>
                  <Text style={styles.nodeIcon}>⭐️</Text>
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Day 3: trial ends</Text>
                  <Text style={styles.timelineSubtitle}>
                    Your chosen plan begins. Cancel anytime in store settings with zero hassle.
                  </Text>
                </View>
              </View>
            </View>

            {/* "No payment due today" Badge */}
            <View style={styles.noPaymentCallout}>
              <Text style={styles.noPaymentCheck}>✓</Text>
              <Text style={styles.noPaymentText}>No payment due today</Text>
            </View>

            {/* Primary Action Button & Pro is Optional "Maybe later" */}
            <View style={styles.buttonSection}>
              <AppButton
                title="View Plans"
                variant="primary"
                onPress={() => {
                  if (Platform.OS !== 'web') triggerLightHaptic();
                  setScreenStep(2);
                }}
                accessibilityLabel="Continue to view subscription plans"
              />

              <TouchableOpacity
                style={styles.maybeLaterButton}
                onPress={handleExit}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Maybe later, continue with free plan"
              >
                <Text style={styles.maybeLaterText}>Maybe later</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ================= SCREEN 2: PLANS & CHECKOUT ================= */}
        {screenStep === 2 && (
          <View style={styles.stepContainer}>
            {/* Mascot Visual */}
            <View style={styles.compactMascotWrapper}>
              <TankMascot skinId="astronaut" size={110} accessibilityLabel="Tank cheering for Pro" />
            </View>

            {/* Rotating Headline above Plans (3s cycle, 300ms fade) */}
            <View style={styles.rotatingHeadlineBox}>
              <Text style={styles.rotatingPrefix}>UNLOCK WITH PRO:</Text>
              <Animated.View style={animatedFeatureStyle}>
                <Text style={styles.rotatingFeatureText}>
                  ✨ {PAID_FEATURES[currentFeatureIdx]}
                </Text>
              </Animated.View>
            </View>

            {/* Plan Options */}
            <View style={styles.plansContainer}>
              {/* Lifetime Plan (Marked BEST VALUE) */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedPlanId === 'lifetime' && styles.planCardSelected,
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') triggerLightHaptic();
                  setSelectedPlanId('lifetime');
                }}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedPlanId === 'lifetime' }}
                accessibilityLabel={`Lifetime plan, ${PRICING_PLANS.lifetime.priceFormatted} one-time, Best Value`}
              >
                <View style={styles.bestValueBadge}>
                  <Text style={styles.bestValueText}>BEST VALUE</Text>
                </View>

                <View style={styles.planCardContent}>
                  <View style={styles.planRadioCol}>
                    <View
                      style={[
                        styles.radioOuter,
                        selectedPlanId === 'lifetime' && styles.radioOuterSelected,
                      ]}
                    >
                      {selectedPlanId === 'lifetime' && <View style={styles.radioInner} />}
                    </View>
                  </View>

                  <View style={styles.planDetailsCol}>
                    <Text style={styles.planName}>{PRICING_PLANS.lifetime.name}</Text>
                    <Text style={styles.planTagline}>{PRICING_PLANS.lifetime.tagline}</Text>
                  </View>

                  <View style={styles.planPriceCol}>
                    <Text style={styles.planPrice}>{PRICING_PLANS.lifetime.priceFormatted}</Text>
                    <Text style={styles.planPeriod}>{PRICING_PLANS.lifetime.billingPeriod}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Monthly Plan */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedPlanId === 'monthly' && styles.planCardSelected,
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') triggerLightHaptic();
                  setSelectedPlanId('monthly');
                }}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedPlanId === 'monthly' }}
                accessibilityLabel={`Monthly plan, 3-day free trial then ${PRICING_PLANS.monthly.priceFormatted} per month`}
              >
                <View style={styles.trialBadge}>
                  <Text style={styles.trialBadgeText}>3-DAY FREE TRIAL</Text>
                </View>

                <View style={styles.planCardContent}>
                  <View style={styles.planRadioCol}>
                    <View
                      style={[
                        styles.radioOuter,
                        selectedPlanId === 'monthly' && styles.radioOuterSelected,
                      ]}
                    >
                      {selectedPlanId === 'monthly' && <View style={styles.radioInner} />}
                    </View>
                  </View>

                  <View style={styles.planDetailsCol}>
                    <Text style={styles.planName}>{PRICING_PLANS.monthly.name}</Text>
                    <Text style={styles.planTagline}>{PRICING_PLANS.monthly.tagline}</Text>
                  </View>

                  <View style={styles.planPriceCol}>
                    <Text style={styles.planPrice}>{PRICING_PLANS.monthly.priceFormatted}</Text>
                    <Text style={styles.planPeriod}>{PRICING_PLANS.monthly.billingPeriod}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Primary Action Button: "Start 3-day free trial" or "Get Lifetime (₹1,999)" */}
            <View style={styles.buttonSection}>
              <AppButton
                title={
                  isSubmitting
                    ? 'Please wait...'
                    : selectedPlanId === 'monthly'
                      ? 'Start 3-day free trial'
                      : 'Get Lifetime (₹1,999)'
                }
                variant="primary"
                onPress={() => handleStartPurchase(selectedPlanId)}
                disabled={isSubmitting}
                accessibilityLabel={
                  selectedPlanId === 'monthly'
                    ? 'Start 3-day free trial'
                    : 'Get Lifetime (₹1,999)'
                }
              />
            </View>

            {/* Links: Restore purchases • Terms • Privacy */}
            <View style={styles.footerLinksRow}>
              <TouchableOpacity
                onPress={handleRestore}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Restore purchases"
              >
                <Text style={styles.footerLinkText}>Restore purchases</Text>
              </TouchableOpacity>

              <Text style={styles.footerDot}>•</Text>

              <TouchableOpacity
                onPress={() =>
                  setLegalModalText({
                    title: 'Terms of Service',
                    content:
                      'Subscriptions automatically renew unless auto-renew is cancelled at least 24 hours before the end of the current period. Account will be charged for renewal within 24 hours prior to the end of the current period. Manage or cancel subscriptions in Google Play / App Store account settings.',
                  })
                }
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Terms of Service"
              >
                <Text style={styles.footerLinkText}>Terms</Text>
              </TouchableOpacity>

              <Text style={styles.footerDot}>•</Text>

              <TouchableOpacity
                onPress={() =>
                  setLegalModalText({
                    title: 'Privacy Policy',
                    content:
                      'Protie is local-first. We do not store your nutrition data, body metrics, or food logs on remote servers. All data remains exclusively on your device.',
                  })
                }
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Privacy Policy"
              >
                <Text style={styles.footerLinkText}>Privacy</Text>
              </TouchableOpacity>
            </View>

            {/* Pro is Optional: Maybe later text button at bottom of Screen 2 */}
            <TouchableOpacity
              style={styles.maybeLaterButton}
              onPress={handleExit}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Maybe later, continue with free plan"
            >
              <Text style={styles.maybeLaterText}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ================= DOWNSELL MODAL: 50% OFF FIRST YEAR ================= */}
      <Modal
        visible={showDownsellModal}
        transparent
        animationType="fade"
        onRequestClose={handleDismissDownsell}
      >
        <Pressable style={styles.downsellOverlay} onPress={handleDismissDownsell}>
          <Pressable style={styles.downsellCard} onPress={(e) => e.stopPropagation()}>
            {/* Top 50% OFF Pill */}
            <View style={styles.downsellBadge}>
              <Text style={styles.downsellBadgeText}>SPECIAL ONE-TIME OFFER</Text>
            </View>

            <Text style={styles.downsellTitle}>Wait! 50% off your first year</Text>

            {/* 60-Minute Countdown Display */}
            <View style={styles.countdownBox}>
              <Text style={styles.countdownLabel}>OFFER EXPIRES IN</Text>
              <Text style={styles.countdownDigits}>
                ⏳ {formatCountdown(countdownSeconds)} remaining
              </Text>
            </View>

            {/* Price Strikethrough Display */}
            <View style={styles.downsellPriceRow}>
              <Text style={styles.originalPrice}>₹1,999</Text>
              <Text style={styles.discountedPrice}>₹999</Text>
              <Text style={styles.discountPeriod}>/ first year</Text>
            </View>

            <Text style={styles.downsellDesc}>
              Unlock custom food logging, AI scanning, and unlimited history for less than ₹84/month.
            </Text>

            {/* Claim Offer Button */}
            <View style={styles.downsellActionBox}>
              <AppButton
                title="Claim 50% Discount"
                variant="primary"
                onPress={() => {
                  setShowDownsellModal(false);
                  handleStartPurchase('downsell_annual');
                }}
                accessibilityLabel="Claim 50 percent discount offer"
              />

              <TouchableOpacity
                style={styles.declineButton}
                onPress={handleDismissDownsell}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Decline offer and continue with free plan"
              >
                <Text style={styles.declineButtonText}>No thanks, continue with Free</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Legal Dialog Modal */}
      <Modal
        visible={legalModalText !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setLegalModalText(null)}
      >
        <Pressable style={styles.downsellOverlay} onPress={() => setLegalModalText(null)}>
          <Pressable style={styles.legalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.legalTitle}>{legalModalText?.title}</Text>
            <Text style={styles.legalContent}>{legalModalText?.content}</Text>
            <TouchableOpacity
              style={styles.legalCloseButton}
              onPress={() => setLegalModalText(null)}
              activeOpacity={0.75}
            >
              <Text style={styles.legalCloseButtonText}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  headerSpacer: {
    width: 44,
    height: 44,
  },
  headerBadge: {
    backgroundColor: theme.colors.secondarySurface,
    borderRadius: theme.radii.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: 1,
  },
  headerCloseBox: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.card,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonIcon: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textSecondary,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  stepContainer: {
    alignItems: 'center',
    paddingTop: theme.spacing.xs,
  },
  mascotWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: theme.spacing.xs,
  },
  compactMascotWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  mainTitle: {
    ...theme.typography.title,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: 4,
  },
  mainSubtitle: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  timelineCard: {
    width: '100%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: theme.spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineNodeActive: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.secondarySurface,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  timelineNode: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.background,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  nodeIcon: {
    fontSize: 15,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  timelineSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    lineHeight: 17,
  },
  timelineConnector: {
    width: 2,
    height: 18,
    backgroundColor: theme.colors.border,
    marginLeft: 16,
    marginVertical: 4,
  },
  noPaymentCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.secondarySurface,
    borderRadius: theme.radii.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginBottom: theme.spacing.lg,
  },
  noPaymentCheck: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.colors.primary,
    marginRight: 6,
  },
  noPaymentText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  rotatingHeadlineBox: {
    width: '100%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  rotatingPrefix: {
    fontSize: 10,
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: 1,
    marginBottom: 2,
  },
  rotatingFeatureText: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  plansContainer: {
    width: '100%',
    gap: 12,
    marginBottom: theme.spacing.md,
  },
  planCard: {
    width: '100%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
  },
  planCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#FFFDF9',
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    right: 18,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.full,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  bestValueText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  trialBadge: {
    position: 'absolute',
    top: -10,
    right: 18,
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  trialBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: theme.colors.textPrimary,
  },
  planCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planRadioCol: {
    marginRight: 12,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: theme.colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
  planDetailsCol: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  planTagline: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  planPriceCol: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.primary,
  },
  planPeriod: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  buttonSection: {
    width: '100%',
    marginVertical: theme.spacing.sm,
  },
  footerLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 10,
  },
  footerLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  footerDot: {
    fontSize: 12,
    color: theme.colors.border,
  },

  // Downsell Modal Styles
  downsellOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 35, 61, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  downsellCard: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 10,
    alignItems: 'center',
  },
  downsellBadge: {
    backgroundColor: theme.colors.secondarySurface,
    borderRadius: theme.radii.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  downsellBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: 0.8,
  },
  downsellTitle: {
    ...theme.typography.title,
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  countdownBox: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.lg,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  countdownLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: theme.colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 2,
  },
  countdownDigits: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.primary,
  },
  downsellPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: theme.spacing.xs,
  },
  originalPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  discountedPrice: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.primary,
  },
  discountPeriod: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  downsellDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  downsellActionBox: {
    width: '100%',
    alignItems: 'center',
  },
  declineButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  declineButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  legalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  legalTitle: {
    ...theme.typography.subtitle,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  legalContent: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
  },
  legalCloseButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.full,
    paddingVertical: 10,
    alignItems: 'center',
  },
  legalCloseButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  maybeLaterButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  maybeLaterText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
