/**
 * Protie Video Theme Tokens
 * Direct mirror from Expo app constants/theme.ts
 */

export const colors = {
  // Brand Foundation
  background: '#FFF9F0', // Warm off-white
  textPrimary: '#17233D', // Dark navy
  textSecondary: '#5B6882', // Soft muted navy
  primary: '#D97935', // Orange-brown main accent
  primaryPressed: '#C36422', // Deeper orange-brown
  secondarySurface: '#FFE7BD', // Cream surface
  secondarySurfacePressed: '#F2DAB0',
  gold: '#F2BB4B', // Gold accent
  border: '#E8DCC8', // Soft warm border
  card: '#FFFFFF', // Clean card surface
  white: '#FFFFFF',

  // Interactive / State
  disabled: '#E6DECE',
  disabledText: '#9E9484',
  success: '#2E7D32',
} as const;

export const theme = {
  colors,
} as const;

export default theme;
