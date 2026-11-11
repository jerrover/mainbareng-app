import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { THEME } from '../theme';

export type StatusBadgeVariant =
  | 'urgent'
  | 'slotWarning'
  | 'credit'
  | 'brand'
  | 'accent'
  | 'neutral';
export type StatusBadgeTone = 'soft' | 'solid';

export interface StatusBadgeProps {
  label: string;
  variant?: StatusBadgeVariant;
  tone?: StatusBadgeTone;
  icon?: string;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

interface BadgePalette {
  softBg: string;
  border: string;
  text: string;
  solidBg: string;
  solidText: string;
}

const VARIANTS: Record<StatusBadgeVariant, BadgePalette> = {
  urgent: {
    softBg: THEME.colors.warningSoft,
    border: THEME.colors.warningBorder,
    text: THEME.colors.warning,
    solidBg: THEME.colors.warning,
    solidText: THEME.colors.textOnPrimary
  },
  slotWarning: {
    softBg: THEME.colors.dangerSoft,
    border: THEME.colors.dangerBorder,
    text: THEME.colors.danger,
    solidBg: THEME.colors.danger,
    solidText: THEME.colors.text
  },
  credit: {
    softBg: THEME.colors.successSoft,
    border: THEME.colors.successBorder,
    text: THEME.colors.success,
    solidBg: THEME.colors.success,
    solidText: THEME.colors.textOnPrimary
  },
  brand: {
    softBg: THEME.colors.primarySoft,
    border: THEME.colors.primaryBorder,
    text: THEME.colors.primary,
    solidBg: THEME.colors.primary,
    solidText: THEME.colors.textOnPrimary
  },
  accent: {
    softBg: THEME.colors.accentSoft,
    border: THEME.colors.accentBorder,
    text: THEME.colors.accent,
    solidBg: THEME.colors.accent,
    solidText: THEME.colors.text
  },
  neutral: {
    softBg: THEME.colors.cardElevated,
    border: THEME.colors.cardBorder,
    text: THEME.colors.textSecondary,
    solidBg: THEME.colors.cardElevated,
    solidText: THEME.colors.text
  }
};

export default function StatusBadge({
  label,
  variant = 'neutral',
  tone = 'soft',
  icon,
  size = 'md',
  style
}: StatusBadgeProps) {
  const palette = VARIANTS[variant];
  const solid = tone === 'solid';
  const backgroundColor = solid ? palette.solidBg : palette.softBg;
  const textColor = solid ? palette.solidText : palette.text;

  return (
    <View
      style={[
        styles.base,
        size === 'sm' && styles.sm,
        {
          backgroundColor,
          borderColor: solid ? palette.solidBg : palette.border
        },
        style
      ]}
    >
      {icon ? <Text style={[styles.icon, { color: textColor }]}>{icon}</Text> : null}
      <Text
        style={[styles.label, size === 'sm' && styles.labelSm, { color: textColor }]}
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
    paddingHorizontal: 12,
    borderRadius: THEME.radius.sm,
    borderWidth: 1
  },
  sm: {
    height: 22,
    paddingHorizontal: 10
  },
  label: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 11,
    lineHeight: 14,
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
