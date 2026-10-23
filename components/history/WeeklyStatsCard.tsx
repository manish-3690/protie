import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  useWindowDimensions,
} from 'react-native';
import Svg, {
  Rect,
  Line,
  Text as SvgText,
  G,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { theme } from '@/constants/theme';
import { formatProteinAmount, ProteinUnit } from '@/store/onboardingStorage';
import { DayProgress } from './WeekStrip';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export interface WeeklyStatsCardProps {
  days: DayProgress[];
  dailyGoalGrams: number;
  proteinUnit: ProteinUnit;
  onSelectDay?: (dateStr: string) => void;
  selectedDate?: string;
}

interface AnimatedBarProps {
  x: number;
  width: number;
  bottomY: number;
  targetHeight: number;
  color: string;
  progress: SharedValue<number>;
}

const AnimatedBar: React.FC<AnimatedBarProps> = ({
  x,
  width,
  bottomY,
  targetHeight,
  color,
  progress,
}) => {
  const animatedProps = useAnimatedProps(() => {
    'worklet';
    const h = Math.max(3, targetHeight * progress.value);
    const y = bottomY - h;
    return {
      y,
      height: h,
    };
  });

  return (
    <AnimatedRect
      x={x}
      width={width}
      rx={width / 2}
      fill={color}
      animatedProps={animatedProps}
    />
  );
};

export const WeeklyStatsCard: React.FC<WeeklyStatsCardProps> = ({
  days,
  dailyGoalGrams,
  proteinUnit,
  onSelectDay,
  selectedDate,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const animationProgress = useSharedValue(0);

  useEffect(() => {
    animationProgress.value = 0;
    animationProgress.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.ease),
    });
  }, [days, animationProgress]);

  // Calculations: average protein per day & goal-hit days
  // Only count days that have occurred (not future / disabled days)
  const activeDays = days.filter((d) => !d.isDisabled);
  const totalGrams = activeDays.reduce((acc, d) => acc + d.proteinGrams, 0);
  const avgGrams = activeDays.length > 0 ? Math.round(totalGrams / activeDays.length) : 0;
  const goalHitCount = days.filter((d) => d.isHitGoal).length;

  // Chart layout dimensions
  const containerWidth = Math.min(windowWidth - 32, 448);
  const chartHeight = 135;
  const bottomAxisY = 110;
  const availableChartHeight = 90;

  // Max scale includes goal and highest logged day with breathing room
  const maxLogged = Math.max(...days.map((d) => d.proteinGrams), 0);
  const maxScale = Math.max(dailyGoalGrams * 1.25, maxLogged * 1.15, 60);

  // Goal line Y position
  const goalRatio = dailyGoalGrams / maxScale;
  const goalLineY = Math.round(bottomAxisY - goalRatio * availableChartHeight);

  // Bar width and distribution
  const barWidth = 18;
  const usableWidth = containerWidth - 56;
  const stepX = usableWidth / 7;

  return (
    <View style={styles.card}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>This Week</Text>
        <View style={styles.goalHitBadge}>
          <Text style={styles.goalHitBadgeText}>
            🏆 {goalHitCount} of 7 days hit
          </Text>
        </View>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricBlock}>
          <Text style={styles.metricLabel}>Daily Average</Text>
          <Text style={styles.metricValue}>
            {formatProteinAmount(avgGrams, proteinUnit)}
            <Text style={styles.metricUnit}> / day</Text>
          </Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricBlock}>
          <Text style={styles.metricLabel}>Goal Hit Rate</Text>
          <Text style={styles.metricValue}>
            {Math.round((goalHitCount / 7) * 100)}%
          </Text>
        </View>
      </View>

      {/* SVG Bar Chart */}
      <View style={styles.chartWrapper}>
        <Svg width={containerWidth - 32} height={chartHeight}>
          {/* Goal Line */}
          <Line
            x1={10}
            y1={goalLineY}
            x2={containerWidth - 75}
            y2={goalLineY}
            stroke={theme.colors.primary}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            opacity={0.65}
          />
          <SvgText
            x={containerWidth - 70}
            y={goalLineY + 3.5}
            fill={theme.colors.primary}
            fontSize={10}
            fontWeight="bold"
          >
            Goal
          </SvgText>

          {/* 7 Animated Bars */}
          <G>
            {days.map((day, idx) => {
              const barX = 14 + idx * stepX + (stepX - barWidth) / 2;
              const ratio = Math.min(1.2, day.proteinGrams / maxScale);
              const targetHeight = Math.max(3, ratio * availableChartHeight);

              let barColor: string = theme.colors.border;
              if (day.proteinGrams > 0) {
                if (day.isHitGoal) {
                  barColor = theme.colors.primary;
                } else {
                  barColor = theme.colors.gold;
                }
              }

              return (
                <AnimatedBar
                  key={day.dateStr}
                  x={barX}
                  width={barWidth}
                  bottomY={bottomAxisY}
                  targetHeight={targetHeight}
                  color={barColor}
                  progress={animationProgress}
                />
              );
            })}
          </G>

          {/* Bottom Day Labels */}
          {days.map((day, idx) => {
            const labelX = 14 + idx * stepX + stepX / 2;
            const isSelected = day.dateStr === selectedDate;

            return (
              <SvgText
                key={`label-${day.dateStr}`}
                x={labelX}
                y={bottomAxisY + 16}
                fill={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                fontSize={11}
                fontWeight={isSelected ? 'bold' : '600'}
                textAnchor="middle"
              >
                {day.dayLabel}
              </SvgText>
            );
          })}
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
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
    marginVertical: theme.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  title: {
    ...theme.typography.subtitle,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  goalHitBadge: {
    backgroundColor: theme.colors.secondarySurface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  goalHitBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.lg,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  metricBlock: {
    alignItems: 'center',
    flex: 1,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: theme.colors.border,
  },
  metricLabel: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.textPrimary,
  },
  metricUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
});

export default WeeklyStatsCard;
