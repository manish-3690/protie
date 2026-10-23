import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { theme } from '@/constants/theme';
import { triggerLightHaptic } from '@/components/utils/haptics';
import { WeekStart } from '@/store/onboardingStorage';

export interface DayProgress {
  dateStr: string; // YYYY-MM-DD
  dayLabel: string; // "M", "T", etc.
  dayNumber: number; // 1 - 31
  proteinGrams: number;
  goalGrams: number;
  isToday: boolean;
  isDisabled: boolean; // Before install date or future date
  isHitGoal: boolean;
}

export interface WeekStripProps {
  days: DayProgress[];
  selectedDate: string;
  onSelectDay: (dateStr: string) => void;
  weekStart: WeekStart;
}

/**
 * Week strip:
 * - Respects Monday / Sunday weekStart setting.
 * - Displays a circular progress ring per day (% of goal).
 * - Highlights today.
 * - Days before install date are disabled (grayed out and non-tappable).
 * - Tapping an enabled day selects it.
 */
export const WeekStrip: React.FC<WeekStripProps> = ({
  days,
  selectedDate,
  onSelectDay,
}) => {
  const handlePressDay = (day: DayProgress) => {
    if (day.isDisabled) return;
    if (Platform.OS !== 'web') {
      triggerLightHaptic();
    }
    onSelectDay(day.dateStr);
  };

  return (
    <View style={styles.container}>
      <View style={styles.stripRow}>
        {days.map((day) => {
          const isSelected = day.dateStr === selectedDate;
          const ratio = day.goalGrams > 0 ? Math.min(1, day.proteinGrams / day.goalGrams) : 0;

          // SVG Ring metrics
          const size = 38;
          const strokeWidth = 3.5;
          const radius = (size - strokeWidth) / 2;
          const circumference = 2 * Math.PI * radius;
          const strokeDashoffset = circumference * (1 - ratio);

          return (
            <TouchableOpacity
              key={day.dateStr}
              style={[
                styles.dayColumn,
                isSelected && styles.dayColumnSelected,
                day.isDisabled && styles.dayColumnDisabled,
              ]}
              onPress={() => handlePressDay(day)}
              disabled={day.isDisabled}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{
                selected: isSelected,
                disabled: day.isDisabled,
              }}
              accessibilityLabel={`${day.dateStr}, ${Math.round(day.proteinGrams)} grams of protein, ${
                day.isHitGoal ? 'Goal reached' : ''
              }`}
            >
              {/* Day Abbreviation */}
              <Text
                style={[
                  styles.dayLabel,
                  isSelected && styles.dayLabelSelected,
                  day.isToday && styles.dayLabelToday,
                  day.isDisabled && styles.textDisabled,
                ]}
              >
                {day.dayLabel}
              </Text>

              {/* Progress Ring with Day Number in center */}
              <View style={styles.ringWrapper}>
                <Svg width={size} height={size}>
                  {/* Background Track */}
                  <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={theme.colors.border}
                    strokeWidth={strokeWidth}
                    fill="none"
                  />
                  {/* Progress Arc */}
                  {ratio > 0 && (
                    <Circle
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      stroke={day.isHitGoal ? theme.colors.primary : theme.colors.gold}
                      strokeWidth={strokeWidth}
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="none"
                      rotation="-90"
                      origin={`${size / 2}, ${size / 2}`}
                    />
                  )}
                </Svg>

                <View style={styles.dayNumberCenter}>
                  <Text
                    style={[
                      styles.dayNumberText,
                      isSelected && styles.dayNumberTextSelected,
                      day.isToday && styles.dayNumberTextToday,
                      day.isDisabled && styles.textDisabled,
                    ]}
                  >
                    {day.dayNumber}
                  </Text>
                </View>
              </View>

              {/* Today indicator pip */}
              {day.isToday && (
                <View
                  style={[
                    styles.todayDot,
                    isSelected && { backgroundColor: theme.colors.primary },
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: theme.spacing.sm,
  },
  stripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: 6,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  dayColumn: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: theme.radii.lg,
    flex: 1,
    marginHorizontal: 1,
  },
  dayColumnSelected: {
    backgroundColor: theme.colors.secondarySurface,
  },
  dayColumnDisabled: {
    opacity: 0.35,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  dayLabelSelected: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  dayLabelToday: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  ringWrapper: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayNumberCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  dayNumberTextSelected: {
    color: theme.colors.primary,
    fontWeight: '900',
  },
  dayNumberTextToday: {
    fontWeight: '900',
    color: theme.colors.primary,
  },
  textDisabled: {
    color: theme.colors.disabledText,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
    marginTop: 4,
  },
});

export default WeekStrip;
