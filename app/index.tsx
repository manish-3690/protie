import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { getOnboardingData, isOnboardingComplete } from '@/store/onboardingStorage';
import { runFoodLogMigration } from '@/store/foodLogStorage';

export default function EntryScreen() {
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    let isMounted = true;
    console.log('[Index] Storage read start: requesting onboarding data...');

    // Run one-time food log dedupe migration on start
    runFoodLogMigration().catch((err) =>
      console.warn('[Index] Migration warning:', err)
    );

    // 3-second timeout fallback so the app always redirects
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        resolve(null);
      }, 3000);
    });

    const checkAndRedirect = async () => {
      try {
        const result = await Promise.race([getOnboardingData(), timeoutPromise]);
        if (!isMounted || hasRedirected.current) return;

        if (result === null) {
          console.warn('[Index] Storage read timeout (3s fallback reached)');
          console.log('[Index] Redirect target: /welcome (new install fallback)');
          hasRedirected.current = true;
          router.replace('/welcome');
          return;
        }

        const isComplete = isOnboardingComplete(result);
        console.log('[Index] Storage read result: onboardingComplete =', isComplete);
        const target = isComplete ? '/home' : '/welcome';
        console.log(
          '[Index] Redirect target:',
          target,
          isComplete ? '(existing user -> Home)' : '(new install -> /welcome)'
        );

        hasRedirected.current = true;
        router.replace(target);
      } catch (error) {
        console.error('[Index] Storage read error:', error);
        if (!isMounted || hasRedirected.current) return;
        console.log('[Index] Redirect target: /welcome (error fallback)');
        hasRedirected.current = true;
        router.replace('/welcome');
      }
    };

    checkAndRedirect();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
