import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { THEME } from '../theme';

export type QuotaPipsVariant = 'futsal' | 'badminton';

export interface QuotaPipsProps {
  filled: number;
  total?: number;
  variant?: QuotaPipsVariant;
  label?: string;
  showCount?: boolean;
  style?: StyleProp<ViewStyle>;
}

const PIPS = {
  futsal: THEME.components.futsalPips,
  badminton: THEME.components.badmintonPips
};

export default function QuotaPips({
  filled,
  total,
  variant = 'futsal',
  label,
  showCount = true,
  style
}: QuotaPipsProps) {
  const config = PIPS[variant];
  const count = total || config.count;
  const safeFilled = Math.max(0, Math.min(filled, count));
  const pips = Array.from({ length: count }, (_, index) => index < safeFilled);
  const hasHeader = Boolean(label) || showCount;

  return (
    <View style={style}>
      {hasHeader ? (
        <View style={styles.header}>
          {label ? <Text style={styles.label}>{label}</Text> : <View />}
          {showCount ? (
            <Text style={styles.count}>
              {safeFilled}/{count} terisi
            </Text>
          ) : null}
        </View>
      ) : null}
      <View style={[styles.row, { gap: config.gap }]}>
        {pips.map((active, index) => (
          <View
            key={`pip-${index}`}
            style={{
              flex: 1,
              height: config.height,
              borderRadius: config.borderRadius,
              backgroundColor: active ? config.activeBg : config.emptyBg
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  label: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    letterSpacing: 0.6
  },
  count: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted
  },
  row: {
    flexDirection: 'row'
  }
});
