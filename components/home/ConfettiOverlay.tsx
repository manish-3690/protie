import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface Particle {
  id: number;
  x: number; // initial horizontal offset in px
  size: number;
  color: string;
  rotation: number;
  delay: number;
  drift: number;
}

const CONFETTI_COLORS = [
  '#D97935', // Protie primary orange
  '#F2BB4B', // Protie gold
  '#FFE7BD', // Cream
  '#17233D', // Dark navy
  '#48BB78', // Energy green
  '#E27D60', // Terracotta
];

const PARTICLES: Particle[] = Array.from({ length: 30 }).map((_, index) => {
  const seed1 = ((index * 7 + 13) % 31) / 31;
  const seed2 = ((index * 11 + 5) % 29) / 29;
  return {
    id: index,
    x: (seed1 - 0.5) * 280,
    size: Math.floor(seed2 * 6) + 6,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    rotation: Math.floor(seed1 * 360),
    delay: Math.floor(seed2 * 180),
    drift: (seed2 - 0.5) * 90,
  };
});

export const ConfettiOverlay: React.FC = () => {
  return (
    <View style={styles.container} pointerEvents="none">
      {PARTICLES.map((p) => (
        <ConfettiPiece key={p.id} particle={p} />
      ))}
    </View>
  );
};

const ConfettiPiece: React.FC<{ particle: Particle }> = ({ particle }: { particle: Particle }) => {
  const fallProgress = useSharedValue(0);

  useEffect(() => {
    fallProgress.value = withTiming(1, {
      duration: 1600,
      easing: Easing.out(Easing.quad),
    });
  }, [fallProgress]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = fallProgress.value * 320 - 40;
    const translateX = particle.x + fallProgress.value * particle.drift;
    const rotate = `${particle.rotation + fallProgress.value * 360}deg`;
    const opacity = fallProgress.value > 0.8 ? (1 - fallProgress.value) / 0.2 : 1;

    return {
      transform: [{ translateX }, { translateY }, { rotate }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: particle.size,
          height: particle.size * (particle.id % 2 === 0 ? 1.6 : 1),
          backgroundColor: particle.color,
          borderRadius: particle.id % 3 === 0 ? 999 : 2,
        },
        animatedStyle,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 999,
  },
  particle: {
    position: 'absolute',
    top: 0,
  },
});

export default ConfettiOverlay;
