import React from 'react';
import {
  Image,
  StyleSheet,
  View,
  StyleProp,
  ViewStyle,
  ImageStyle,
  useWindowDimensions,
} from 'react-native';

import { getSkinAssets, DEFAULT_SKIN_ID } from '@/constants/mascotSkins';
import { getSelectedSkinId } from '@/store/skinStorage';

export interface TankMascotProps {
  /**
   * Optional skin ID override (e.g. 'classic', 'gym', 'chef', 'explorer', 'hoodie', 'dhoti', 'astronaut').
   */
  skinId?: string;
  /**
   * Base width for the mascot. Automatically scales down on small screen viewports.
   */
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
}

/**
 * Tank — Protie's official mascot:
 * A muscular, friendly cartoon bull with gold horns, brown hair and hooves,
 * a cream muzzle and belly, and a bold dark navy outline.
 *
 * Supports dynamic skins (Classic, Gym, Chef, Explorer, Hoodie, Dhoti, Astronaut).
 */
export const TankMascot: React.FC<TankMascotProps> = ({
  skinId,
  size = 200,
  style,
  imageStyle,
  accessibilityLabel = 'Tank, the Protie mascot',
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const [storedSkinId, setStoredSkinId] = React.useState<string>(DEFAULT_SKIN_ID);

  React.useEffect(() => {
    if (!skinId) {
      getSelectedSkinId().then(setStoredSkinId);
    }
  }, [skinId]);

  const activeSkinId = skinId || storedSkinId;
  const skinAssets = getSkinAssets(activeSkinId);

  // Responsive constraint: Ensure mascot width doesn't exceed 85% of screen on small phones
  const maxAllowedWidth = Math.min(size, windowWidth * 0.85);
  const targetDimension = Math.max(120, maxAllowedWidth);

  return (
    <View style={[styles.container, style]}>
      <Image
        source={skinAssets.color}
        style={[
          {
            width: targetDimension,
            height: targetDimension,
          },
          imageStyle,
        ]}
        resizeMode="contain"
        accessibilityLabel={accessibilityLabel}
        accessible
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TankMascot;
