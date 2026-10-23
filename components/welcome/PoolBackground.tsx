import React, { useEffect } from 'react';
import { View, StyleSheet, Text, useWindowDimensions } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Path,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';

/**
 * Generate subtle wavy grout grid lines looking through creamy liquid.
 */
function generateWavyGridPaths(width: number, height: number, step: number = 64): string {
  'worklet';
  let d = '';

  // Horizontal lines with gentle liquid sine curves
  const numHoriz = Math.ceil(height / step) + 1;
  for (let i = 0; i <= numHoriz; i++) {
    const y = i * step;
    d += ` M 0 ${y}`;
    const segments = Math.ceil(width / 40);
    for (let j = 0; j < segments; j++) {
      const x1 = j * 40 + 20;
      const y1 = y + ((j % 2 === 0 ? 1 : -1) * 2.5);
      const x2 = (j + 1) * 40;
      const y2 = y;
      d += ` Q ${x1} ${y1}, ${x2} ${y2}`;
    }
  }

  // Vertical lines with gentle liquid sine curves
  const numVert = Math.ceil(width / step) + 1;
  for (let i = 0; i <= numVert; i++) {
    const x = i * step;
    d += ` M ${x} 0`;
    const segments = Math.ceil(height / 40);
    for (let j = 0; j < segments; j++) {
      const y1 = j * 40 + 20;
      const x1 = x + ((j % 2 === 0 ? 1 : -1) * 2.5);
      const y2 = (j + 1) * 40;
      const x2 = x;
      d += ` Q ${x1} ${y1}, ${x2} ${y2}`;
    }
  }

  return d;
}

interface PoolBackgroundProps {
  width?: number;
  height?: number;
}

export const PoolBackground: React.FC<PoolBackgroundProps> = ({
  width: customWidth,
  height: customHeight,
}) => {
  const windowDims = useWindowDimensions();
  const width = customWidth ?? Math.min(windowDims.width, 480);
  const height = customHeight ?? windowDims.height;
  const isReducedMotion = useReducedMotion();

  // Subtle wobble for the "PROTIE" water mark
  const textRotation = useSharedValue(0);
  const textScale = useSharedValue(1);

  // Soft light streaks drifting slowly
  const lightStreakX = useSharedValue(-60);

  // Water refraction wobble for tile lines
  const gridWobble = useSharedValue(0);

  useEffect(() => {
    if (isReducedMotion) return;

    textRotation.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
        withTiming(-1.4, { duration: 2200, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    textScale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.985, { duration: 2600, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    lightStreakX.value = withRepeat(
      withSequence(
        withTiming(60, { duration: 5500, easing: Easing.inOut(Easing.sin) }),
        withTiming(-60, { duration: 5500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    gridWobble.value = withRepeat(
      withSequence(
        withTiming(2, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
        withTiming(-2, { duration: 3200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [isReducedMotion, textRotation, textScale, lightStreakX, gridWobble]);

  const animatedTextStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { rotate: `${textRotation.value}deg` },
        { scale: textScale.value },
      ],
    };
  });

  const animatedLightStreakStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateX: lightStreakX.value },
        { translateY: lightStreakX.value * 0.4 },
        { rotate: '-24deg' },
      ],
    };
  });

  const animatedGridStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateX: gridWobble.value },
        { translateY: gridWobble.value * 0.6 },
      ],
    };
  });

  const gridPathD = React.useMemo(() => generateWavyGridPaths(width, height, 68), [width, height]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* BASE POOL: Creamy chocolate protein shake gradient */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="poolShakeGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#6B4A3A" />
            <Stop offset="100%" stopColor="#4E3328" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#poolShakeGrad)" />
      </Svg>

      {/* CREAM TILE GROUT LINES: Grid with subtle liquid wobble */}
      <Animated.View style={[StyleSheet.absoluteFill, animatedGridStyle]}>
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Path
            d={gridPathD}
            fill="none"
            stroke="#F5E6D0"
            strokeWidth={1.8}
            strokeOpacity={0.25} // 25% opacity
          />
        </Svg>
      </Animated.View>

      {/* SOFT LIGHT STREAKS: Drifting caustics ribbons across pool */}
      <Animated.View style={[styles.lightStreakContainer, animatedLightStreakStyle]}>
        <Svg width={width * 1.8} height={height * 1.5} viewBox={`0 0 ${width * 1.8} ${height * 1.5}`}>
          <Defs>
            <LinearGradient id="streakGrad1" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#FFF9F0" stopOpacity="0" />
              <Stop offset="50%" stopColor="#FFF5E6" stopOpacity="0.14" />
              <Stop offset="100%" stopColor="#FFF9F0" stopOpacity="0" />
            </LinearGradient>
            <LinearGradient id="streakGrad2" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#FFF9F0" stopOpacity="0" />
              <Stop offset="50%" stopColor="#FFF5E6" stopOpacity="0.10" />
              <Stop offset="100%" stopColor="#FFF9F0" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect x={width * 0.2} y={0} width={130} height={height * 1.5} fill="url(#streakGrad1)" />
          <Rect x={width * 0.8} y={0} width={90} height={height * 1.5} fill="url(#streakGrad2)" />
        </Svg>
      </Animated.View>

      {/* "PROTIE" PAINTED IN THE LIQUID AT CENTER */}
      <View style={styles.centerTextWrapper}>
        <Animated.View style={animatedTextStyle}>
          <Text style={styles.paintedLogo}>PROTIE</Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  lightStreakContainer: {
    position: 'absolute',
    top: -120,
    left: -120,
    right: -120,
    bottom: -120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTextWrapper: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paintedLogo: {
    color: '#F5E6D0',
    opacity: 0.35, // 35% opacity
    fontSize: 62,
    fontWeight: '900',
    letterSpacing: 8,
    textAlign: 'center',
  },
});

export default PoolBackground;
