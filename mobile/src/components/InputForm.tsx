import React, { useState } from 'react';
import {
  KeyboardTypeOptions,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle
} from 'react-native';
import { THEME } from '../theme';

export interface InputFormProps {
  label?: string;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  helper?: string;
  error?: string | null;
  leftIcon?: string;
  rightIcon?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  multiline?: boolean;
  editable?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  showCounter?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function InputForm({
  label,
  value,
  onChangeText,
  placeholder,
  helper,
  error,
  leftIcon,
  rightIcon,
  secureTextEntry = false,
  keyboardType = 'default',
  maxLength,
  multiline = false,
  editable = true,
  autoCapitalize = 'sentences',
  showCounter = false,
  style,
  testID
}: InputFormProps) {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);
  const borderColor = hasError
    ? THEME.colors.danger
    : focused
      ? THEME.colors.borderActive
      : THEME.colors.cardBorder;
  const labelColor = focused && !hasError ? THEME.colors.primary : THEME.colors.textSecondary;
  const hasLabelRow = Boolean(label) || (showCounter && Boolean(maxLength));

  return (
    <View style={style}>
      {hasLabelRow ? (
        <View style={styles.labelRow}>
          {label ? <Text style={[styles.label, { color: labelColor }]}>{label}</Text> : <View />}
          {showCounter && maxLength ? (
            <Text style={styles.counter}>
              {value.length} / {maxLength}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View
        style={[
          styles.box,
          multiline && styles.multilineBox,
          { borderColor, opacity: editable ? 1 : 0.6 }
        ]}
      >
        {leftIcon ? <Text style={styles.leftIcon}>{leftIcon}</Text> : null}
        <TextInput
          testID={testID}
          style={[
            styles.input,
            multiline && styles.multilineInput,
            focused && value.length > 0 && styles.inputFocused
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={THEME.colors.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          maxLength={maxLength}
          multiline={multiline}
          editable={editable}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={THEME.colors.primary}
          cursorColor={THEME.colors.primary}
        />
        {rightIcon ? <Text style={styles.rightIcon}>{rightIcon}</Text> : null}
      </View>

      {hasError ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helper ? (
        <Text style={styles.helperText}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  label: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
    includeFontPadding: false
  },
  counter: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted
  },
  box: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 16
  },
  multilineBox: {
    minHeight: 96,
    alignItems: 'flex-start',
    paddingVertical: 12
  },
  input: {
    flex: 1,
    ...THEME.typography.body,
    color: THEME.colors.text,
    paddingVertical: 0
  },
  inputFocused: {
    fontFamily: THEME.typography.fonts.semiBold
  },
  multilineInput: {
    textAlignVertical: 'top'
  },
  leftIcon: {
    fontSize: 14,
    marginRight: 8
  },
  rightIcon: {
    fontSize: 14,
    marginLeft: 8
  },
  helperText: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
    marginTop: 6
  },
  errorText: {
    ...THEME.typography.caption,
    color: THEME.colors.danger,
    marginTop: 6
  }
});
