import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';

export interface MascotSilhouetteProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Simple neutral silhouette of the chunky cartoon bull mascot Tank.
 * Designed with SVG vector shapes: small rounded horns, cute ears, and a chunky body.
 */
export const MascotSilhouette: React.FC<MascotSilhouetteProps> = ({
  size = 180,
  color = '#8A96A8', // Neutral slate grey silhouette
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        accessibilityLabel="Tank mascot silhouette"
      >
        <G fill={color}>
          {/* Left Horn */}
          <Path d="M 68 45 C 50 35, 45 15, 60 10 C 70 8, 75 25, 78 40 Z" />
          {/* Right Horn */}
          <Path d="M 132 45 C 150 35, 155 15, 140 10 C 130 8, 125 25, 122 40 Z" />

          {/* Left Ear */}
          <Path d="M 46 62 C 30 62, 28 80, 48 82 C 55 83, 60 74, 58 66 Z" />
          {/* Right Ear */}
          <Path d="M 154 62 C 170 62, 172 80, 152 82 C 145 83, 140 74, 142 66 Z" />

          {/* Chunky Head */}
          <Path d="M 58 55 C 58 35, 142 35, 142 55 C 152 75, 152 110, 138 122 C 120 134, 80 134, 62 122 C 48 110, 48 75, 58 55 Z" />

          {/* Rounded Chunky Body */}
          <Path d="M 45 125 C 28 140, 26 185, 48 194 C 70 200, 130 200, 152 194 C 174 185, 172 140, 155 125 C 140 132, 60 132, 45 125 Z" />

          {/* Subtle Muzzle Silhouette Shape */}
          <Path d="M 72 85 C 72 75, 128 75, 128 85 C 132 100, 132 118, 120 124 C 108 128, 92 128, 80 124 C 68 118, 68 100, 72 85 Z" opacity={0.2} />
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MascotSilhouette;
