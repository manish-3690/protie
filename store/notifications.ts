import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

export const REMINDER_NOTIFICATION_ID = 'protie-daily-protein-reminder';
export const STREAK_REMINDER_NOTIFICATION_ID = 'protie-streak-at-risk-reminder';

/**
 * Detect whether the experience is running inside Expo Go on a client device.
 */
export function isExpoGo(): boolean {
  try {
    return (
      Constants.appOwnership === 'expo' ||
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
      (Constants.executionEnvironment as string) === 'storeClient'
    );
  } catch {
    return false;
  }
}

// Configure foreground notification presentation behavior on native platforms
if (Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (error) {
    console.log('[notifications] Could not initialize notifications handler:', error);
  }
}

/**
 * Set up Android notification channel.
 * In Expo Go on Android, setNotificationChannelAsync throws NullPointerException
 * because the channel manager is not available in the store client.
 * Therefore, channel creation is skipped in Expo Go, and wrapped in its own try/catch.
 */
export async function setupAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  // Skip entirely in Expo Go on Android
  if (isExpoGo()) {
    return;
  }

  try {
    await Notifications.setNotificationChannelAsync('protie-reminders', {
      name: 'Protie Daily Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D97935',
    });
  } catch (error) {
    console.log('[notifications] Channel creation skipped or unavailable:', error);
  }
}

/**
 * Request notification permissions across Android and iOS.
 * Channel creation is separated into its own try/catch block so a channel failure
 * never blocks getPermissionsAsync / requestPermissionsAsync.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  let granted = false;

  try {
    const settings = await Notifications.getPermissionsAsync();
    granted =
      Boolean(settings.granted) ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;

    if (!granted) {
      const request = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      granted =
        Boolean(request.granted) ||
        request.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
        request.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;
    }
  } catch (error) {
    console.log('[notifications] Error requesting notification permissions:', error);
    return false;
  }

  // Set Android notification channel in its own separate try/catch
  try {
    await setupAndroidNotificationChannel();
  } catch (channelErr) {
    console.log('[notifications] Channel setup failed safely:', channelErr);
  }

  return granted;
}

/**
 * Cancel any existing scheduled daily reminder.
 */
export async function cancelDailyReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_NOTIFICATION_ID);
  } catch (error) {
    console.log('[notifications] Error cancelling notification:', error);
  }
}

/**
 * Schedule a daily recurring notification at the specified local time.
 */
export async function scheduleDailyReminder(
  hour: number,
  minute: number
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    // Always cancel previous reminder first to prevent duplicates
    await cancelDailyReminder();

    // Ensure notification channel exists on Android outside Expo Go
    await setupAndroidNotificationChannel();

    const isRunningInExpoGo = isExpoGo();

    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_NOTIFICATION_ID,
      content: {
        title: 'Tank says: Protein time!',
        body: 'Take a moment to log your protein with Tank and keep building your streak.',
        sound: true,
        data: { screen: '/home' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: Platform.OS === 'android' && !isRunningInExpoGo ? 'protie-reminders' : undefined,
      },
    });

    return true;
  } catch (error) {
    console.log('[notifications] Failed to schedule daily reminder notification:', error);
    return false;
  }
}

/**
 * Cancel any scheduled streak-at-risk reminder.
 */
export async function cancelStreakReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(STREAK_REMINDER_NOTIFICATION_ID);
  } catch (error) {
    console.log('[notifications] Error cancelling streak reminder:', error);
  }
}

/**
 * Schedule a streak-at-risk reminder (default 8:30 PM, fires only if nothing logged today).
 */
export async function scheduleStreakReminder(
  hour: number = 20,
  minute: number = 30,
  hasLoggedToday: boolean = false
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    await cancelStreakReminder();

    // If the user already logged protein today, their streak is safe today!
    // We schedule for tomorrow's reminder time so they are reminded if tomorrow goes unlogged.
    if (hasLoggedToday) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(hour, minute, 0, 0);

      await Notifications.scheduleNotificationAsync({
        identifier: STREAK_REMINDER_NOTIFICATION_ID,
        content: {
          title: '🔥 Keep your streak alive!',
          body: "You haven't logged any protein today. Don't let your streak break!",
          sound: true,
          data: { screen: '/home' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: tomorrow,
        },
      });
      return true;
    }

    // Nothing logged today: schedule for the specified daily time
    await setupAndroidNotificationChannel();
    const isRunningInExpoGo = isExpoGo();

    await Notifications.scheduleNotificationAsync({
      identifier: STREAK_REMINDER_NOTIFICATION_ID,
      content: {
        title: '🔥 Keep your streak alive!',
        body: "You haven't logged any protein today. Don't let your streak break!",
        sound: true,
        data: { screen: '/home' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: Platform.OS === 'android' && !isRunningInExpoGo ? 'protie-reminders' : undefined,
      },
    });

    return true;
  } catch (error) {
    console.log('[notifications] Failed to schedule streak reminder:', error);
    return false;
  }
}

