/**
 * Web fallback for notification APIs.
 * Notifications are not natively supported on web development preview.
 */

export const REMINDER_NOTIFICATION_ID = 'protie-daily-protein-reminder';

export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function scheduleDailyReminder(
  _hour: number,
  _minute: number
): Promise<boolean> {
  return false;
}

export async function cancelDailyReminder(): Promise<void> {
  // No-op on web
}
