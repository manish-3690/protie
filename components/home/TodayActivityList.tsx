import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { FoodLogEntry, formatLogTime } from '@/store/foodLogStorage';
import { theme } from '@/constants/theme';
import { ProteinUnit, formatProteinAmount } from '@/store/onboardingStorage';
import { getProteinFoodById } from '@/constants/proteinFoods';

export interface TodayActivityListProps {
  entries: FoodLogEntry[];
  proteinUnit?: ProteinUnit;
  onDeleteEntry: (entry: FoodLogEntry) => Promise<void> | void;
  onOpenQuickAdd: () => void;
}

export const TodayActivityList: React.FC<TodayActivityListProps> = ({
  entries,
  proteinUnit = 'g',
  onDeleteEntry,
  onOpenQuickAdd,
}) => {
  const handleDeletePress = (entry: FoodLogEntry) => {
    // Delete immediately without Alert/window.confirm
    onDeleteEntry(entry);
  };

  if (!entries || entries.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>{"Today's Activity"}</Text>
        <TouchableOpacity
          style={styles.emptyCard}
          activeOpacity={0.8}
          onPress={onOpenQuickAdd}
          accessibilityRole="button"
          accessibilityLabel="No protein logged today. Tap to log your first food"
        >
          <Text style={styles.emptyIcon}>🍽️</Text>
          <Text style={styles.emptyTitle}>Nothing logged yet today</Text>
          <Text style={styles.emptySubtitle}>
            Tap a food item above or quick-add to feed Tank and power up your daily streak!
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>{"Today's Activity"}</Text>
        <Text style={styles.countBadge}>{entries.length} logged</Text>
      </View>

      <View style={styles.listCard}>
        {entries.map((entry, index) => {
          const isLast = index === entries.length - 1;
          const food = getProteinFoodById(entry.foodId);
          const displayIcon = food?.iconSymbol || entry.iconSymbol || '🥚';

          return (
            <View
              key={entry.id}
              style={[styles.row, !isLast && styles.rowBorder]}
            >
              <View style={styles.iconCircle}>
                <Text style={styles.itemIcon}>{displayIcon}</Text>
              </View>

              <View style={styles.details}>
                <Text style={styles.foodName} numberOfLines={1}>
                  {entry.foodName}
                </Text>
                <Text style={styles.timeText}>
                  {formatLogTime(entry.timestamp)}
                  {entry.servingCount > 1 ? ` • ${entry.servingCount}x serving` : ''}
                </Text>
              </View>

              <View style={styles.amountContainer}>
                <Text style={styles.amountText}>
                  +{formatProteinAmount(entry.proteinGrams, proteinUnit)}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeletePress(entry)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${entry.foodName} log`}
              >
                <Text style={styles.deleteIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: theme.spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  sectionTitle: {
    ...theme.typography.subtitle,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  countBadge: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.secondarySurface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
  },
  listCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.secondarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  itemIcon: {
    fontSize: 18,
  },
  details: {
    flex: 1,
  },
  foodName: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  timeText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  amountContainer: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    backgroundColor: theme.colors.secondarySurface,
    borderRadius: theme.radii.full,
    marginRight: theme.spacing.xs,
  },
  amountText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  deleteButton: {
    padding: theme.spacing.xs,
    marginLeft: 2,
  },
  deleteIcon: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: theme.spacing.xs,
  },
  emptyTitle: {
    ...theme.typography.body,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default TodayActivityList;
