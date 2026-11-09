import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable
} from 'react-native';
import { THEME } from '../theme';

export type AlertType = 'error' | 'success' | 'warning' | 'info';

export interface CustomAlertModalProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message: string;
  primaryButtonText?: string;
  onPrimaryPress: () => void;
  secondaryButtonText?: string;
  onSecondaryPress?: () => void;
  onClose?: () => void;
}

export default function CustomAlertModal({
  visible,
  type = 'info',
  title,
  message,
  primaryButtonText = 'Mengerti',
  onPrimaryPress,
  secondaryButtonText,
  onSecondaryPress,
  onClose
}: CustomAlertModalProps) {
  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'error':
        return '✕';
      case 'success':
        return '✓';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  const getAccentColor = () => {
    switch (type) {
      case 'error':
        return THEME.colors.danger;
      case 'success':
        return THEME.colors.primary;
      case 'warning':
        return THEME.colors.warning;
      case 'info':
      default:
        return THEME.colors.accent;
    }
  };

  const getBadgeBg = () => {
    switch (type) {
      case 'error':
        return 'rgba(255, 59, 48, 0.12)';
      case 'success':
        return THEME.colors.primaryMuted;
      case 'warning':
        return 'rgba(255, 159, 10, 0.12)';
      case 'info':
      default:
        return 'rgba(94, 92, 230, 0.15)';
    }
  };

  const accentColor = getAccentColor();
  const badgeBg = getBadgeBg();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose || onPrimaryPress}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose || onPrimaryPress}
      >
        <Pressable
          style={styles.modalCard}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Top Icon Badge */}
          <View
            style={[
              styles.iconBadge,
              { backgroundColor: badgeBg, borderColor: accentColor }
            ]}
          >
            <Text
              style={[
                styles.iconText,
                { color: accentColor }
              ]}
            >
              {getIcon()}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.titleText}>{title}</Text>

          {/* Message */}
          <Text style={styles.messageText}>{message}</Text>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            {secondaryButtonText && onSecondaryPress && (
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={onSecondaryPress}
                activeOpacity={0.8}
              >
                <Text style={styles.btnSecondaryText}>
                  {secondaryButtonText}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.btnPrimary,
                {
                  backgroundColor:
                    type === 'error'
                      ? THEME.colors.danger
                      : THEME.colors.primary
                }
              ]}
              onPress={onPrimaryPress}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.btnPrimaryText,
                  {
                    color:
                      type === 'error'
                        ? '#FFFFFF'
                        : THEME.colors.textOnPrimary
                  }
                ]}
              >
                {primaryButtonText}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 11, 16, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: THEME.colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  iconText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 20,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center'
  },
  titleText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 16,
    color: THEME.colors.text,
    textAlign: 'center',
    marginBottom: 8,
    includeFontPadding: false,
    lineHeight: 22
  },
  messageText: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 22,
    includeFontPadding: false,
    paddingHorizontal: 8
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10
  },
  btnSecondary: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnSecondaryText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 13,
    color: THEME.colors.textSecondary,
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
  btnPrimary: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnPrimaryText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13,
    includeFontPadding: false,
    textAlignVertical: 'center'
  }
});
