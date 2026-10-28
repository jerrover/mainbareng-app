import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { THEME } from '../theme';

export default function AuthScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Perhatian', 'Silakan masukkan email dan password.');
      return;
    }
    // Dummy login success
    navigation.replace('MainTabs');
  };

  return (
    <View style={styles.container}>
      <View style={styles.brandBox}>
        <Text style={styles.brandTitle}>MABAR</Text>
        <Text style={styles.brandTagline}>Main Bareng, Tanpa Ghosting.</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.cardTitle}>Masuk Akun</Text>

        <Text style={styles.inputLabel}>Email Mahasiswa / Pengguna</Text>
        <TextInput
          style={styles.input}
          placeholder="nama@student.umn.ac.id"
          placeholderTextColor={THEME.colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={[styles.inputLabel, { marginTop: 14 }]}>Kata Sandi</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor={THEME.colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.btnLogin} onPress={handleLogin}>
          <Text style={styles.btnLoginText}>Masuk Sekarang</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>ATAU</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity
          style={styles.btnGoogle}
          onPress={() => navigation.replace('MainTabs')}
        >
          <Text style={styles.btnGoogleText}>🌐 Masuk dengan Google SSO</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    justifyContent: 'center',
    padding: 24
  },
  brandBox: {
    alignItems: 'center',
    marginBottom: 32
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: THEME.colors.primary,
    letterSpacing: 2
  },
  brandTagline: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginTop: 4
  },
  formCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  input: {
    backgroundColor: THEME.colors.cardElevated,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: THEME.colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border
  },
  btnLogin: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20
  },
  btnLoginText: {
    color: THEME.colors.textOnPrimary,
    fontSize: 14,
    fontWeight: '800'
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  },
  dividerText: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 12
  },
  btnGoogle: {
    backgroundColor: THEME.colors.cardElevated,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder
  },
  btnGoogleText: {
    color: THEME.colors.text,
    fontSize: 13,
    fontWeight: '600'
  }
});
