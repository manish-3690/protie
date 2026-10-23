import React, { useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

export interface RippleData {
  id: number;
  x: number;
  y: number;
  maxRadius: number;
  intensity: number; // 0 to 1 based on velocity
}

interface RipplesLayerProps {
  ripples: RippleData[];
  onRippleComplete: (id: number) => void;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * Generate a slightly wobbly water ring path centered at (cx, cy) with radius r.
 * Defined at module level with 'worklet' directive.
 */
function generateWobblyRing(cx: number, cy: number, r: number, seed: number = 0): string {
  'worklet';
  const numSteps = 16;
  const aspectY = 0.88; // subtle perspective angle
  let d = '';

  for (let i = 0; i <= numSteps; i++) {
    const angle = (i / numSteps) * 6.283185307179586; // Math.PI * 2
    // Add 2-3px wobble
    const wobble = Math.sin(angle * 3 + seed) * (r * 0.05);
    const rad = r + wobble;
    const px = (cx + Math.cos(angle) * rad).toFixed(1);
    const py = (cy + Math.sin(angle) * rad * aspectY).toFixed(1);
    if (i === 0) {
      d += `M ${px} ${py}`;
    } else {
      d += ` L ${px} ${py}`;
    }
  }
  d += ' Z';
  return d;
}

const SingleRipple: React.FC<{
  id: number;
  x: number;
  y: number;
  maxRadius: number;
  intensity: number;
  onComplete: (id: number) => void;
}> = ({ id, x, y, maxRadius, intensity, onComplete }) => {
  const progress = useSharedValue(0);
  const rippleX = useSharedValue(x);
  const rippleY = useSharedValue(y);
  const rippleMaxRadius = useSharedValue(maxRadius);
  const rippleIntensity = useSharedValue(intensity);
  const rippleId = useSharedValue(id);

  useEffect(() => {
    progress.value = withTiming(
      1,
      {
        duration: 1050,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        'worklet';
        if (finished) {
          runOnJS(onComplete)(id);
        }
      }
    );
  }, [progress, id, onComplete]);

  const animatedProps = useAnimatedProps(() => {
    'worklet';
    const p = progress.value;
    const currentRadius = 18 + p * (rippleMaxRadius.value - 18);
    const currentOpacity = Math.max(0, (1 - p) * Math.min(0.65, rippleIntensity.value * 0.75));
    const strokeW = Math.max(0.8, (1 - p) * 2.2);
    const d = generateWobblyRing(rippleX.value, rippleY.value, currentRadius, rippleId.value);

    return {
      d,
      strokeOpacity: currentOpacity,
      strokeWidth: strokeW,
    };
  });

  return (
    <AnimatedPath
      animatedProps={animatedProps}
      fill="none"
      stroke="#F5E6D0" // Thin bright cream edge
      strokeLinecap="round"
    />
  );
};

export const RipplesLayer: React.FC<RipplesLayerProps> = ({ ripples, onRippleComplete }) => {
  const { width, height } = useWindowDimensions();

  if (ripples.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        {ripples.map((r) => (
          <SingleRipple
            key={r.id}
            id={r.id}
            x={r.x}
            y={r.y}
            maxRadius={r.maxRadius}
            intensity={r.intensity}
            onComplete={onRippleComplete}
          />
        ))}
      </Svg>
    </View>
  );
};

export default RipplesLayer;
