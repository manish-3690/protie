import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';
import { theme } from '@/constants/theme';
import { triggerLightHaptic } from '@/components/utils/haptics';

export type TabKey = 'home' | 'history' | 'settings';

export interface BottomTabBarProps {
  currentTab: TabKey;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ currentTab }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleTabPress = (tab: TabKey) => {
    if (tab === currentTab) return;
    if (Platform.OS !== 'web') {
      triggerLightHaptic();
    }
    if (tab === 'home') {
      router.replace('/home');
    } else if (tab === 'history') {
      router.replace('/history');
    } else if (tab === 'settings') {
      router.replace('/settings');
    }
  };

  const bottomPadding = Math.max(insets.bottom, 12);

  return (
    <View style={styles.outerWrapper}>
      <View style={[styles.barContainer, { paddingBottom: bottomPadding }]}>
        {/* Home Tab */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => handleTabPress('home')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: currentTab === 'home' }}
          accessibilityLabel="Home tab"
        >
          <HomeIcon active={currentTab === 'home'} />
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'home' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>

        {/* History Tab */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => handleTabPress('history')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: currentTab === 'history' }}
          accessibilityLabel="History tab"
        >
          <HistoryIcon active={currentTab === 'history'} />
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'history' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            History
          </Text>
        </TouchableOpacity>

        {/* Settings Tab */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => handleTabPress('settings')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: currentTab === 'settings' }}
          accessibilityLabel="Settings tab"
        >
          <SettingsIcon active={currentTab === 'settings'} />
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'settings' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// SVG Icon Components for maximum crispness and zero asset dependencies
const HomeIcon: React.FC<{ active: boolean }> = ({ active }) => {
  const color = active ? theme.colors.primary : theme.colors.textSecondary;
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.5L12 3L21 10.5V20C21 20.5523 20.5523 21 20 21H15V15H9V21H4C3.44772 21 3 20.5523 3 20V10.5Z"
        fill={active ? color : 'none'}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

const HistoryIcon: React.FC<{ active: boolean }> = ({ active }) => {
  const color = active ? theme.colors.primary : theme.colors.textSecondary;
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      {/* 3 vertical bars representing stats / history */}
      <Rect
        x={3}
        y={12}
        width={4}
        height={8}
        rx={1.5}
        fill={active ? color : 'none'}
        stroke={color}
        strokeWidth={2}
      />
      <Rect
        x={10}
        y={6}
        width={4}
        height={14}
        rx={1.5}
        fill={active ? color : 'none'}
        stroke={color}
        strokeWidth={2}
      />
      <Rect
        x={17}
        y={9}
        width={4}
        height={11}
        rx={1.5}
        fill={active ? color : 'none'}
        stroke={color}
        strokeWidth={2}
      />
    </Svg>
  );
};

const SettingsIcon: React.FC<{ active: boolean }> = ({ active }) => {
  const color = active ? theme.colors.primary : theme.colors.textSecondary;
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <G stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx={12} cy={12} r={3} fill={active ? color : 'none'} />
        <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </G>
    </Svg>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    width: '100%',
    backgroundColor: theme.colors.card,
    borderTopWidth: 1.5,
    borderTopColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 10,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  tabLabelActive: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  tabLabelInactive: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
});

export default BottomTabBar;
