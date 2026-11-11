import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle
} from 'react-native';
import { THEME } from '../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'whatsapp' | 'danger' | 'fab';
export type ButtonSize = 'md' | 'sm';

export interface CustomButtonProps {
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

interface VariantPalette {
  backgroundColor: string;
  borderColor?: string;
  borderWidth?: number;
  textColor: string;
}

const VARIANTS: Record<ButtonVariant, VariantPalette> = {
  primary: {
    backgroundColor: THEME.colors.primary,
    textColor: THEME.colors.textOnPrimary
  },
  secondary: {
    backgroundColor: THEME.colors.cardElevated,
    borderColor: THEME.colors.cardBorder,
    borderWidth: 1,
    textColor: THEME.colors.text
  },
  whatsapp: {
    backgroundColor: THEME.colors.whatsappBg,
    borderColor: THEME.colors.whatsappBorder,
    borderWidth: 1,
    textColor: THEME.colors.whatsapp
  },
  danger: {
    backgroundColor: THEME.colors.dangerSoft,
    borderColor: THEME.colors.dangerBorder,
    borderWidth: 1,
    textColor: THEME.colors.text
  },
  fab: {
    backgroundColor: THEME.colors.primary,
    textColor: THEME.colors.textOnPrimary
  }
};

export default function CustomButton({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = true,
  loading = false,
  disabled = false,
  onPress,
  style,
  accessibilityLabel,
  testID
}: CustomButtonProps) {
  const isFab = variant === 'fab';
  const isDisabled = disabled || loading;

  if (isFab) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || label || 'Tambah'}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        testID={testID}
        disabled={isDisabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.fab,
          pressed && styles.pressed,
          isDisabled && styles.disabled,
          style
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={THEME.colors.textOnPrimary} />
        ) : (
          <Text style={styles.fabIcon}>{icon || '+'}</Text>
        )}
      </Pressable>
    );
  }

  const palette = VARIANTS[variant];
  const height = size === 'sm' ? 40 : THEME.components.buttonPrimary.height;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          borderWidth: palette.borderWidth || 0
        },
        fullWidth ? styles.fullWidth : styles.autoWidth,
        isDisabled && styles.disabled,
        pressed && styles.pressed,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.textColor} />
      ) : (
        <>
          {icon ? <Text style={[styles.icon, { color: palette.textColor }]}>{icon}</Text> : null}
          {label ? (
            <Text style={[styles.label, { color: palette.textColor }]} numberOfLines={1}>
              {label}
            </Text>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    borderRadius: THEME.radius.md
  },
  fullWidth: { alignSelf: 'stretch' },
  autoWidth: { alignSelf: 'flex-start' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  label: {
    ...THEME.typography.button,
    includeFontPadding: false
  },
  icon: {
    fontSize: 15,
    includeFontPadding: false
  },
  fab: {
    width: THEME.components.fabButton.width,
    height: THEME.components.fabButton.height,
    borderRadius: THEME.components.fabButton.borderRadius,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  fabIcon: {
    ...THEME.typography.h2,
    color: THEME.colors.textOnPrimary,
    includeFontPadding: false
  }
});
