import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { theme } from '@/constants/theme';
import { AppButton } from '@/components/AppButton';
import { TankMascot } from '@/components/TankMascot';
import { ProteinUnit, formatProteinAmount } from '@/store/onboardingStorage';

export interface GoalCelebrationModalProps {
  visible: boolean;
  totalGrams: number;
  goalGrams: number;
  streak: number;
  proteinUnit?: ProteinUnit;
  onDismiss: () => void;
}

export const GoalCelebrationModal: React.FC<GoalCelebrationModalProps> = ({
  visible,
  totalGrams,
  goalGrams,
  streak,
  proteinUnit = 'g' as ProteinUnit,
  onDismiss,
}: GoalCelebrationModalProps) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onDismiss} />

        <View style={styles.card}>
          {/* Tank Celebration Mascot */}
          <TankMascot
            size={160}
            style={styles.celebrationMascot}
            accessibilityLabel="Tank, the Protie mascot celebrating your daily goal"
          />

          <Text style={styles.title}>GOAL SMASHED! 🏆</Text>
          <Text style={styles.subtitle}>
            Tank is fully charged! You crushed your daily protein goal.
          </Text>

          {/* Stats Summary */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Consumed</Text>
              <Text style={styles.statValue}>
                {formatProteinAmount(totalGrams, proteinUnit)}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Target</Text>
              <Text style={styles.statTarget}>
                {formatProteinAmount(goalGrams, proteinUnit)}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Streak</Text>
              <Text style={styles.statStreak}>🔥 {streak} {streak === 1 ? 'day' : 'days'}</Text>
            </View>
          </View>

          <View style={styles.actionWrap}>
            <AppButton
              testID="celebration-share-button"
              title="SHARE RECAP CARD 🚀"
              variant="primary"
              onPress={() => {
                onDismiss();
                router.push('/goal-smashed');
              }}
              accessibilityLabel="Share recap card"
            />
            <View style={{ height: theme.spacing.sm }} />
            <AppButton
              testID="celebration-dismiss-button"
              title="RETURN TO HOME"
              variant="secondary"
              onPress={onDismiss}
              accessibilityLabel="Return to home screen"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 35, 61, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  celebrationMascot: {
    marginBottom: theme.spacing.sm,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    width: '100%',
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.primary,
  },
  statTarget: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  statStreak: {
    fontSize: 16,
    fontWeight: '900',
    color: '#D97706',
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: theme.colors.border,
  },
  actionWrap: {
    width: '100%',
  },
});

export default GoalCelebrationModal;
