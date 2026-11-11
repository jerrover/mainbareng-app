import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import CustomAlertModal, { AlertType } from '../components/CustomAlertModal';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

export default function AuthScreen({ route, navigation }: Props) {
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
            'Silakan cek kotak masuk email mahasiswa Anda untuk konfirmasi aktivasi akun sebelum masuk.',
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Figma Top Nav Bar (SCR-02) */}
        <View style={styles.topNav}>
          <TouchableOpacity
            style={styles.navCircleBtn}
            onPress={() => {
              if (navigation.canGoBack()) navigation.goBack();
              else navigation.replace('MainTabs', undefined);
            }}
          >
            <Text style={styles.navBackIcon}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.navTitle}>
            {isSignUp ? 'Daftar Akun' : 'Masuk Akun'}
          </Text>

          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>MABAR</Text>
          </View>
        </View>

        {/* Figma Header Text */}
        <View style={styles.headerBox}>
          <Text style={styles.mainTitle}>
            {isSignUp ? 'Mulai Main Bareng' : 'Selamat Datang Kembali'}
          </Text>
          <Text style={styles.subtitle}>
            {isSignUp
              ? 'Buat profil akun untuk bergabung dengan komunitas olahraga & esports UMN.'
              : 'Masuk untuk menemukan dan bergabung ke sesi mabar terdekat.'}
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formContainer}>
          {isSignUp && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NAMA LENGKAP</Text>
              <View style={styles.inputBox}>
                <Text style={styles.inputPrefixIcon}>👤</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Contoh: Jeremy Marvel"
                  placeholderTextColor={THEME.colors.textMuted}
                  autoCapitalize="words"
                  value={fullName}
                  onChangeText={setFullName}
                  editable={!loading}
                />
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>EMAIL MAHASISWA / UMUM</Text>
            <View style={styles.inputBox}>
              <Text style={styles.inputPrefixIcon}>✉</Text>
              <TextInput
                style={styles.inputField}
                placeholder="budi.santoso@student.umn.ac.id"
                placeholderTextColor={THEME.colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>KATA SANDI</Text>
              {!isSignUp && (
                <TouchableOpacity
                  onPress={() =>
                    showAlert('Reset Kata Sandi', 'Fitur pemulihan kata sandi via email UMN akan segera hadir di rilis berikutnya.', 'info')
                  }
                >
                  <Text style={styles.forgotPasswordText}>Lupa Kata Sandi?</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.inputBox}>
              <Text style={styles.inputPrefixIcon}>🔒</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Minimal 6 karakter"
                placeholderTextColor={THEME.colors.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.eyeBtn}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '👁' : '👁‍🗨'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Primary CTA Button */}
          <TouchableOpacity
            style={[
              styles.btnPrimary,
              (loading || (isSignUp && cooldown > 0)) && styles.btnDisabled
            ]}
            onPress={handleAuth}
            disabled={loading || (isSignUp && cooldown > 0)}
          >
            {loading ? (
              <ActivityIndicator color={THEME.colors.textOnPrimary} size="small" />
            ) : (
              <Text style={styles.btnPrimaryText}>
                {isSignUp
                  ? cooldown > 0
                    ? `Tunggu (${cooldown}s)`
                    : 'Daftar Akun Baru'
                  : 'Masuk Akun Sekarang'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Footer Switcher */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>
              {isSignUp ? 'Sudah punya akun Mabar?' : 'Belum punya akun Mabar?'}
            </Text>
            <TouchableOpacity
              onPress={() => setIsSignUp((prev) => !prev)}
              disabled={loading}
            >
              <Text style={styles.footerLink}>
                {isSignUp ? 'Masuk di Sini' : 'Daftar Akun Baru'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Legal Disclaimer */}
          <Text style={styles.legalText}>
            Dengan masuk atau mendaftar, kamu menyetujui Ketentuan Layanan dan Kebijakan Privasi
            Mabar (IF670 UMN).
          </Text>
        </View>
      </ScrollView>

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32
  },
  topNav: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  navCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center'
  },
  navBackIcon: {
    fontSize: 24,
    color: THEME.colors.text,
    includeFontPadding: false,
    textAlign: 'center',
    lineHeight: 28,
    marginTop: -2
  },
  navTitle: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 16,
    color: THEME.colors.text,
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
  brandBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: THEME.colors.primaryMuted,
    borderWidth: 1,
    borderColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  brandBadgeText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.primary,
    includeFontPadding: false,
    textAlignVertical: 'center',
    letterSpacing: 0.5
  },
  headerBox: {
    marginBottom: 20
  },
  mainTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 22,
    color: THEME.colors.text,
    includeFontPadding: false,
    lineHeight: 28,
    marginBottom: 6
  },
  subtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    includeFontPadding: false,
    lineHeight: 18
  },
  formContainer: {
    gap: 16
  },
  inputGroup: {
    gap: 6
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  inputLabel: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    includeFontPadding: false,
    letterSpacing: 0.5
  },
  forgotPasswordText: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 11,
    color: THEME.colors.accent,
    includeFontPadding: false
  },
  inputBox: {
    height: 46,
    borderRadius: 8,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14
  },
  inputPrefixIcon: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginRight: 10,
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
  inputField: {
    flex: 1,
    height: '100%',
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 13,
    color: THEME.colors.text,
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
  eyeBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center'
  },
  eyeIcon: {
    fontSize: 15,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  btnPrimary: {
    height: 48,
    borderRadius: 8,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6
  },
  btnDisabled: {
    opacity: 0.6
  },
  btnPrimaryText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 14,
    color: THEME.colors.textOnPrimary,
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8
  },
  footerText: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  footerLink: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 12,
    color: THEME.colors.accent,
    includeFontPadding: false
  },
  legalText: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    color: THEME.colors.textMuted,
    lineHeight: 15,
    textAlign: 'center',
    marginTop: 14,
    includeFontPadding: false
  }
});
