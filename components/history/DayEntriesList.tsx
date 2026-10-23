import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { FoodLogEntry, formatLogTime } from '@/store/foodLogStorage';
import { theme } from '@/constants/theme';
import { formatProteinAmount, ProteinUnit } from '@/store/onboardingStorage';
import { MascotSilhouette } from '@/components/onboarding/MascotSilhouette';
import { triggerLightHaptic } from '@/components/utils/haptics';
import { getProteinFoodById } from '@/constants/proteinFoods';

export interface DayEntriesListProps {
  entries: FoodLogEntry[];
  selectedDate: string; // YYYY-MM-DD
  dailyGoalGrams: number;
  proteinUnit: ProteinUnit;
  onDeleteEntry: (entry: FoodLogEntry) => void;
}

export const DayEntriesList: React.FC<DayEntriesListProps> = ({
  entries,
  selectedDate,
  dailyGoalGrams,
  proteinUnit,
  onDeleteEntry,
}) => {
  const totalDayProtein = entries.reduce(
    (acc, curr) => acc + (Number(curr.proteinGrams) || 0),
    0
  );

  const formattedDate = (() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  })();

  const handleDelete = (entry: FoodLogEntry) => {
    if (Platform.OS !== 'web') {
      triggerLightHaptic();
    }
    onDeleteEntry(entry);
  };

  return (
    <View style={styles.container}>
      {/* Date Header & Day Total */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.dateTitle}>{formattedDate}</Text>
          <Text style={styles.dateSubtitle}>
            {entries.length === 0
              ? 'No entries recorded'
              : `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}
          </Text>
        </View>

        <View style={styles.totalBadge}>
          <Text style={styles.totalBadgeNumber}>
            {formatProteinAmount(totalDayProtein, proteinUnit)}
          </Text>
          {dailyGoalGrams > 0 && (
            <Text style={styles.totalBadgeGoal}>
              {' / ' + formatProteinAmount(dailyGoalGrams, proteinUnit)}
            </Text>
          )}
        </View>
      </View>

      {/* Entries List or Empty State */}
      {entries.length === 0 ? (
        <View style={styles.emptyContainer}>
          {/* Tank beige silhouette as specified: "Empty states with Tank (beige silhouette) and the text 'Nothing logged this day'." */}
          <MascotSilhouette size={120} color="#E8DCC8" />
          <Text style={styles.emptyText}>Nothing logged this day</Text>
        </View>
      ) : (
        <View style={styles.entriesList}>
          {entries.map((entry) => {
            const timeString = formatLogTime(entry.timestamp);

            return (
              <View key={entry.id} style={styles.entryRow}>
                {/* Food Icon / Emoji */}
                <View style={styles.iconCircle}>
                  <Text style={styles.iconEmoji}>
                    {getProteinFoodById(entry.foodId)?.iconSymbol || entry.iconSymbol || '🥚'}
                  </Text>
                </View>

                {/* Name & Time */}
                <View style={styles.entryInfo}>
                  <Text style={styles.entryName} numberOfLines={1}>
                    {entry.foodName}
                  </Text>
                  <Text style={styles.entryMeta}>
                    {timeString}
                    {entry.servingCount > 1 ? ` • ${entry.servingCount} servings` : ''}
                  </Text>
                </View>

                {/* Protein Amount */}
                <Text style={styles.entryProtein}>
                  +{formatProteinAmount(entry.proteinGrams, proteinUnit)}
                </Text>

                {/* Delete Button */}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(entry)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${entry.foodName} entry`}
                >
                  <Text style={styles.deleteIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  dateTitle: {
    ...theme.typography.subtitle,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  dateSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  totalBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: theme.colors.secondarySurface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  totalBadgeNumber: {
    fontSize: 15,
    fontWeight: '900',
    color: theme.colors.primary,
  },
  totalBadgeGoal: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
  },
  emptyText: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  entriesList: {
    gap: 8,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.secondarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconEmoji: {
    fontSize: 20,
  },
  entryInfo: {
    flex: 1,
    marginRight: 8,
  },
  entryName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  entryMeta: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  entryProtein: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primary,
    marginRight: 12,
  },
  deleteButton: {
    padding: 6,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  deleteIcon: {
    fontSize: 14,
  },
});

export default DayEntriesList;
