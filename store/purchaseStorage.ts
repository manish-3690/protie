import AsyncStorage from '@react-native-async-storage/async-storage';

export const IS_PRO_STORAGE_KEY = 'protie.is_pro.v1';
export const DOWNSELL_SHOWN_KEY = 'protie.downsell_shown.v1';
export const DOWNSELL_EXPIRY_KEY = 'protie.downsell_expiry.v1';

/**
 * Check if the user currently has Protie Pro unlocked.
 */
export async function getIsPro(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(IS_PRO_STORAGE_KEY);
    return raw ? JSON.parse(raw) === true : false;
  } catch (error) {
    console.warn('Failed to load isPro status from AsyncStorage:', error);
    return false;
  }
}

/**
 * Set the user's Pro status.
 */
export async function setIsPro(isPro: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(IS_PRO_STORAGE_KEY, JSON.stringify(isPro));
  } catch (error) {
    console.error('Failed to set isPro status in AsyncStorage:', error);
    throw error;
  }
}

/**
 * Execute a mock purchase for a specific pricing plan.
 *
 * TODO: RevenueCat Integration Point:
 * In a native production build with RevenueCat:
 * 1. import Purchases from 'react-native-purchases';
 * 2. const { customerInfo } = await Purchases.purchasePackage(packageToBuy);
 * 3. const isPro = customerInfo.entitlements.active['pro'] !== undefined;
 * 4. await setIsPro(isPro);
 * 5. return { success: isPro, isPro };
 */
export async function mockPurchase(planId: string): Promise<{ success: boolean; isPro: boolean }> {
  try {
    console.log(`[Purchases] Executing mock purchase for plan: ${planId}`);
    // Simulate slight network delay (250ms) for realism
    await new Promise((resolve) => setTimeout(resolve, 250));

    await setIsPro(true);
    return { success: true, isPro: true };
  } catch (error) {
    console.error('Mock purchase failed:', error);
    return { success: false, isPro: false };
  }
}

/**
 * Execute a mock purchase restoration.
 *
 * TODO: RevenueCat Integration Point:
 * In a native production build with RevenueCat:
 * 1. import Purchases from 'react-native-purchases';
 * 2. const customerInfo = await Purchases.restorePurchases();
 * 3. const isPro = customerInfo.entitlements.active['pro'] !== undefined;
 * 4. await setIsPro(isPro);
 * 5. return { success: isPro, isPro };
 */
export async function mockRestorePurchases(): Promise<{ success: boolean; isPro: boolean }> {
  try {
    console.log('[Purchases] Restoring mock purchases...');
    await new Promise((resolve) => setTimeout(resolve, 300));
    // For mock: keep or restore current status
    const currentPro = await getIsPro();
    return { success: true, isPro: currentPro };
  } catch (error) {
    console.error('Mock restore purchases failed:', error);
    return { success: false, isPro: false };
  }
}

/**
 * Check if the downsell modal has already been shown once.
 */
export async function hasDownsellBeenShown(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(DOWNSELL_SHOWN_KEY);
    return raw ? JSON.parse(raw) === true : false;
  } catch {
    return false;
  }
}

/**
 * Mark that the downsell modal has been displayed to the user.
 */
export async function markDownsellShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(DOWNSELL_SHOWN_KEY, JSON.stringify(true));
  } catch (error) {
    console.warn('Failed to mark downsell shown:', error);
  }
}

/**
 * Get or initialize the 60-minute countdown expiry timestamp (in ms).
 */
export async function getDownsellExpiryTime(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(DOWNSELL_EXPIRY_KEY);
    if (raw) {
      const parsed = Number(raw);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }

    // Set 60 minutes from now
    const expiry = Date.now() + 60 * 60 * 1000;
    await AsyncStorage.setItem(DOWNSELL_EXPIRY_KEY, String(expiry));
    return expiry;
  } catch {
    return Date.now() + 60 * 60 * 1000;
  }
}

/**
 * Reset downsell state (used for testing and dev).
 */
export async function resetDownsellState(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([DOWNSELL_SHOWN_KEY, DOWNSELL_EXPIRY_KEY]);
  } catch (error) {
    console.warn('Failed to reset downsell state:', error);
  }
}
