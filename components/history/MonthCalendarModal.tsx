import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { theme } from '@/constants/theme';
import { WeekStart } from '@/store/onboardingStorage';
import { getLocalDateString } from '@/store/foodLogStorage';
import { triggerLightHaptic } from '@/components/utils/haptics';

export interface MonthCalendarModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  installDate: string; // YYYY-MM-DD
  dailyGoalGrams: number;
  dailyTotalsMap: Record<string, number>;
  weekStart: WeekStart;
  onSelectDate: (dateStr: string) => void;
}

export const MonthCalendarModal: React.FC<MonthCalendarModalProps> = ({
  visible,
  onClose,
  selectedDate,
  installDate,
  dailyGoalGrams,
  dailyTotalsMap,
  weekStart,
  onSelectDate,
}) => {
  // Calendar month state
  const [currentYear, setCurrentYear] = useState<number>(() => {
    const [y] = selectedDate.split('-').map(Number);
    return y || new Date().getFullYear();
  });
  const [currentMonth, setCurrentMonth] = useState<number>(() => {
    const [, m] = selectedDate.split('-').map(Number);
    return (m != null ? m - 1 : new Date().getMonth());
  });

  const todayStr = getLocalDateString();

  const handlePrevMonth = () => {
    if (Platform.OS !== 'web') triggerLightHaptic();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (Platform.OS !== 'web') triggerLightHaptic();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (dateStr: string, isDisabled: boolean) => {
    if (isDisabled) return;
    if (Platform.OS !== 'web') triggerLightHaptic();
    onSelectDate(dateStr);
    onClose();
  };

  // Month title: e.g. "October 2026"
  const monthDate = new Date(currentYear, currentMonth, 1);
  const monthTitle = monthDate.toLocaleDateString([], {
    month: 'long',
    year: 'numeric',
  });

  // Day header labels based on weekStart
  const dayLabels =
    weekStart === 'sunday'
      ? ['S', 'M', 'T', 'W', 'T', 'F', 'S']
      : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Calculate calendar grid
  // First day of month day-of-week (0 is Sunday, 1 is Monday...)
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  // Adjust starting offset based on weekStart
  // If weekStart is monday, Sunday (0) becomes 6, Monday (1) becomes 0
  const startOffset =
    weekStart === 'sunday'
      ? firstDayOfWeek
      : (firstDayOfWeek + 6) % 7;

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Generate grid slots
  const gridCells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) {
    gridCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    gridCells.push(d);
  }
  // Fill remaining slots to complete rows of 7
  while (gridCells.length % 7 !== 0) {
    gridCells.push(null);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {/* Header Row: Month title & Nav */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={handlePrevMonth}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
            >
              <Text style={styles.navArrow}>‹</Text>
            </TouchableOpacity>

            <Text style={styles.monthTitle}>{monthTitle}</Text>

            <TouchableOpacity
              style={styles.navButton}
              onPress={handleNextMonth}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Next month"
            >
              <Text style={styles.navArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Days of Week Header */}
          <View style={styles.weekdayRow}>
            {dayLabels.map((lbl, idx) => (
              <View key={`lbl-${idx}`} style={styles.weekdayCell}>
                <Text style={styles.weekdayText}>{lbl}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.gridContainer}>
            {gridCells.map((dayNum, idx) => {
              if (dayNum === null) {
                return <View key={`empty-${idx}`} style={styles.dayCell} />;
              }

              const monthStr = String(currentMonth + 1).padStart(2, '0');
              const dayStr = String(dayNum).padStart(2, '0');
              const dateStr = `${currentYear}-${monthStr}-${dayStr}`;

              // Days before install date are disabled; days in future are disabled
              const isBeforeInstall = dateStr < installDate;
              const isFuture = dateStr > todayStr;
              const isDisabled = isBeforeInstall || isFuture;

              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayStr;

              const proteinLogged = dailyTotalsMap[dateStr] || 0;
              const isHitGoal = dailyGoalGrams > 0 && proteinLogged >= dailyGoalGrams;

              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isToday && !isSelected && styles.dayCellToday,
                    isDisabled && styles.dayCellDisabled,
                  ]}
                  onPress={() => handleSelectDay(dateStr, isDisabled)}
                  disabled={isDisabled}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${dateStr}, ${Math.round(proteinLogged)}g logged, ${
                    isHitGoal ? 'Goal reached' : ''
                  }`}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                      isToday && styles.dayTextToday,
                      isDisabled && styles.dayTextDisabled,
                    ]}
                  >
                    {dayNum}
                  </Text>

                  {/* Orange Dot for Goal Hit */}
                  <View style={styles.dotContainer}>
                    {isHitGoal && !isDisabled ? (
                      <View style={styles.goalOrangeDot} />
                    ) : proteinLogged > 0 && !isDisabled ? (
                      <View style={styles.partialDot} />
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend and Close */}
          <View style={styles.footerRow}>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={styles.goalOrangeDot} />
                <Text style={styles.legendText}>Goal reached</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Close calendar"
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 35, 61, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  monthTitle: {
    ...theme.typography.subtitle,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.secondarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: -2,
  },
  weekdayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 6,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.full,
    paddingVertical: 4,
    marginVertical: 1,
  },
  dayCellSelected: {
    backgroundColor: theme.colors.secondarySurface,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  dayCellDisabled: {
    opacity: 0.25,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  dayTextSelected: {
    fontWeight: '900',
    color: theme.colors.primary,
  },
  dayTextToday: {
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  dayTextDisabled: {
    color: theme.colors.disabledText,
  },
  dotContainer: {
    height: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  goalOrangeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary, // Orange dot when goal hit!
  },
  partialDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.gold,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.full,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

export default MonthCalendarModal;
