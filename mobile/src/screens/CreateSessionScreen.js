import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { THEME } from '../theme';

export default function CreateSessionScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [activity, setActivity] = useState('Futsal');
  const [title, setTitle] = useState('');
  const [maxSlots, setMaxSlots] = useState('10');
  const [minKarma, setMinKarma] = useState('70');

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else {
      // Selesai bikin sesi, arahkan ke explore
      alert('Sesi Mabar Berhasil Dibuat!');
      navigation.navigate('Explore');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>BUAT SESI MABAR</Text>
        <Text style={styles.headerSubtitle}>Langkah {step} dari 3: {step === 1 ? 'Pilih Olahraga/Game' : step === 2 ? 'Aturan Kuota & Jadwal' : 'Rangkuman & Konfirmasi'}</Text>
      </View>

      {/* Step Indicator */}
      <View style={styles.stepBar}>
        <View style={[styles.stepItem, step >= 1 && styles.stepItemActive]} />
        <View style={[styles.stepItem, step >= 2 && styles.stepItemActive]} />
        <View style={[styles.stepItem, step >= 3 && styles.stepItemActive]} />
      </View>

      {step === 1 && (
        <View style={styles.stepContent}>
          <Text style={styles.label}>Pilih Cabang Aktivitas</Text>
          <View style={styles.activityGrid}>
            {['Futsal', 'Badminton', 'Basket', 'MLBB', 'Valorant'].map((act) => (
              <TouchableOpacity
                key={act}
                style={[styles.actBtn, activity === act && styles.actBtnActive]}
                onPress={() => setActivity(act)}
              >
                <Text style={[styles.actBtnText, activity === act && styles.actBtnTextActive]}>{act}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: 20 }]}>Judul Sesi Mabar</Text>
          <TextInput
            style={styles.input}
            placeholder="Contoh: Futsal Santai 5v5 Serpong"
            placeholderTextColor={THEME.colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />
        </View>
      )}

      {step === 2 && (
        <View style={styles.stepContent}>
          <Text style={styles.label}>Kapasitas Total Slot Pemain</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={maxSlots}
            onChangeText={setMaxSlots}
            placeholder="10"
            placeholderTextColor={THEME.colors.textMuted}
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Syarat Minimum Karma Score</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={minKarma}
            onChangeText={setMinKarma}
            placeholder="70 (Standar Sportif)"
            placeholderTextColor={THEME.colors.textMuted}
          />
          <Text style={styles.helperText}>Pemain dengan Karma di bawah angka ini tidak dapat mendaftar.</Text>
        </View>
      )}

      {step === 3 && (
        <View style={styles.stepContent}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Konfirmasi Sesi</Text>
            <Text style={styles.summaryItem}>Cabang: <Text style={styles.bold}>{activity}</Text></Text>
            <Text style={styles.summaryItem}>Judul: <Text style={styles.bold}>{title || 'Sesi Mabar'}</Text></Text>
            <Text style={styles.summaryItem}>Maksimal Slot: <Text style={styles.bold}>{maxSlots} Orang</Text></Text>
            <Text style={styles.summaryItem}>Batas Minimal Karma: <Text style={styles.bold}>{minKarma}</Text></Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        {step > 1 && (
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setStep(step - 1)}>
            <Text style={styles.btnSecondaryText}>Kembali</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.btnPrimary} onPress={handleNext}>
          <Text style={styles.btnPrimaryText}>{step === 3 ? 'Publikasikan Sesi' : 'Lanjut'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background
  },
  content: {
    padding: 20
  },
  header: {
    marginBottom: 20
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 1
  },
  headerSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 4
  },
  stepBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24
  },
  stepItem: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.colors.cardElevated
  },
  stepItemActive: {
    backgroundColor: THEME.colors.primary
  },
  stepContent: {
    backgroundColor: THEME.colors.card,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    marginBottom: 24
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  actBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder
  },
  actBtnActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary
  },
  actBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.text
  },
  actBtnTextActive: {
    color: THEME.colors.textOnPrimary
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
  helperText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 6
  },
  summaryBox: {
    gap: 10
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 6
  },
  summaryItem: {
    fontSize: 13,
    color: THEME.colors.textSecondary
  },
  bold: {
    color: THEME.colors.primary,
    fontWeight: '700'
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: THEME.colors.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder
  },
  btnSecondaryText: {
    color: THEME.colors.text,
    fontSize: 14,
    fontWeight: '700'
  },
  btnPrimary: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center'
  },
  btnPrimaryText: {
    color: THEME.colors.textOnPrimary,
    fontSize: 14,
    fontWeight: '800'
  }
});
