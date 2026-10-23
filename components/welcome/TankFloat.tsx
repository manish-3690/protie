import React from 'react';
import { View, StyleSheet, Image, StyleProp, ViewStyle } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Path,
  Ellipse,
} from 'react-native-svg';

interface TankFloatProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
  leanAngleDeg?: number;
  squashScaleX?: number;
  squashScaleY?: number;
}

/**
 * Tank Float Mascot:
 * Tank's upper body sitting inside an orange inflatable ring with cream highlights
 * and a thin cream foam line where the float meets the liquid.
 * Down-and-right soft liquid shadow underneath.
 */
export const TankFloat: React.FC<TankFloatProps> = ({
  size = 140,
  style,
}) => {
  // Float ring viewBox is 140x140
  const scale = size / 140;

  return (
    <View style={[styles.container, { width: size, height: size }, style]} pointerEvents="none">
      {/* 1. SOFT SHADOW: Down and right in the liquid */}
      <View style={[styles.shadowWrap, { transform: [{ scale }] }]}>
        <Svg width={160} height={160} viewBox="0 0 160 160">
          <Defs>
            <RadialGradient id="tankShadowGrad" cx="50%" cy="50%" rx="50%" ry="45%">
              <Stop offset="0%" stopColor="#1E0E06" stopOpacity="0.55" />
              <Stop offset="65%" stopColor="#28140B" stopOpacity="0.30" />
              <Stop offset="100%" stopColor="#3A1C0E" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx={92} cy={98} rx={62} ry={48} fill="url(#tankShadowGrad)" />
        </Svg>
      </View>

      {/* 2. BASE FLOAT RING & FOAM LINE */}
      <View style={[styles.svgWrap, { width: size, height: size }]}>
        <Svg width={size} height={size} viewBox="0 0 140 140">
          <Defs>
            {/* Orange Inflatable Ring Gradient */}
            <LinearGradient id="ringGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#E47B2E" />
              <Stop offset="50%" stopColor="#D97022" />
              <Stop offset="100%" stopColor="#B35212" />
            </LinearGradient>

            {/* Inner Tube Depth */}
            <RadialGradient id="innerDepth" cx="50%" cy="45%" r="50%">
              <Stop offset="70%" stopColor="#3F251A" stopOpacity="0.85" />
              <Stop offset="100%" stopColor="#553424" stopOpacity="0.4" />
            </RadialGradient>
          </Defs>

          {/* Outer Foam Ring where float meets the chocolate shake */}
          <Ellipse
            cx={70}
            cy={71}
            rx={63}
            ry={60}
            fill="none"
            stroke="#F5E6D0"
            strokeWidth={2.4}
            strokeOpacity={0.65}
            strokeDasharray="18, 5"
          />

          {/* Back Outer Ring */}
          <Ellipse
            cx={70}
            cy={70}
            rx={60}
            ry={57}
            fill="url(#ringGrad)"
          />

          {/* Inner Well Hole (shake liquid visible inside donut) */}
          <Ellipse
            cx={70}
            cy={70}
            rx={32}
            ry={30}
            fill="url(#innerDepth)"
          />

          {/* Back Tube Highlight (glossy shine along top curve) */}
          <Path
            d="M 32 50 Q 70 20 108 50"
            fill="none"
            stroke="#FFF5E8"
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeOpacity={0.75}
          />
        </Svg>
      </View>

      {/* 3. TANK UPPER BODY: Cropped from assets/mascot/tank.png */}
      <View style={[styles.tankCropper, { width: size * 0.82, height: size * 0.65 }]}>
        <Image
          source={require('@/assets/skins/classic.png')}
          style={{
            width: size * 0.95,
            height: size * 0.95,
            marginTop: -size * 0.05,
          }}
          resizeMode="contain"
        />
      </View>

      {/* 4. FRONT HALF OF INFLATABLE RING: Wraps over Tank's lower chest */}
      <View style={[styles.svgWrap, { width: size, height: size }]}>
        <Svg width={size} height={size} viewBox="0 0 140 140">
          <Defs>
            <LinearGradient id="frontRingGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#E67E32" />
              <Stop offset="40%" stopColor="#D97224" />
              <Stop offset="100%" stopColor="#A84C0F" />
            </LinearGradient>
          </Defs>

          {/* Front arc of the tube */}
          <Path
            d="M 10 70 C 10 102 36 127 70 127 C 104 127 130 102 130 70 C 122 76 112 80 102 80 C 86 80 78 72 70 72 C 62 72 54 80 38 80 C 28 80 18 76 10 70 Z"
            fill="url(#frontRingGrad)"
          />

          {/* Cream Highlight curve on front tube */}
          <Path
            d="M 28 92 C 45 116 95 116 112 92"
            fill="none"
            stroke="#FFF8EE"
            strokeWidth={4.2}
            strokeLinecap="round"
            strokeOpacity={0.88}
          />

          {/* Secondary subtle glint */}
          <Path
            d="M 40 106 C 52 118 88 118 100 106"
            fill="none"
            stroke="#FFE9CC"
            strokeWidth={2}
            strokeLinecap="round"
            strokeOpacity={0.6}
          />

          {/* Front bottom foam line */}
          <Path
            d="M 12 73 C 24 116 116 116 128 73"
            fill="none"
            stroke="#F5E6D0"
            strokeWidth={2.5}
            strokeOpacity={0.75}
          />
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadowWrap: {
    position: 'absolute',
    top: -10,
    left: -10,
  },
  svgWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  tankCropper: {
    position: 'absolute',
    top: 6,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 2,
  },
});

export default TankFloat;
