import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  LayoutChangeEvent,
  GestureResponderEvent,
  Platform,
} from 'react-native';
import { theme } from '@/constants/theme';
import { triggerLightHaptic } from '@/components/utils/haptics';

export interface DraggableAmountSelectorProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  activeColor?: string;
  unitLabel?: string;
  onValueChange: (val: number) => void;
}

export const DraggableAmountSelector: React.FC<DraggableAmountSelectorProps> = ({
  value,
  min,
  max,
  step = 0.5,
  activeColor = theme.colors.primary,
  unitLabel = 'servings',
  onValueChange,
}) => {
  const [trackWidth, setTrackWidth] = useState<number>(260);

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0) {
      setTrackWidth(width);
    }
  };

  const calculateValueFromPosition = useCallback(
    (x: number) => {
      const effectiveWidth = Math.max(1, trackWidth);
      const clampedX = Math.max(0, Math.min(effectiveWidth, x));
      const ratio = clampedX / effectiveWidth;
      const rawVal = min + ratio * (max - min);
      // Round to nearest step
      const steppedVal = Math.round(rawVal / step) * step;
      const clampedVal = Math.max(min, Math.min(max, steppedVal));
      const rounded = Math.round(clampedVal * 10) / 10;

      if (rounded !== value) {
        triggerLightHaptic();
      }
      return rounded;
    },
    [trackWidth, min, max, step, value]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt: GestureResponderEvent) => {
          const x = evt.nativeEvent.locationX;
          const newVal = calculateValueFromPosition(x);
          onValueChange(newVal);
        },
        onPanResponderMove: (evt: GestureResponderEvent) => {
          const x = evt.nativeEvent.locationX;
          const newVal = calculateValueFromPosition(x);
          onValueChange(newVal);
        },
        onPanResponderRelease: (evt: GestureResponderEvent) => {
          const x = evt.nativeEvent.locationX;
          const newVal = calculateValueFromPosition(x);
          onValueChange(newVal);
        },
      }),
    [calculateValueFromPosition, onValueChange]
  );

  // Percentage along the track
  const percentage = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.dragHint}>Drag to adjust amount</Text>
        <Text style={[styles.currentValueText, { color: activeColor }]}>
          {value} {unitLabel}
        </Text>
      </View>

      <View
        onLayout={handleLayout}
        style={styles.trackContainer}
        {...panResponder.panHandlers}
        accessibilityRole="adjustable"
        accessibilityLabel={`Adjust ${unitLabel}, current value ${value}`}
        accessibilityValue={{ min, max, now: value }}
      >
        {/* Background track */}
        <View style={styles.trackBackground} />

        {/* Filled active track */}
        <View
          style={[
            styles.trackActive,
            {
              width: `${percentage * 100}%`,
              backgroundColor: activeColor,
            },
          ]}
        />

        {/* Draggable thumb handle */}
        <View
          style={[
            styles.thumb,
            {
              left: Math.max(0, Math.min(trackWidth - 28, percentage * trackWidth - 14)),
              borderColor: activeColor,
            },
          ]}
        >
          <View style={[styles.thumbInner, { backgroundColor: activeColor }]} />
        </View>
      </View>

      {/* Range ticks */}
      <View style={styles.ticksRow}>
        <Text style={styles.tickText}>{min}</Text>
        <Text style={styles.tickText}>
          {Math.round(((min + max) / 2) * 10) / 10}
        </Text>
        <Text style={styles.tickText}>{max}+</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: theme.spacing.sm,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dragHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  currentValueText: {
    ...theme.typography.caption,
    fontWeight: '800',
  },
  trackContainer: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  trackBackground: {
    height: 10,
    borderRadius: theme.radii.full,
    backgroundColor: '#EBE2D5',
    width: '100%',
  },
  trackActive: {
    position: 'absolute',
    left: 0,
    height: 10,
    borderRadius: theme.radii.full,
  },
  thumb: {
    position: 'absolute',
    top: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3.5,
    elevation: 3,
  },
  thumbInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ticksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
    paddingHorizontal: 2,
  },
  tickText: {
    fontSize: 11,
    color: theme.colors.disabledText,
    fontWeight: '600',
  },
});
