import AsyncStorage from '@react-native-async-storage/async-storage';
import { getIsPro } from '@/store/purchaseStorage';
import { DEFAULT_SKIN_ID, getSkinAssets, SkinAssets } from '@/constants/mascotSkins';

export const SELECTED_SKIN_STORAGE_KEY = 'protie.selected_skin.v1';

/**
 * Get currently selected skin ID.
 * Access Control Rule:
 * Reuses existing Pro entitlement. Do not treat a skin as unlocked merely
 * because its name is stored in AsyncStorage. If !isPro and the skin requires Pro,
 * gracefully fallback to 'classic' and persist 'classic' to clean up stale stored ids.
 */
export async function getSelectedSkinId(): Promise<string> {
  try {
    const isPro = await getIsPro();
    const stored = await AsyncStorage.getItem(SELECTED_SKIN_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_SKIN_ID;
    }

    const skin = getSkinAssets(stored);
    if (skin.isPro && !isPro) {
      // Pro expired or not active: clean up AsyncStorage and return classic
      await AsyncStorage.setItem(SELECTED_SKIN_STORAGE_KEY, DEFAULT_SKIN_ID);
      return DEFAULT_SKIN_ID;
    }

    return skin.id;
  } catch (error) {
    console.warn('Failed to load selected skin:', error);
    return DEFAULT_SKIN_ID;
  }
}

/**
 * Save selected skin ID to AsyncStorage.
 * Enforces Pro entitlement check.
 */
export async function setSelectedSkinId(skinId: string): Promise<boolean> {
  try {
    const skin = getSkinAssets(skinId);
    if (skin.isPro) {
      const isPro = await getIsPro();
      if (!isPro) {
        return false; // Pro required
      }
    }

    await AsyncStorage.setItem(SELECTED_SKIN_STORAGE_KEY, skin.id);
    return true;
  } catch (error) {
    console.error('Failed to save selected skin:', error);
    return false;
  }
}

/**
 * Reset skin to default 'classic' (e.g. on Restart Onboarding).
 */
export async function resetSkinToDefault(): Promise<void> {
  try {
    await AsyncStorage.setItem(SELECTED_SKIN_STORAGE_KEY, DEFAULT_SKIN_ID);
  } catch (error) {
    console.warn('Failed to reset skin to default:', error);
  }
}

/**
 * Convenience helper to load the active skin assets directly with entitlement check.
 */
export async function getActiveSkinAssets(): Promise<SkinAssets> {
  const skinId = await getSelectedSkinId();
  return getSkinAssets(skinId);
}
