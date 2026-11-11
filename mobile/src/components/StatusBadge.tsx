import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { THEME } from '../theme';

export type StatusBadgeVariant = 'urgent' | 'slotWarning' | 'credit' | 'neutral' | 'accent';

export interface StatusBadgeProps {
  label: string;
  variant?: StatusBadgeVariant;
  icon?: string;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

const VARIANTS: Record<StatusBadgeVariant, { bg: string; border: string; text: string }> = {
  urgent: {
    bg: THEME.colors.warningSoft,
    border: THEME.colors.warningBorder,
    text: THEME.colors.warning
  },
  slotWarning: {
    bg: THEME.colors.dangerSoft,
    border: THEME.colors.dangerBorder,
    text: THEME.colors.danger
  },
  credit: {
    bg: THEME.colors.successSoft,
    border: THEME.colors.successBorder,
    text: THEME.colors.success
  },
  accent: {
    bg: THEME.colors.accentSoft,
    border: THEME.colors.accentBorder,
    text: THEME.colors.accent
  },
  neutral: {
    bg: THEME.colors.cardElevated,
    border: THEME.colors.cardBorder,
    text: THEME.colors.textSecondary
  }
};

export default function StatusBadge({
  label,
  variant = 'neutral',
  icon,
  size = 'md',
  style
}: StatusBadgeProps) {
  const palette = VARIANTS[variant];

  return (
    <View
      style={[
        styles.base,
        size === 'sm' && styles.sm,
        { backgroundColor: palette.bg, borderColor: palette.border },
        style
      ]}
    >
      {icon ? <Text style={[styles.icon, { color: palette.text }]}>{icon}</Text> : null}
      <Text
        style={[styles.label, size === 'sm' && styles.labelSm, { color: palette.text }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: THEME.radius.sm,
    borderWidth: 1
  },
  sm: {
    height: 22,
    paddingHorizontal: 8
  },
  label: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 11,
    letterSpacing: 0.4,
    includeFontPadding: false
  },
  labelSm: {
    fontSize: 10
  },
  icon: {
    fontSize: 11,
    includeFontPadding: false
  }
});
