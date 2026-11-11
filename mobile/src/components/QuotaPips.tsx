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
  groups?: number;
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
  groups = 2,
  style
}: QuotaPipsProps) {
  const config = PIPS[variant];
  const count = total || config.count;
  const safeFilled = Math.max(0, Math.min(filled, count));
  const groupCount = Math.max(1, Math.min(groups, count));
  const perGroup = Math.ceil(count / groupCount);
  const grouped: boolean[][] = Array.from({ length: groupCount }, (_, groupIndex) =>
    Array.from({ length: perGroup }, (_, indexInGroup) => {
      const pipIndex = groupIndex * perGroup + indexInGroup;
      return pipIndex < count && pipIndex < safeFilled;
    }).filter((_, indexInGroup) => groupIndex * perGroup + indexInGroup < count)
  );
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
      <View style={[styles.groups, { gap: THEME.components.futsalPips.gap + 6 }]}>
        {grouped.map((groupPips, groupIndex) => (
          <View key={`group-${groupIndex}`} style={[styles.group, { gap: config.gap }]}>
            {groupPips.map((active, pipIndex) => (
              <View
                key={`pip-${groupIndex}-${pipIndex}`}
                style={{
                  flex: 1,
                  height: config.height,
                  borderRadius: config.borderRadius,
                  backgroundColor: active ? config.activeBg : config.emptyBg
                }}
              />
            ))}
          </View>
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
  groups: {
    flexDirection: 'row'
  },
  group: {
    flex: 1,
    flexDirection: 'row'
  }
});
