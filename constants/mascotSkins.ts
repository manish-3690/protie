import { ImageSourcePropType } from 'react-native';

export interface SkinAssets {
  id: string;
  name: string;
  subtitle: string;
  isPro: boolean;
  color: ImageSourcePropType;
  empty: ImageSourcePropType;
  /** Backwards compatibility alias for color */
  image: ImageSourcePropType;
}

export type MascotSkin = SkinAssets;

export const DEFAULT_SKIN_ID = 'classic';

export const SKIN_ASSETS: Record<string, SkinAssets> = {
  classic: {
    id: 'classic',
    name: 'Classic Tank',
    subtitle: 'The original loyal bull',
    isPro: false,
    color: require('@/assets/skins/classic.png'),
    empty: require('@/assets/skins/classic-empty.png'),
    get image() {
      return this.color;
    },
  },
  gym: {
    id: 'gym',
    name: 'Gym Tank',
    subtitle: 'Biceps pumped & ready to lift',
    isPro: true,
    color: require('@/assets/skins/gym.png'),
    empty: require('@/assets/skins/gym-empty.png'),
    get image() {
      return this.color;
    },
  },
  chef: {
    id: 'chef',
    name: 'Chef Tank',
    subtitle: 'Mastering high-protein meals',
    isPro: true,
    color: require('@/assets/skins/chef.png'),
    empty: require('@/assets/skins/chef-empty.png'),
    get image() {
      return this.color;
    },
  },
  explorer: {
    id: 'explorer',
    name: 'Explorer Tank',
    subtitle: 'Trekking trails & fueling up',
    isPro: true,
    color: require('@/assets/skins/explorer.png'),
    empty: require('@/assets/skins/explorer-empty.png'),
    get image() {
      return this.color;
    },
  },
  hoodie: {
    id: 'hoodie',
    name: 'Hoodie Tank',
    subtitle: 'Chill streetwear gym vibes',
    isPro: true,
    color: require('@/assets/skins/hoodie.png'),
    empty: require('@/assets/skins/hoodie-empty.png'),
    get image() {
      return this.color;
    },
  },
  dhoti: {
    id: 'dhoti',
    name: 'Dhoti Tank',
    subtitle: 'Mindful, grounded & strong',
    isPro: true,
    color: require('@/assets/skins/dhoti.png'),
    empty: require('@/assets/skins/dhoti-empty.png'),
    get image() {
      return this.color;
    },
  },
  namaste: {
    id: 'dhoti',
    name: 'Namaste Tank',
    subtitle: 'Mindful, grounded & strong',
    isPro: true,
    color: require('@/assets/skins/dhoti.png'),
    empty: require('@/assets/skins/dhoti-empty.png'),
    get image() {
      return this.color;
    },
  },
  astronaut: {
    id: 'astronaut',
    name: 'Astronaut Tank',
    subtitle: 'Zero gravity, maximum protein',
    isPro: true,
    color: require('@/assets/skins/astronaut.png'),
    empty: require('@/assets/skins/astronaut-empty.png'),
    get image() {
      return this.color;
    },
  },
};

/**
 * List of unique mascot skins for picker UI.
 */
export const MASCOT_SKINS: SkinAssets[] = [
  SKIN_ASSETS.classic,
  SKIN_ASSETS.gym,
  SKIN_ASSETS.chef,
  SKIN_ASSETS.explorer,
  SKIN_ASSETS.hoodie,
  SKIN_ASSETS.dhoti,
  SKIN_ASSETS.astronaut,
];

/**
 * Single helper to retrieve normalized skin assets.
 * Always falls back to Classic Tank if id is missing or invalid.
 */
export function getSkinAssets(selectedSkinId?: string | null): SkinAssets {
  if (!selectedSkinId) {
    return SKIN_ASSETS.classic;
  }
  const normalizedKey = selectedSkinId.toLowerCase().trim();
  return SKIN_ASSETS[normalizedKey] || SKIN_ASSETS.classic;
}

/**
 * Log reaction assets.
 * Only returns an asset if one exists for the selected skin and food.
 * Reaction assets use the exact same normalized 1024x1024 canvas as the skin PNGs.
 */
export function getReactionAsset(
  skinId?: string | null,
  foodId?: string | null
): ImageSourcePropType | null {
  const normSkin = (skinId || 'classic').toLowerCase().trim();
  const normFood = (foodId || '').toLowerCase().trim();

  // Classic Tank has the drinking pose reaction for Whey
  if (normSkin === 'classic' && normFood === 'whey') {
    return require('@/assets/skins/classic-whey-reaction.png');
  }

  // All other combinations (e.g. Eggs on astronaut, Chicken on classic, etc.) have no reaction asset
  return null;
}
