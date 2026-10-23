/**
 * Protie Design System Tokens (Stage 1)
 * Inspired by the friendly, chunky, warm aesthetic of Tank and Protie.
 */

export const colors = {
  // Brand Foundation
  background: '#FFF9F0', // Warm off-white
  textPrimary: '#17233D', // Dark navy
  textSecondary: '#5B6882', // Soft muted navy
  primary: '#D97935', // Orange-brown main accent
  primaryPressed: '#C36422', // Deeper orange-brown for press state
  secondarySurface: '#FFE7BD', // Cream surface
  secondarySurfacePressed: '#F2DAB0', // Slightly darker cream for press state
  gold: '#F2BB4B', // Gold accent
  border: '#E8DCC8', // Soft warm border
  card: '#FFFFFF', // Clean card surface
  white: '#FFFFFF',
  
  // Interactive / State
  disabled: '#E6DECE',
  disabledText: '#9E9484',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
} as const;

export const typography = {
  brand: {
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '900' as const,
    letterSpacing: 2,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800' as const,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500' as const,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
  },
  button: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
} as const;

export const buttonDimensions = {
  minHeight: 54, // Ensures > 48dp accessibility touch target
  minWidth: 200,
  borderRadius: radii.full,
} as const;

export const theme = {
  colors,
  spacing,
  radii,
  typography,
  buttonDimensions,
} as const;

export default theme;
