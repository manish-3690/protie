import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { theme } from '@/constants/theme';
import { ChallengeProgress, setActiveChallengeId } from '@/store/challengeStorage';

export interface WeeklyChallengesCardProps {
  challenges: ChallengeProgress[];
  isPro: boolean;
  onRefresh?: () => void;
}

export const WeeklyChallengesCard: React.FC<WeeklyChallengesCardProps> = ({
  challenges,
  isPro,
  onRefresh,
}) => {
  const handleSelectChallenge = async (item: ChallengeProgress) => {
    if (isPro) {
      // Pro users already have all challenges active
      return;
    }

    if (item.isActive) {
      return;
    }

    // Free user tapped an inactive challenge
    // Allow them to activate it as their 1 active challenge, or prompt Pro if they want to track all simultaneously
    await setActiveChallengeId(item.challenge.id);
    onRefresh?.();
  };

  const handleProUpsell = () => {
    router.push('/paywall');
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.headerIcon}>⚡</Text>
          <Text style={styles.headerTitle}>Weekly Challenges</Text>
        </View>
        {isPro ? (
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>PRO ACTIVE</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.upgradeBadge}
            onPress={handleProUpsell}
            activeOpacity={0.8}
            accessibilityLabel="Upgrade to Pro to track all challenges simultaneously"
          >
            <Text style={styles.upgradeBadgeText}>👑 UNLOCK ALL</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.subtitle}>
        {isPro
          ? 'All 3 weekly challenges are active and tracking simultaneously!'
          : '1 active challenge at a time. Upgrade to Pro to track all 3 at once.'}
      </Text>

      <View style={styles.list}>
        {challenges.map((item) => {
          const { challenge, current, target, progressPercent, isCompleted, isActive } = item;

          return (
            <TouchableOpacity
              key={challenge.id}
              style={[
                styles.challengeItem,
                isActive && styles.challengeItemActive,
                isCompleted && styles.challengeItemCompleted,
                !isActive && !isPro && styles.challengeItemInactive,
              ]}
              onPress={() => handleSelectChallenge(item)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`${challenge.title}, ${current} of ${target} ${challenge.unit} complete`}
            >
              <View style={styles.itemHeader}>
                <View style={styles.itemTitleRow}>
                  <Text style={styles.challengeIcon}>{challenge.icon}</Text>
                  <View style={styles.titleTextWrap}>
                    <Text
                      style={[
                        styles.challengeTitle,
                        isCompleted && styles.challengeTitleCompleted,
                      ]}
                      numberOfLines={1}
                    >
                      {challenge.title}
                    </Text>
                    <Text style={styles.challengeDesc} numberOfLines={1}>
                      {challenge.description}
                    </Text>
                  </View>
                </View>

                {/* Status Indicator */}
                {isCompleted ? (
                  <View style={styles.completedBadge}>
                    <Text style={styles.completedBadgeText}>COMPLETED ✓</Text>
                  </View>
                ) : isActive ? (
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>ACTIVE</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.lockPill}
                    onPress={handleProUpsell}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.lockPillText}>🔒 PRO</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Progress Bar & Counter */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${progressPercent}%` },
                      isCompleted && styles.progressBarFillCompleted,
                    ]}
                  />
                </View>
                <Text style={styles.progressCounter}>
                  {current}/{target} {challenge.unit}
                </Text>
              </View>

              {!isPro && !isActive && (
                <Text style={styles.tapToActivateText}>
                  Tap to set as your active challenge
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#17233D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    marginVertical: theme.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#17233D',
  },
  proBadge: {
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E8E3E',
    letterSpacing: 0.5,
  },
  upgradeBadge: {
    backgroundColor: '#FFE7BD',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D97935',
  },
  upgradeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97935',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: theme.spacing.md,
    lineHeight: 16,
  },
  list: {
    gap: theme.spacing.sm,
  },
  challengeItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  challengeItemActive: {
    borderColor: '#D97935',
    backgroundColor: '#FFFBF7',
  },
  challengeItemCompleted: {
    borderColor: '#48BB78',
    backgroundColor: '#F0FDF4',
  },
  challengeItemInactive: {
    opacity: 0.75,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  challengeIcon: {
    fontSize: 22,
  },
  titleTextWrap: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#17233D',
  },
  challengeTitleCompleted: {
    color: '#1E8E3E',
  },
  challengeDesc: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  activePill: {
    backgroundColor: '#D97935',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  activePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  completedBadge: {
    backgroundColor: '#48BB78',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  completedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  lockPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  lockPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  progressBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#D97935',
    borderRadius: 4,
  },
  progressBarFillCompleted: {
    backgroundColor: '#48BB78',
  },
  progressCounter: {
    fontSize: 11,
    fontWeight: '600',
    color: '#17233D',
    minWidth: 65,
    textAlign: 'right',
  },
  tapToActivateText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D97935',
    marginTop: 6,
    textAlign: 'right',
  },
});
