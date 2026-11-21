import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator
} from 'react-native';
import { THEME } from '../theme';

export type AlertType = 'error' | 'success' | 'warning' | 'info';

export interface CustomAlertModalProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message: string;
  contextBadge?: string;
  primaryButtonText?: string;
  onPrimaryPress: () => void;
  secondaryButtonText?: string;
  onSecondaryPress?: () => void;
  onClose?: () => void;
  isLoading?: boolean;
}

export default function CustomAlertModal({
  visible,
  type = 'info',
  title,
  message,
  contextBadge,
  primaryButtonText = 'Mengerti',
  onPrimaryPress,
  secondaryButtonText,
  onSecondaryPress,
  onClose,
  isLoading = false
}: CustomAlertModalProps) {
  if (!visible) return null;

  const getVisualConfig = () => {
    switch (type) {
      case 'error':
        return {
          icon: '✕',
          accent: '#FF453A',
          badgeBg: 'rgba(255, 69, 58, 0.16)',
          badgeBorder: 'rgba(255, 69, 58, 0.45)',
          btnBg: '#FF3B30',
          btnText: '#FFFFFF'
        };
      case 'warning':
        return {
          icon: '⚠️',
          accent: '#FF9F0A',
          badgeBg: 'rgba(255, 159, 10, 0.16)',
          badgeBorder: 'rgba(255, 159, 10, 0.45)',
          btnBg: '#FF9F0A',
          btnText: '#0A0B0E'
        };
      case 'success':
        return {
          icon: '✓',
          accent: '#00F59B',
          badgeBg: 'rgba(0, 245, 155, 0.16)',
          badgeBorder: 'rgba(0, 245, 155, 0.45)',
          btnBg: THEME.colors.primary,
          btnText: '#0A0B0E'
        };
      case 'info':
      default:
        return {
          icon: 'ℹ',
          accent: THEME.colors.primary,
          badgeBg: 'rgba(213, 255, 64, 0.16)',
          badgeBorder: 'rgba(213, 255, 64, 0.45)',
          btnBg: THEME.colors.primary,
          btnText: '#0A0B0E'
        };
    }
  };

  const visual = getVisualConfig();
  const isDestructive = type === 'error' || type === 'warning';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={isLoading ? undefined : (onClose || onPrimaryPress)}
    >
      <Pressable
        style={styles.backdrop}
        onPress={isLoading ? undefined : (onClose || onPrimaryPress)}
      >
        <Pressable
          style={styles.sheetContainer}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Top Sheet Drag Handle Indicator */}
          <View style={styles.dragHandle} />

          {/* Glowing Bento Icon Badge */}
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: visual.badgeBg,
                borderColor: visual.badgeBorder
              }
            ]}
          >
            <Text style={[styles.iconText, { color: visual.accent }]}>
              {visual.icon}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.titleText}>{title}</Text>

          {/* Context Badge / Impact Pill (Optional) */}
          {contextBadge && (
            <View
              style={[
                styles.contextBadgeBox,
                isDestructive && styles.contextBadgeDestructive
              ]}
            >
              <Text
                style={[
                  styles.contextBadgeText,
                  isDestructive && styles.contextBadgeDestructiveText
                ]}
              >
                {contextBadge}
              </Text>
            </View>
          )}

          {/* Message Description */}
          <Text style={styles.messageText}>{message}</Text>

          {/* Action Buttons (Stacked Modern Pattern) */}
          <View style={styles.actionColumn}>
            {/* Primary Action Button */}
            <TouchableOpacity
              style={[
                styles.btnPrimary,
                { backgroundColor: visual.btnBg },
                isLoading && styles.btnDisabled
              ]}
              onPress={onPrimaryPress}
              disabled={isLoading}
              activeOpacity={0.82}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={visual.btnText} />
              ) : (
                <Text style={[styles.btnPrimaryText, { color: visual.btnText }]}>
                  {primaryButtonText}
                </Text>
              )}
            </TouchableOpacity>

            {/* Secondary Action Button (Cancel / Keep) */}
            {secondaryButtonText && onSecondaryPress && (
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={onSecondaryPress}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.btnSecondaryText}>
                  {secondaryButtonText}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 10, 0.85)',
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#161922',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(192, 194, 184, 0.18)',
    borderBottomWidth: 0,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 24
  },
  dragHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    marginBottom: 20
  },
  iconBadge: {
    width: 54,
    height: 54,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  iconText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 22,
    includeFontPadding: false,
    textAlign: 'center'
  },
  titleText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
    includeFontPadding: false
  },
  contextBadgeBox: {
    backgroundColor: 'rgba(213, 255, 64, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(213, 255, 64, 0.35)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10
  },
  contextBadgeDestructive: {
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    borderColor: 'rgba(255, 69, 58, 0.35)'
  },
  contextBadgeText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  contextBadgeDestructiveText: {
    color: '#FF6B6B'
  },
  messageText: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 13,
    color: '#C0C2B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
    includeFontPadding: false,
    paddingHorizontal: 8
  },
  actionColumn: {
    width: '100%',
    gap: 10
  },
  btnPrimary: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnPrimaryText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 14,
    includeFontPadding: false
  },
  btnSecondary: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1E222D',
    borderWidth: 1,
    borderColor: 'rgba(192, 194, 184, 0.22)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnSecondaryText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 14,
    color: '#C0C2B8',
    includeFontPadding: false
  },
  btnDisabled: {
    opacity: 0.65
  }
});
