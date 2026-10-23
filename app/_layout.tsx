import React from 'react';
import { View, StyleSheet, LogBox } from 'react-native';
import { Stack, useSegments, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { getOnboardingData, isOnboardingComplete } from '@/store/onboardingStorage';

LogBox.ignoreLogs([
  'ExpoNotificationChannelManager.setNotificationChannelAsync',
  'ExpoTopicSubscriptionModule',
  'Push notifications (remote notifications) are unavailable in Expo Go',
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'null cannot be cast to non-null type expo.modules.notifications.channels.NotificationsChannels',
]);

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();

  React.useEffect(() => {
    let isMounted = true;
    const checkGuard = async () => {
      try {
        const data = await getOnboardingData();
        if (!isMounted) return;
        const isComplete = isOnboardingComplete(data);
        const inOnboardingGroup = segments[0] === 'onboarding';

        if (isComplete && inOnboardingGroup) {
          router.replace('/home');
        }
      } catch (err) {
        console.warn('[_layout] Guard check error:', err);
      }
    };
    checkGuard();
    return () => {
      isMounted = false;
    };
  }, [segments, router]);
  return (
    <View style={styles.webOuter}>
      <View style={styles.appColumn}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: theme.colors.background,
            },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              title: 'Entry',
            }}
          />
          <Stack.Screen
            name="welcome"
            options={{
              title: 'Welcome',
            }}
          />
          <Stack.Screen
            name="onboarding/index"
            options={{
              title: 'Track Your Protein',
            }}
          />
          <Stack.Screen
            name="onboarding/first-protein"
            options={{
              title: 'Add First Protein',
            }}
          />
          <Stack.Screen
            name="onboarding/units"
            options={{
              title: 'Units',
            }}
          />
          <Stack.Screen
            name="onboarding/week-start"
            options={{
              title: 'Week Start',
            }}
          />
          <Stack.Screen
            name="onboarding/goal"
            options={{
              title: 'Protein Goal',
            }}
          />
          <Stack.Screen
            name="onboarding/reminders"
            options={{
              title: 'Reminders',
            }}
          />
          <Stack.Screen
            name="onboarding/completion"
            options={{
              title: 'Ready',
            }}
          />
          <Stack.Screen
            name="home/index"
            options={{
              title: 'Home',
            }}
          />
          <Stack.Screen
            name="history/index"
            options={{
              title: 'History',
            }}
          />
          <Stack.Screen
            name="settings/index"
            options={{
              title: 'Settings',
            }}
          />
          <Stack.Screen
            name="food-entry/[id]"
            options={{
              title: 'Log Protein',
            }}
          />
          <Stack.Screen
            name="paywall"
            options={{
              title: 'Protie Pro',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="streak"
            options={{
              title: 'Streak',
            }}
          />
          <Stack.Screen
            name="goal-smashed"
            options={{
              title: 'Goal Smashed',
              presentation: 'modal',
            }}
          />
        </Stack>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webOuter: {
    flex: 1,
    backgroundColor: '#F5ECE1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appColumn: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    backgroundColor: theme.colors.background,
  },
});
