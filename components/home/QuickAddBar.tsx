import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { PROTEIN_FOODS, ProteinFood } from '@/constants/proteinFoods';
import { theme } from '@/constants/theme';
import { ProteinUnit, formatProteinAmount } from '@/store/onboardingStorage';

export interface QuickAddBarProps {
  onSelectFood: (food: ProteinFood) => void;
  onOpenCustomLog: () => void;
  proteinUnit?: ProteinUnit;
}

export const QuickAddBar: React.FC<QuickAddBarProps> = ({
  onSelectFood,
  onOpenCustomLog,
  proteinUnit = 'g' as ProteinUnit,
}: QuickAddBarProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Quick-Add Protein</Text>
        <TouchableOpacity
          onPress={onOpenCustomLog}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Log custom protein amount"
        >
          <Text style={styles.customLink}>+ Custom Entry</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.gridContainer}>
        {PROTEIN_FOODS.map((food) => {
          return (
            <TouchableOpacity
              key={food.id}
              style={styles.card}
              activeOpacity={0.75}
              onPress={() => onSelectFood(food)}
              accessibilityRole="button"
              accessibilityLabel={`Add ${food.name}, ${food.defaultProteinGrams} grams protein`}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: food.badgeColor + '20' },
                ]}
              >
                <Text style={styles.icon}>{food.iconSymbol}</Text>
              </View>

              <Text style={styles.foodName} numberOfLines={1}>
                {food.name}
              </Text>

              <View style={styles.amountBadge}>
                <Text style={styles.amountText}>
                  +{formatProteinAmount(food.defaultProteinGrams, proteinUnit)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* 9th chip: Other / Custom protein entry */}
        <TouchableOpacity
          key="other"
          style={[styles.card, styles.customCard]}
          activeOpacity={0.75}
          onPress={onOpenCustomLog}
          accessibilityRole="button"
          accessibilityLabel="Log custom protein amount"
        >
          <View style={[styles.iconContainer, styles.customIconContainer]}>
            <Text style={styles.customIcon}>➕</Text>
          </View>
          <Text style={styles.foodName} numberOfLines={1}>
            Other
          </Text>
          <View style={[styles.amountBadge, styles.customAmountBadge]}>
            <Text style={styles.customAmountText}>Custom</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: theme.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  title: {
    ...theme.typography.subtitle,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  customLink: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: theme.spacing.sm,
  },
  card: {
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
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  icon: {
    fontSize: 22,
  },
  foodName: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  amountBadge: {
    backgroundColor: theme.colors.secondarySurface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
  },
  amountText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  customCard: {
    borderStyle: 'dashed',
    borderColor: theme.colors.primary + '80',
    backgroundColor: theme.colors.background,
  },
  customIconContainer: {
    backgroundColor: theme.colors.secondarySurface,
  },
  customIcon: {
    fontSize: 18,
  },
  customAmountBadge: {
    backgroundColor: theme.colors.border,
  },
  customAmountText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
});

export default QuickAddBar;
