import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';
import { triggerLightHaptic } from '@/components/utils/haptics';

export interface NumericKeypadProps {
  onPressDigit: (digit: string) => void;
  onPressDelete: () => void;
  onPressClear: () => void;
  accentColor?: string;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({
  onPressDigit,
  onPressDelete,
  onPressClear,
  accentColor = theme.colors.primary,
}) => {
  const handlePress = (key: string) => {
    triggerLightHaptic();
    if (key === '⌫') {
      onPressDelete();
    } else if (key === 'C') {
      onPressClear();
    } else {
      onPressDigit(key);
    }
  };

  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', '⌫'],
  ];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.keypadTitle}>Keypad Entry</Text>
        <TouchableOpacity
          onPress={() => handlePress('C')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Clear keypad input"
        >
          <Text style={[styles.clearText, { color: accentColor }]}>Clear</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((key) => {
              const isDelete = key === '⌫';
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.keyButton,
                    isDelete && styles.keyButtonSpecial,
                  ]}
                  activeOpacity={0.65}
                  onPress={() => handlePress(key)}
                  accessibilityRole="button"
                  accessibilityLabel={isDelete ? 'Backspace' : `Number ${key}`}
                >
                  <Text
                    style={[
                      styles.keyText,
                      isDelete && styles.keyTextSpecial,
                    ]}
                  >
                    {key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FAF5ED',
    borderRadius: theme.radii.lg,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginVertical: theme.spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  keypadTitle: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  clearText: {
    ...theme.typography.caption,
    fontWeight: '800',
  },
  grid: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  keyButton: {
    flex: 1,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  keyButtonSpecial: {
    backgroundColor: '#F3EBE1',
  },
  keyText: {
    fontSize: 19,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  keyTextSpecial: {
    fontSize: 18,
    color: theme.colors.primary,
  },
});
