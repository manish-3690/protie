/* eslint-disable react-hooks/immutability */
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  GestureResponderEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedSensor,
  useFrameCallback,
  SensorType,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
  useReducedMotion,
} from 'react-native-reanimated';
import { PoolBackground } from '@/components/welcome/PoolBackground';
import { TankFloat } from '@/components/welcome/TankFloat';
import { RipplesLayer, RippleData } from '@/components/welcome/RipplesLayer';
import { triggerLightHaptic } from '@/components/utils/haptics';

const FLOAT_SIZE = 136;
const FLOAT_RADIUS = FLOAT_SIZE / 2;
const MAX_SPEED = 9.0;
const ACCEL = 0.44;
const DRAG = 0.942; // Water resistance drag

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: rawWidth, height: windowHeight } = useWindowDimensions();
  const screenWidth = Math.min(rawWidth, 480);
  const isReducedMotion = useReducedMotion();

  // Button boundaries
  const buttonHeight = 56;
  const buttonMarginBottom = Math.max(20, insets.bottom + 8);
  const buttonTopY = windowHeight - buttonHeight - buttonMarginBottom;

  // Active play boundaries
  const minX = FLOAT_RADIUS + 10;
  const maxX = screenWidth - FLOAT_RADIUS - 10;
  const minY = Math.max(insets.top + 16, 36) + FLOAT_RADIUS;
  const maxY = buttonTopY - FLOAT_RADIUS - 16;

  // Mascot position & velocity
  const posX = useSharedValue(screenWidth / 2);
  const posY = useSharedValue(windowHeight * 0.44);
  const vx = useSharedValue(0);
  const vy = useSharedValue(0);

  // Leaning in direction of travel (up to 30 degrees)
  const leanAngle = useSharedValue(0);

  // Squash & stretch on hard wall hits (about 5% against wall)
  const squashScaleX = useSharedValue(1);
  const squashScaleY = useSharedValue(1);

  // Sensor reading & level calibration
  const rotationSensor = useAnimatedSensor(SensorType.ROTATION, {
    interval: 16,
  });
  const initialPitch = useSharedValue(0);
  const initialRoll = useSharedValue(0);
  const calibrated = useSharedValue(0);
  const calibrationFrames = useSharedValue(0);

  // Web & desktop testing: press and hold drifts him toward pointer
  const isPointerDown = useSharedValue(false);
  const pointerX = useSharedValue(screenWidth / 2);
  const pointerY = useSharedValue(windowHeight * 0.44);

  // Ripple spawning tracker
  const distanceSinceRipple = useSharedValue(0);
  const rippleCounter = useRef(0);
  const [ripples, setRipples] = useState<RippleData[]>([]);

  const handleAddRipple = useCallback((x: number, y: number, intensity: number) => {
    if (isReducedMotion) return;
    rippleCounter.current += 1;
    const newRipple: RippleData = {
      id: rippleCounter.current,
      x,
      y,
      maxRadius: 28 + intensity * 45,
      intensity,
    };
    setRipples((prev) => [...prev.slice(-7), newRipple]);
  }, [isReducedMotion]);

  const handleRippleComplete = useCallback((id: number) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleBounceHaptic = useCallback(() => {
    triggerLightHaptic();
  }, []);

  // 60FPS UI Physics Worklet Loop
  useFrameCallback(() => {
    'worklet';
    const rot = rotationSensor.sensor.value;
    const rawPitch = rot.pitch;
    const rawRoll = rot.roll;
    const pitchDeg = (rawPitch * 180) / Math.PI;
    const rollDeg = (rawRoll * 180) / Math.PI;

    // 1. Initial "Level" Calibration: how the phone is held when screen opens
    if (calibrated.value === 0) {
      if (Math.abs(pitchDeg) > 0.001 || Math.abs(rollDeg) > 0.001) {
        calibrationFrames.value += 1;
        if (calibrationFrames.value >= 4) {
          initialPitch.value = pitchDeg;
          initialRoll.value = rollDeg;
          calibrated.value = 1;
        }
      }
    }

    // 2. Compute tilt relative to level
    let forceX = 0;
    let forceY = 0;

    if (calibrated.value === 1) {
      const deltaRoll = rollDeg - initialRoll.value;
      const deltaPitch = pitchDeg - initialPitch.value;

      // Ignore wobble under 3 degrees, then ease in
      const absRoll = Math.abs(deltaRoll);
      if (absRoll >= 3) {
        const excess = absRoll - 3;
        const norm = Math.min(1, excess / 24);
        forceX = (deltaRoll > 0 ? 1 : -1) * (norm * norm);
      }

      const absPitch = Math.abs(deltaPitch);
      if (absPitch >= 3) {
        const excess = absPitch - 3;
        const norm = Math.min(1, excess / 24);
        forceY = (deltaPitch > 0 ? 1 : -1) * (norm * norm);
      }
    }

    // 3. Accelerate from tilt or pointer drift
    if (isPointerDown.value) {
      const dx = pointerX.value - posX.value;
      const dy = pointerY.value - posY.value;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 12) {
        const pullFactor = Math.min(1, dist / 120);
        vx.value += (dx / dist) * pullFactor * ACCEL * 1.6;
        vy.value += (dy / dist) * pullFactor * ACCEL * 1.6;
      }
    } else {
      vx.value += forceX * ACCEL;
      vy.value += forceY * ACCEL;
    }

    // 4. Water drag: speeds up smoothly and coasts to a stop
    vx.value *= DRAG;
    vy.value *= DRAG;

    // Stop micro-jitter when level
    if (Math.abs(vx.value) < 0.02 && forceX === 0 && !isPointerDown.value) {
      vx.value = 0;
    }
    if (Math.abs(vy.value) < 0.02 && forceY === 0 && !isPointerDown.value) {
      vy.value = 0;
    }

    // Speed clamp
    const speed = Math.sqrt(vx.value * vx.value + vy.value * vy.value);
    if (speed > MAX_SPEED) {
      vx.value = (vx.value / speed) * MAX_SPEED;
      vy.value = (vy.value / speed) * MAX_SPEED;
    }

    // 5. Update Position
    posX.value += vx.value;
    posY.value += vy.value;

    // 6. Soft bounce off all four edges + hard hit 5% squash
    let hit = false;
    let hitSpeed = 0;
    let hitAxisX = false;

    if (posX.value < minX) {
      posX.value = minX;
      hitSpeed = Math.abs(vx.value);
      vx.value = -vx.value * 0.45;
      hit = true;
      hitAxisX = true;
    } else if (posX.value > maxX) {
      posX.value = maxX;
      hitSpeed = Math.abs(vx.value);
      vx.value = -vx.value * 0.45;
      hit = true;
      hitAxisX = true;
    }

    if (posY.value < minY) {
      posY.value = minY;
      hitSpeed = Math.max(hitSpeed, Math.abs(vy.value));
      vy.value = -vy.value * 0.45;
      hit = true;
      hitAxisX = false;
    } else if (posY.value > maxY) {
      posY.value = maxY;
      hitSpeed = Math.max(hitSpeed, Math.abs(vy.value));
      vy.value = -vy.value * 0.45;
      hit = true;
      hitAxisX = false;
    }

    if (hit) {
      runOnJS(handleBounceHaptic)();

      // On a hard hit, squash about 5% against the wall and let him settle
      if (hitSpeed > 2.2) {
        if (hitAxisX) {
          squashScaleX.value = withSequence(
            withTiming(0.95, { duration: 55 }),
            withSpring(1, { damping: 9, stiffness: 200 })
          );
          squashScaleY.value = withSequence(
            withTiming(1.03, { duration: 55 }),
            withSpring(1, { damping: 9, stiffness: 200 })
          );
        } else {
          squashScaleY.value = withSequence(
            withTiming(0.95, { duration: 55 }),
            withSpring(1, { damping: 9, stiffness: 200 })
          );
          squashScaleX.value = withSequence(
            withTiming(1.03, { duration: 55 }),
            withSpring(1, { damping: 9, stiffness: 200 })
          );
        }
      }
    }

    // 7. Lean up to 30 degrees in the direction of travel (like a boat turning)
    const targetLean = Math.max(-30, Math.min(30, (vx.value / MAX_SPEED) * 30));
    leanAngle.value += (targetLean - leanAngle.value) * 0.16;

    // 8. Ripples dropped just behind him while moving
    if (speed > 0.7) {
      distanceSinceRipple.value += speed;
      if (distanceSinceRipple.value >= 22) {
        distanceSinceRipple.value = 0;
        const dropX = posX.value - (vx.value / speed) * 22;
        const dropY = posY.value - (vy.value / speed) * 22;
        const intensity = Math.min(1.0, speed / MAX_SPEED);
        runOnJS(handleAddRipple)(dropX, dropY, intensity);
      }
    }
  });

  // Animated transform for TankFloat
  const tankAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateX: posX.value - FLOAT_RADIUS },
        { translateY: posY.value - FLOAT_RADIUS },
        { rotate: `${leanAngle.value}deg` },
        { scaleX: squashScaleX.value },
        { scaleY: squashScaleY.value },
      ],
    };
  });

  // Pointer event handlers for web/desktop press-and-hold testing
  const handleResponderGrant = (evt: GestureResponderEvent) => {
    isPointerDown.value = true;
    pointerX.value = evt.nativeEvent.locationX;
    pointerY.value = evt.nativeEvent.locationY;
  };

  const handleResponderMove = (evt: GestureResponderEvent) => {
    pointerX.value = evt.nativeEvent.locationX;
    pointerY.value = evt.nativeEvent.locationY;
  };

  const handleResponderEnd = () => {
    isPointerDown.value = false;
  };

  const handleGetStarted = () => {
    router.push('/onboarding');
  };

  return (
    <View
      style={styles.container}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handleResponderGrant}
      onResponderMove={handleResponderMove}
      onResponderRelease={handleResponderEnd}
      onResponderTerminate={handleResponderEnd}
    >
      {/* 1. TOP-DOWN POOL SCENE: Shake gradient, wobbling tiles, drifting light, submerged logo */}
      <PoolBackground width={screenWidth} height={windowHeight} />

      {/* 2. RIPPLES LAYER: Expanding rings dropped behind Tank */}
      <RipplesLayer ripples={ripples} onRippleComplete={handleRippleComplete} />

      {/* 3. TANK FLOATING ON LIQUID WITH TILT PHYSICS */}
      <Animated.View style={[styles.mascotAnchor, tankAnimatedStyle]} pointerEvents="none">
        <TankFloat size={FLOAT_SIZE} />
      </Animated.View>

      {/* 4. ONE "GET STARTED" BUTTON AT BOTTOM: White, rounded, full width */}
      <View style={[styles.bottomBar, { paddingBottom: buttonMarginBottom }]}>
        <TouchableOpacity
          testID="welcome-get-started-button"
          style={styles.getStartedButton}
          activeOpacity={0.88}
          onPress={handleGetStarted}
          accessibilityRole="button"
          accessibilityLabel="Get Started"
        >
          <Text style={styles.getStartedText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6B4A3A',
    position: 'relative',
    overflow: 'hidden',
  },
  mascotAnchor: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: FLOAT_SIZE,
    height: FLOAT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  getStartedButton: {
    backgroundColor: '#FFFFFF',
    height: 56,
    borderRadius: 9999, // fully rounded
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1F0F07',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.36,
    shadowRadius: 12,
    elevation: 8,
  },
  getStartedText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4E3328', // Deep creamy chocolate text
    letterSpacing: 0.5,
  },
});
