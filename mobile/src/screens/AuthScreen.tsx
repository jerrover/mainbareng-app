import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  TextInputProps,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomButton from '../components/CustomButton';
import { THEME } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import CustomAlertModal, { AlertType } from '../components/CustomAlertModal';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

const GUTTER = THEME.spatial.screenPaddingHorizontal;
const GRID = THEME.spatial.gridUnit;

export default function AuthScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const initialMode = route?.params?.initialMode;
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const setSession = useAuthStore((s) => s.setSession);

  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
    primaryButtonText?: string;
    onPrimaryPress?: () => void;
  }>({
    visible: false,
    type: 'error',
    title: '',
    message: ''
  });

  const showAlert = (
    title: string,
    message: string,
    type: AlertType = 'error',
    onPrimaryPress?: () => void,
    primaryButtonText = 'Mengerti'
  ) => {
    setModalConfig({
      visible: true,
      type,
      title,
      message,
      primaryButtonText,
      onPrimaryPress: () => {
        setModalConfig((prev) => ({ ...prev, visible: false }));
        if (onPrimaryPress) onPrimaryPress();
      }
    });
  };

  const handleAuth = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedName = fullName.trim();

    if (!trimmedEmail || !trimmedPassword) {
      showAlert('Perhatian', 'Silakan isi email dan kata sandi.', 'warning');
      return;
    }

    if (isSignUp && !trimmedName) {
      showAlert('Perhatian', 'Silakan isi nama lengkap Anda.', 'warning');
      return;
    }

    if (trimmedPassword.length < 6) {
      showAlert('Perhatian', 'Kata sandi minimal 6 karakter.', 'warning');
      return;
    }

    if (isSignUp && cooldown > 0) {
      showAlert(
        'Harap Tunggu',
        `Silakan tunggu ${cooldown} detik sebelum mencoba mendaftar lagi.`,
        'warning'
      );
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPassword,
          options: {
            data: {
              full_name: trimmedName
            }
          }
        });

        if (error) throw error;

        if (data.session) {
          setSession(data.session);
          showAlert(
            'Akun Berhasil Dibuat',
            'Selamat datang di MABAR! Akun kamu sudah aktif dan siap digunakan.',
            'success',
            () => navigation.replace('MainTabs', undefined),
            'Mulai Jelajah'
          );
        } else {
          setCooldown(60);
          showAlert(
            'Verifikasi Email Terkirim',
            'Silakan cek kotak masuk email kamu untuk konfirmasi aktivasi akun sebelum masuk.',
            'info',
            () => setIsSignUp(false),
            'Mengerti'
          );
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: trimmedPassword
        });

        if (error) throw error;

        if (data.session) {
          setSession(data.session);
          navigation.replace('MainTabs', undefined);
        }
      }
    } catch (err: any) {
      const rawMessage = err?.message || 'Terjadi kesalahan autentikasi.';
      const lower = rawMessage.toLowerCase();

      let title = isSignUp ? 'Gagal Mendaftar' : 'Gagal Masuk';
      let message = rawMessage;

      if (
        lower.includes('rate limit') ||
        lower.includes('too many requests') ||
        lower.includes('security purposes') ||
        lower.includes('over_email_send_rate_limit') ||
        err?.status === 429
      ) {
        title = 'Batas Permintaan Tercapai';
        message =
          'Terlalu banyak permintaan pengiriman email dalam waktu singkat. Harap tunggu 60 detik sebelum mencoba lagi.';
        setCooldown(60);
      } else if (lower.includes('email not confirmed')) {
        title = 'Email Belum Dikonfirmasi';
        message =
          'Akun kamu belum aktif. Silakan buka tautan konfirmasi di kotak masuk atau spam email Anda.';
      } else if (lower.includes('invalid login credentials')) {
        message = 'Email atau kata sandi tidak cocok.';
      } else if (lower.includes('user already registered')) {
        message = 'Email ini sudah terdaftar. Silakan langsung masuk ke akun kamu.';
      } else if (lower.includes('password should be at least')) {
        message = 'Kata sandi terlalu pendek (minimal 6 karakter).';
      } else if (
        lower.includes('email address is invalid') ||
        lower.includes('unable to validate email')
      ) {
        message = 'Format alamat email tidak valid.';
      }

      showAlert(title, message, 'error', undefined, 'Coba Lagi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <AuthBackdrop />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top, 12),
              paddingBottom: Math.max(insets.bottom, GRID * 3),
              paddingLeft: Math.max(insets.left, GUTTER),
              paddingRight: Math.max(insets.right, GUTTER)
            }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topNav}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kembali"
              style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
              onPress={() => {
                if (navigation.canGoBack()) navigation.goBack();
                else navigation.replace('MainTabs', undefined);
              }}
            >
              <View style={styles.chevron} />
            </Pressable>
            <View style={styles.brand} accessible accessibilityLabel="MainBareng">
              <View style={styles.brandMark}>
                <Text style={styles.brandInitial}>M</Text>
              </View>
              <Text style={styles.brandName} numberOfLines={1}>MainBareng</Text>
            </View>
            <View style={styles.navSpacer} aria-hidden />
          </View>

          <View style={styles.authBody}>
            <Text accessibilityRole="header" style={styles.mainTitle}>
              {isSignUp ? 'Buat akun MainBareng' : 'Masuk ke MainBareng'}
            </Text>
            <Text style={styles.subtitle}>
              {isSignUp
                ? 'Buat akun dan temukan teman main di dekatmu.'
                : 'Masuk untuk menemukan sesi main di dekatmu.'}
            </Text>

            <View style={styles.form}>
              {isSignUp && (
                <AuthField
                  label="Nama lengkap"
                  placeholder="Nama kamu"
                  autoCapitalize="words"
                  autoComplete="name"
                  value={fullName}
                  onChangeText={setFullName}
                  editable={!loading}
                />
              )}

              <AuthField
                label="Email"
                placeholder="nama@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />

              <AuthField
                label="Kata sandi"
                placeholder="Minimal 6 karakter"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
                labelAction={!isSignUp && (
                  <Pressable
                    accessibilityRole="button"
                    hitSlop={GRID}
                    onPress={() =>
                      showAlert('Reset Kata Sandi', 'Fitur reset kata sandi via email segera hadir di pembaruan berikutnya.', 'info')
                    }
                    style={({ pressed }) => pressed && styles.pressed}
                  >
                    <Text style={styles.forgotLink}>Lupa kata sandi?</Text>
                  </Pressable>
                )}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                  onPress={() => setShowPassword((prev) => !prev)}
                  style={({ pressed }) => [styles.revealButton, pressed && styles.pressed]}
                >
                  <Text style={styles.revealLabel}>{showPassword ? 'Sembunyikan' : 'Lihat'}</Text>
                </Pressable>
              </AuthField>

              <CustomButton
                label={isSignUp && cooldown > 0 ? `Tunggu (${cooldown}s)` : isSignUp ? 'Buat akun' : 'Masuk'}
                onPress={handleAuth}
                loading={loading}
                disabled={isSignUp && cooldown > 0}
                style={styles.submit}
              />
            </View>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>
                {isSignUp ? 'Sudah punya akun?' : 'Belum punya akun?'}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsSignUp((prev) => !prev)}
                disabled={loading}
                style={({ pressed }) => [
                  styles.switchButton,
                  pressed && styles.pressed,
                  loading && styles.disabled
                ]}
              >
                <Text style={styles.switchLabel}>{isSignUp ? 'Masuk' : 'Buat akun'}</Text>
              </Pressable>
            </View>

            <Text style={styles.legalText}>
              Dengan masuk atau mendaftar, kamu telah menyetujui Ketentuan Layanan dan Kebijakan Privasi
              Mabar (MainBareng).
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlertModal
        visible={modalConfig.visible}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        primaryButtonText={modalConfig.primaryButtonText}
        onPrimaryPress={
          modalConfig.onPrimaryPress ||
          (() => setModalConfig((prev) => ({ ...prev, visible: false })))
        }
        onClose={() => setModalConfig((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

function AuthField({
  label,
  labelAction,
  children,
  ...inputProps
}: TextInputProps & { label: string; labelAction?: React.ReactNode; children?: React.ReactNode }) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.inputLabel}>{label}</Text>
        {labelAction}
      </View>
      <View style={[styles.inputBox, focused && styles.inputBoxFocused]}>
        <TextInput
          {...inputProps}
          accessibilityLabel={label}
          style={styles.input}
          placeholderTextColor={THEME.colors.textMuted}
          selectionColor={THEME.colors.primary}
          cursorColor={THEME.colors.primary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {children}
      </View>
    </View>
  );
}

function AuthBackdrop() {
  return (
    <View
      style={styles.backdrop}
      pointerEvents="none"
      aria-hidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.outline, styles.court]}>
        <View style={styles.courtLine} />
        <View style={[styles.outline, styles.courtCircle]} />
      </View>
      <View style={[styles.outline, styles.controller]}>
        <View style={styles.directionPad}>
          <View style={[styles.solid, styles.horizontalDirection]} />
          <View style={[styles.solid, styles.verticalDirection]} />
        </View>
        <View style={styles.controllerButtons}>
          {[0, 1, 2, 3].map((index) => (
            <View key={index} style={[styles.solid, styles.controllerButton]} />
          ))}
        </View>
      </View>
      <View style={[styles.outline, styles.racket]}>
        <View style={styles.racketStrings}>
          {[0, 1, 2].map((index) => (
            <View key={index} style={[styles.solid, styles.racketString]} />
          ))}
        </View>
        <View style={[styles.racketStrings, styles.horizontalStrings]}>
          {[0, 1, 2, 3].map((index) => (
            <View key={index} style={[styles.solid, styles.racketString]} />
          ))}
        </View>
        <View style={[styles.outline, styles.racketHandle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screen: {
    flex: 1,
    backgroundColor: THEME.colors.background
  },
  scrollContent: {
    alignItems: 'center'
  },
  topNav: {
    minHeight: THEME.components.buttonPrimary.height,
    width: '100%',
    maxWidth: 1168,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 17
  },
  navButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: THEME.radius.md,
    borderColor: THEME.colors.borderStrong,
    backgroundColor: THEME.colors.card
  },
  navSpacer: { width: 44 },
  chevron: {
    width: 10,
    height: 10,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: THEME.colors.text,
    transform: [{ translateX: 2 }, { rotate: '45deg' }]
  },
  brand: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: GRID,
    paddingHorizontal: GRID
  },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: THEME.radius.sm,
    borderTopRightRadius: THEME.radius.xs,
    borderBottomLeftRadius: THEME.radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primary
  },
  brandInitial: {
    ...THEME.typography.h3,
    color: THEME.colors.textOnPrimary
  },
  brandName: {
    ...THEME.typography.cardTitle,
    flexShrink: 1,
    fontFamily: THEME.typography.fonts.extraBold,
    letterSpacing: -0.6,
    color: THEME.colors.text
  },
  authBody: {
    width: '100%',
    maxWidth: 464,
    marginTop: GRID * 7.5
  },
  mainTitle: {
    ...THEME.typography.h1,
    color: THEME.colors.text
  },
  subtitle: {
    ...THEME.typography.body,
    fontSize: 16,
    lineHeight: 24,
    color: THEME.colors.textSecondary,
    marginTop: GRID,
    marginBottom: GRID * 2.5
  },
  form: { gap: GRID * 1.75 },
  field: { gap: GRID * 0.625 },
  labelRow: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    columnGap: GRID
  },
  inputLabel: {
    ...THEME.typography.button,
    letterSpacing: 0,
    color: THEME.colors.text
  },
  inputBox: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: THEME.radius.md,
    borderColor: THEME.colors.borderStrong,
    backgroundColor: THEME.colors.cardElevated
  },
  inputBoxFocused: { borderColor: THEME.colors.borderActive },
  input: {
    ...THEME.typography.body,
    flex: 1,
    minWidth: 0,
    minHeight: THEME.components.buttonPrimary.height,
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: GRID * 1.5,
    paddingVertical: GRID,
    color: THEME.colors.text
  },
  revealButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: THEME.radius.md,
    paddingHorizontal: GRID * 1.5,
    marginRight: 2
  },
  revealLabel: {
    ...THEME.typography.button,
    fontSize: 13,
    letterSpacing: 0,
    color: THEME.colors.textSecondary
  },
  forgotLink: {
    ...THEME.typography.bodySmall,
    color: THEME.colors.primary
  },
  submit: { marginTop: GRID / 2 },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }]
  },
  disabled: { opacity: 0.5 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: GRID / 2,
    marginTop: GRID * 1.5
  },
  footerText: {
    ...THEME.typography.body,
    fontSize: 14,
    color: THEME.colors.textSecondary
  },
  switchButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: GRID / 2
  },
  switchLabel: {
    ...THEME.typography.button,
    letterSpacing: 0,
    color: THEME.colors.primary
  },
  legalText: {
    ...THEME.typography.bodySmall,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: GRID / 2,
    paddingHorizontal: GRID
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    opacity: 0.24
  },
  outline: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: THEME.colors.textMuted
  },
  solid: { backgroundColor: THEME.colors.textMuted },
  court: {
    top: '8%',
    right: -35,
    width: '46%',
    minWidth: 180,
    maxWidth: 355,
    aspectRatio: 5 / 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: THEME.radius.md,
    transform: [{ rotate: '-23deg' }]
  },
  courtLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: THEME.colors.textMuted
  },
  courtCircle: {
    width: '32%',
    aspectRatio: 1,
    borderRadius: THEME.radius.full
  },
  controller: {
    left: -20,
    bottom: '8%',
    width: '39%',
    minWidth: 144,
    maxWidth: 260,
    aspectRatio: 2,
    borderRadius: 40,
    transform: [{ rotate: '-19deg' }]
  },
  directionPad: {
    position: 'absolute',
    left: '20%',
    top: '31%',
    width: 25,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center'
  },
  horizontalDirection: { position: 'absolute', width: 25, height: 7 },
  verticalDirection: { position: 'absolute', width: 7, height: 25 },
  controllerButtons: {
    position: 'absolute',
    left: '69%',
    top: '38%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 23,
    gap: 4,
    transform: [{ rotate: '45deg' }]
  },
  controllerButton: {
    width: 9,
    height: 9,
    borderRadius: THEME.radius.full
  },
  racket: {
    right: '5%',
    bottom: '13%',
    width: '17%',
    minWidth: 64,
    maxWidth: 116,
    aspectRatio: 3 / 4,
    borderRadius: THEME.radius.full,
    transform: [{ rotate: '33deg' }]
  },
  racketStrings: {
    position: 'absolute',
    top: '17%',
    bottom: '17%',
    left: '20%',
    right: '20%',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    opacity: 0.6
  },
  horizontalStrings: {
    top: '25%',
    bottom: '25%',
    left: '16%',
    right: '16%',
    flexDirection: 'column'
  },
  racketString: { minWidth: 1, minHeight: 1 },
  racketHandle: {
    top: '100%',
    alignSelf: 'center',
    width: GRID,
    height: '52%',
    borderRadius: THEME.radius.xs
  }
});
