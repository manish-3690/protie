import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Trigger a light haptic impact feedback, safely guarded for Web and non-haptic devices.
 */
export function triggerLightHaptic(): void {
  if (Platform.OS === 'web') return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Graceful fallback on web or unsupported devices
  }
}

/**
 * Trigger a medium haptic impact feedback.
 */
export function triggerMediumHaptic(): void {
  if (Platform.OS === 'web') return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // Graceful fallback
  }
}

/**
 * Trigger a success haptic notification feedback.
 */
export function triggerSuccessHaptic(): void {
  if (Platform.OS === 'web') return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Graceful fallback
  }
}
