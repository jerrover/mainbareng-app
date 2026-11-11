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
  onPress?: () => void;
  elevated?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function BentoCard({
  children,
  eyebrow,
  title,
  subtitle,
  rightAccessory,
  footer,
  onPress,
  elevated = false,
  padded = true,
  style
}: BentoCardProps) {
  const hasHeader = Boolean(eyebrow || title || subtitle || rightAccessory);

  const content = (
    <>
      {hasHeader ? (
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {rightAccessory ? <View style={styles.accessory}>{rightAccessory}</View> : null}
        </View>
      ) : null}
      {children}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </>
  );

  const cardStyle: StyleProp<ViewStyle> = [
    styles.card,
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
  elevated: {
    backgroundColor: THEME.colors.cardElevated
  },
  padded: {
    padding: 18
  },
  pressed: {
    opacity: 0.9
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  headerText: {
    flex: 1,
    gap: 2
  },
  accessory: {
    marginLeft: 12
  },
  eyebrow: {
    ...THEME.typography.micro,
    color: THEME.colors.primary,
    textTransform: 'uppercase'
  },
  title: {
    ...THEME.typography.h3,
    color: THEME.colors.text
  },
  subtitle: {
    ...THEME.typography.body,
    color: THEME.colors.textSecondary
  },
  footer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border
  }
});
