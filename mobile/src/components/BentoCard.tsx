import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { THEME } from '../theme';

export interface BentoCardProps {
  children?: React.ReactNode;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  rightAccessory?: React.ReactNode;
  footer?: React.ReactNode;
  priceLabel?: string;
  priceValue?: string;
  footerAction?: React.ReactNode;
  onPress?: () => void;
  elevated?: boolean;
  padded?: boolean;
  asymmetric?: boolean;
  accentColor?: string | null;
  style?: StyleProp<ViewStyle>;
}

export default function BentoCard({
  children,
  eyebrow,
  title,
  subtitle,
  rightAccessory,
  footer,
  priceLabel,
  priceValue,
  footerAction,
  onPress,
  elevated = false,
  padded = true,
  asymmetric = true,
  accentColor = THEME.colors.primary,
  style
}: BentoCardProps) {
  const hasHeader = Boolean(eyebrow || title || subtitle || rightAccessory);
  const hasPriceFooter = Boolean(priceValue || footerAction);

  const content = (
    <>
      {accentColor ? (
        <View pointerEvents="none" style={[styles.accentEdge, { backgroundColor: accentColor }]} />
      ) : null}

      {hasHeader ? (
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            {eyebrow ? (
              <View style={styles.eyebrowPill}>
                <Text style={styles.eyebrow}>{eyebrow}</Text>
              </View>
            ) : null}
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {rightAccessory ? <View style={styles.accessory}>{rightAccessory}</View> : null}
        </View>
      ) : null}

      {children}

      {footer ? <View style={styles.footer}>{footer}</View> : null}

      {hasPriceFooter ? (
        <View style={styles.priceFooter}>
          <View style={styles.priceBlock}>
            {priceLabel ? <Text style={styles.priceLabel}>{priceLabel}</Text> : null}
            {priceValue ? <Text style={styles.priceValue}>{priceValue}</Text> : null}
          </View>
          {footerAction ? <View style={styles.priceAction}>{footerAction}</View> : null}
        </View>
      ) : null}
    </>
  );

  const cardStyle: StyleProp<ViewStyle> = [
    styles.card,
    asymmetric && styles.asymmetric,
    elevated && styles.elevated,
    padded && styles.padded,
    style
  ];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    overflow: 'hidden'
  },
  asymmetric: {
    borderTopLeftRadius: THEME.radius.lg + 12
  },
  elevated: {
    backgroundColor: THEME.colors.cardElevated
  },
  padded: {
    padding: 18,
    paddingLeft: 21
  },
  pressed: {
    transform: [{ scale: 0.99 }]
  },
  accentEdge: {
    position: 'absolute',
    left: 0,
    top: 18,
    bottom: 18,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  headerText: {
    flex: 1,
    gap: 3
  },
  accessory: {
    marginLeft: 12
  },
  eyebrowPill: {
    alignSelf: 'flex-start',
    backgroundColor: THEME.colors.primarySoft,
    borderRadius: THEME.radius.xs,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginBottom: 2
  },
  eyebrow: {
    ...THEME.typography.micro,
    color: THEME.colors.primary,
    textTransform: 'uppercase'
  },
  title: {
    ...THEME.typography.cardTitle,
    color: THEME.colors.text
  },
  subtitle: {
    ...THEME.typography.bodySmall,
    color: THEME.colors.textSecondary
  },
  footer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border
  },
  priceFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10
  },
  priceBlock: {
    flex: 1
  },
  priceLabel: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    lineHeight: 14,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  priceValue: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 15,
    lineHeight: 20,
    color: THEME.colors.success,
    includeFontPadding: false
  },
  priceAction: {
    flexShrink: 0
  }
});
