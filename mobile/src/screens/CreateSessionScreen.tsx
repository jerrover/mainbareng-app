import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { THEME } from '../theme';
import { MainTabParamList } from '../navigation/types';
import CustomAlertModal, { AlertType } from '../components/CustomAlertModal';
import { api, ApiVenue } from '../services/api';
import { useAuthStore } from '../store/authStore';

type Props = BottomTabScreenProps<MainTabParamList, 'Create'>;

type SportType = 'Futsal' | 'Badminton' | 'Basket' | 'MLBB';
type MatchFormat = 'balanced' | 'casual';
type VisibilityType = 'public' | 'private';

function computeStartTime(dayLabel: string, kickoffTime: string): string {
  const now = new Date();
  const targetDate = new Date(now);

  if (dayLabel === 'Besok') {
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (dayLabel === 'Sabtu Besok') {
    const day = targetDate.getDay();
    const diff = (6 - day + 7) % 7 || 7;
    targetDate.setDate(targetDate.getDate() + diff);
  } else if (dayLabel === 'Minggu') {
    const day = targetDate.getDay();
    const diff = (7 - day + 7) % 7 || 7;
    targetDate.setDate(targetDate.getDate() + diff);
  }

  const match = kickoffTime.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    targetDate.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
  } else {
    targetDate.setHours(19, 0, 0, 0);
  }

  return targetDate.toISOString();
}

export default function CreateSessionScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Venues from backend
  const [venues, setVenues] = useState<ApiVenue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(false);

  // Step 1 State
  const [title, setTitle] = useState('Futsal Malam Santai 5v5');
  const [sport, setSport] = useState<SportType>('Futsal');
  const [matchFormat, setMatchFormat] = useState<MatchFormat>('balanced');
  const [quota, setQuota] = useState(10);
  const [visibility, setVisibility] = useState<VisibilityType>('public');
  const [sessionMode, setSessionMode] = useState<'scheduled' | 'play_now'>('scheduled');

  // Step 2 State
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [venue, setVenue] = useState('Lapangan Cakra Futsal Gading Serpong');
  const [kickoffTime, setKickoffTime] = useState('19:00 - 21:00');
  const [dayLabel, setDayLabel] = useState('Hari Ini');
  const [totalCost, setTotalCost] = useState('200000');

  // Step 3 State
  const [minKarma, setMinKarma] = useState(70);

  // Alert State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: ''
  });

  const showAlert = (
    type: AlertType,
    title: string,
    message: string,
    onConfirm?: () => void
  ) => {
    setAlertConfig({
      visible: true,
      type,
      title,
      message,
      onConfirm
    });
  };

  const closeAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  // Fetch real venues on mount
  useEffect(() => {
    async function loadVenues() {
      setLoadingVenues(true);
      try {
        const data = await api.getVenues();
        setVenues(data);
        // Pre-select first matching venue if futsal
        const defaultVenue = data.find((v) => v.supported_activities.includes('futsal'));
        if (defaultVenue) {
          setSelectedVenueId(defaultVenue.id);
          setVenue(defaultVenue.name);
          setTotalCost((defaultVenue.rate_hourly_min * 2).toString());
        }
      } catch (e) {
        console.warn('[CreateSessionScreen] Error fetching venues:', e);
      } finally {
        setLoadingVenues(false);
      }
    }
    loadVenues();
  }, []);

  // Filter venues based on selected sport
  const relevantVenues = venues.filter((v) => {
    const s = sport.toLowerCase();
    if (s === 'mlbb') return v.category === 'esports';
    return v.supported_activities.includes(s);
  });

  // Quota stepper controls
  const handleDecrementQuota = () => {
    if (quota > 2) setQuota(quota - 2);
  };
  const handleIncrementQuota = () => {
    if (quota < 20) setQuota(quota + 2);
  };

  // Cost calculations
  const parsedCost = parseInt(totalCost, 10) || 0;
  const splitPerPerson = quota > 0 ? Math.round(parsedCost / quota) : 0;

  const handleNextStep = async () => {
    if (step === 1) {
      if (!title.trim()) {
        showAlert('warning', 'Judul Wajib Diisi', 'Silakan masukkan nama atau judul sesi mabar.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!venue.trim()) {
        showAlert('warning', 'Venue Wajib Diisi', 'Silakan tentukan lokasi lapangan atau arena mabar.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      // Check auth before publishing
      if (!user?.id) {
        showAlert(
          'warning',
          'Perlu Login',
          'Kamu harus masuk dengan akun terlebih dahulu untuk mempublikasikan sesi mabar.',
          () => {
            closeAlert();
            navigation.navigate('Profile');
          }
        );
        return;
      }

      // Publish Session via API
      setSubmitting(true);
      try {
        const startTime = computeStartTime(dayLabel, kickoffTime);
        const createdSession = await api.createSession({
          host_id: user.id,
          title: title.trim(),
          activity_type: sport.toLowerCase(),
          session_category: sport === 'MLBB' ? 'esports' : 'sports',
          session_mode: sessionMode,
          venue_id: selectedVenueId || null,
          custom_location: selectedVenueId ? null : venue.trim(),
          start_time: startTime,
          duration_minutes: 120,
          max_slots: quota,
          min_credit_score: minKarma,
          team_format: matchFormat === 'balanced' ? '2_teams' : 'free_for_all',
          estimated_cost_total: parsedCost
        });

        showAlert(
          'success',
          'Sesi Berhasil Dipublikasikan! 🚀',
          `Sesi "${createdSession.title}" telah live di radar Explore dengan kuota ${quota} pemain dan split Rp ${splitPerPerson.toLocaleString('id-ID')}/org.`,
          () => {
            closeAlert();
            navigation.navigate('Lobby', {
              sessionId: createdSession.id,
              sessionTitle: createdSession.title
            });
          }
        );
      } catch (err: any) {
        console.error('[CreateSessionScreen] Publish error:', err);
        showAlert(
          'error',
          'Gagal Mempublikasikan Sesi',
          err.message || 'Terjadi kesalahan koneksi saat mempublikasikan sesi.'
        );
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.navigate('Explore');
    }
  };

  const stepSubtitles = [
    'Langkah 1 dari 3: Info & Format',
    'Langkah 2 dari 3: Lokasi & Estimasi Patungan',
    'Langkah 3 dari 3: Konfirmasi & Sportifitas'
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Wizard Top Bar (Figma SCR-07 194:5) */}
      <View style={styles.wizardTopBar}>
        <TouchableOpacity
          style={styles.closeBtn}
          activeOpacity={0.8}
          onPress={handlePrevStep}
        >
          <Text style={styles.closeBtnIcon}>{step === 1 ? '✕' : '←'}</Text>
        </TouchableOpacity>

        <View style={styles.wizardTitleBox}>
          <Text style={styles.wizardTitle}>Buat Sesi Mabar</Text>
          <Text style={styles.wizardSubtitle}>{stepSubtitles[step - 1]}</Text>
        </View>

        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>STEP {step}/3</Text>
        </View>
      </View>

      {/* Stepper Progress Bar (Figma 194:13) */}
      <View style={styles.stepperBar}>
        <View style={[styles.stepSegment, step >= 1 && styles.stepSegmentActive]} />
        <View style={[styles.stepSegment, step >= 2 && styles.stepSegmentActive]} />
        <View style={[styles.stepSegment, step >= 3 && styles.stepSegmentActive]} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* STEP 1: Info & Format */}
        {step === 1 && (
          <View style={styles.stepBody}>
            {/* Field: Judul Sesi */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldEyebrow}>NAMA / JUDUL SESI MABAR</Text>
                <Text style={styles.charCounter}>{title.length} / 50</Text>
              </View>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Contoh: Futsal Malam Santai 5v5"
                  placeholderTextColor={THEME.colors.textMuted}
                  value={title}
                  maxLength={50}
                  onChangeText={setTitle}
                />
                <Text style={styles.inputIcon}>✏️</Text>
              </View>
            </View>

            {/* Field: Pilih Cabor (Figma 194:25) */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldEyebrow}>PILIH CABANG OLAHRAGA / GAME</Text>
                <View style={styles.multiSportBadge}>
                  <Text style={styles.multiSportBadgeText}>MULTI-SPORT ✓</Text>
                </View>
              </View>
              <View style={styles.caborGrid}>
                {/* Futsal */}
                <TouchableOpacity
                  style={[
                    styles.caborCard,
                    sport === 'Futsal' && styles.caborCardActive
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSport('Futsal');
                    setQuota(10);
                    setTitle('Futsal Malam Santai 5v5');
                  }}
                >
                  <View style={styles.caborCardHeader}>
                    <Text
                      style={[
                        styles.caborTitle,
                        sport === 'Futsal' && styles.caborTitleActive
                      ]}
                    >
                      ⚽ Futsal
                    </Text>
                    {sport === 'Futsal' && (
                      <View style={styles.checkBadge}>
                        <Text style={styles.checkBadgeText}>✓</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.caborSubtitle}>5v5 · Vinyl & Rumput</Text>
                </TouchableOpacity>

                {/* Badminton */}
                <TouchableOpacity
                  style={[
                    styles.caborCard,
                    sport === 'Badminton' && styles.caborCardActive
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSport('Badminton');
                    setQuota(4);
                    setTitle('Badminton Ganda Intermediate');
                  }}
                >
                  <View style={styles.caborCardHeader}>
                    <Text
                      style={[
                        styles.caborTitle,
                        sport === 'Badminton' && styles.caborTitleActive
                      ]}
                    >
                      🏸 Badminton
                    </Text>
                    {sport === 'Badminton' && (
                      <View style={styles.checkBadge}>
                        <Text style={styles.checkBadgeText}>✓</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.caborSubtitle}>Ganda / Tunggal</Text>
                </TouchableOpacity>

                {/* Basket */}
                <TouchableOpacity
                  style={[
                    styles.caborCard,
                    sport === 'Basket' && styles.caborCardActive
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSport('Basket');
                    setQuota(10);
                    setTitle('Basket 5v5 Full Court Match');
                  }}
                >
                  <View style={styles.caborCardHeader}>
                    <Text
                      style={[
                        styles.caborTitle,
                        sport === 'Basket' && styles.caborTitleActive
                      ]}
                    >
                      🏀 Basket
                    </Text>
                    {sport === 'Basket' && (
                      <View style={styles.checkBadge}>
                        <Text style={styles.checkBadgeText}>✓</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.caborSubtitle}>3v3 / 5v5 Half/Full</Text>
                </TouchableOpacity>

                {/* MLBB */}
                <TouchableOpacity
                  style={[
                    styles.caborCard,
                    sport === 'MLBB' && styles.caborCardActive
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSport('MLBB');
                    setQuota(5);
                    setTitle('MLBB Mythic Push Party Full Squad');
                  }}
                >
                  <View style={styles.caborCardHeader}>
                    <Text
                      style={[
                        styles.caborTitle,
                        sport === 'MLBB' && styles.caborTitleActive
                      ]}
                    >
                      🎮 MLBB
                    </Text>
                    {sport === 'MLBB' && (
                      <View style={styles.checkBadge}>
                        <Text style={styles.checkBadgeText}>✓</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.caborSubtitle}>Esports 5-Man Party</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Field: Mode Sesi (Play Now vs Terjadwal) */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldEyebrow}>TIPE PELAKSANAAN</Text>
                <Text style={styles.sessionModeStatusText}>
                  {sessionMode === 'play_now' ? '⚡ Darurat / Hari Ini' : '📅 Terencana'}
                </Text>
              </View>
              <View style={styles.visibilityRow}>
                <TouchableOpacity
                  style={[
                    styles.visibilityCard,
                    sessionMode === 'scheduled' && styles.visibilityCardActive
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSessionMode('scheduled')}
                >
                  <Text style={styles.visibilityIcon}>📅</Text>
                  <View>
                    <Text
                      style={[
                        styles.visibilityTitle,
                        sessionMode === 'scheduled' && styles.visibilityTitleActive
                      ]}
                    >
                      Terjadwal
                    </Text>
                    <Text style={styles.visibilityDesc}>Mabar terjadwal santai</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.visibilityCard,
                    sessionMode === 'play_now' && styles.visibilityCardActive
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSessionMode('play_now');
                    setDayLabel('Hari Ini');
                  }}
                >
                  <Text style={styles.visibilityIcon}>⚡</Text>
                  <View>
                    <Text
                      style={[
                        styles.visibilityTitle,
                        sessionMode === 'play_now' && styles.visibilityTitleActive
                      ]}
                    >
                      Play Now!
                    </Text>
                    <Text style={styles.visibilityDesc}>Butuh pemain segera</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Field: Format Match (Figma 194:50) */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldEyebrow}>FORMAT PERTANDINGAN</Text>
                <View style={styles.aiBalancedBadge}>
                  <Text style={styles.aiBalancedBadgeText}>AI BALANCED ⚡</Text>
                </View>
              </View>
              <View style={styles.formatRow}>
                <TouchableOpacity
                  style={[
                    styles.formatCard,
                    matchFormat === 'balanced' && styles.formatCardActive
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setMatchFormat('balanced')}
                >
                  <Text
                    style={[
                      styles.formatTitle,
                      matchFormat === 'balanced' && styles.formatTitleActive
                    ]}
                  >
                    2 Tim ({quota / 2}v{quota / 2} Seimbang)
                  </Text>
                  <Text style={styles.formatDesc}>
                    Algoritma AI membagi tim otomatis saat slot lobi penuh.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.formatCard,
                    matchFormat === 'casual' && styles.formatCardActive
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setMatchFormat('casual')}
                >
                  <Text
                    style={[
                      styles.formatTitle,
                      matchFormat === 'casual' && styles.formatTitleActive
                    ]}
                  >
                    Casual / Santai
                  </Text>
                  <Text style={styles.formatDesc}>
                    Bebas tukar pemain mandiri tanpa intervensi skill rating.
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Field: Target Kuota Pemain (Figma 194:62) */}
            <View style={styles.quotaStepperCard}>
              <View>
                <Text style={styles.quotaStepperEyebrow}>TARGET KUOTA PEMAIN</Text>
                <Text style={styles.quotaStepperSubtitle}>
                  {quota / 2} vs {quota / 2} Pemain (Format Lapangan)
                </Text>
              </View>
              <View style={styles.stepperControls}>
                <TouchableOpacity
                  style={styles.stepperMinusBtn}
                  activeOpacity={0.7}
                  onPress={handleDecrementQuota}
                >
                  <Text style={styles.stepperMinusIcon}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{quota}</Text>
                <TouchableOpacity
                  style={styles.stepperPlusBtn}
                  activeOpacity={0.7}
                  onPress={handleIncrementQuota}
                >
                  <Text style={styles.stepperPlusIcon}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Field: Visibilitas Lobi (Figma 194:72) */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldEyebrow}>
                  VISIBILITAS & AKSES LOBI (PRD FR-03)
                </Text>
                <Text style={styles.visibilityStatusText}>
                  {visibility === 'public' ? 'Terbuka Umum' : 'Khusus Undangan'}
                </Text>
              </View>
              <View style={styles.visibilityRow}>
                <TouchableOpacity
                  style={[
                    styles.visibilityCard,
                    visibility === 'public' && styles.visibilityCardActive
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setVisibility('public')}
                >
                  <Text style={styles.visibilityIcon}>🌐</Text>
                  <View>
                    <Text
                      style={[
                        styles.visibilityTitle,
                        visibility === 'public' && styles.visibilityTitleActive
                      ]}
                    >
                      Publik (Explore)
                    </Text>
                    <Text style={styles.visibilityDesc}>Tampil di Home Feed</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.visibilityCard,
                    visibility === 'private' && styles.visibilityCardActive
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setVisibility('private')}
                >
                  <Text style={styles.visibilityIcon}>🔒</Text>
                  <View>
                    <Text
                      style={[
                        styles.visibilityTitle,
                        visibility === 'private' && styles.visibilityTitleActive
                      ]}
                    >
                      Privat (Kode Room)
                    </Text>
                    <Text style={styles.visibilityDesc}>Khusus Undangan</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* STEP 2: Lokasi, Waktu & Biaya */}
        {step === 2 && (
          <View style={styles.stepBody}>
            {/* Field: Nama Venue */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldEyebrow}>LOKASI & VENUE LAPANGAN</Text>
                {loadingVenues && (
                  <Text style={styles.loadingVenuesText}>Memuat venue...</Text>
                )}
              </View>

              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ketik lokasi atau pilih venue terdaftar di bawah"
                  placeholderTextColor={THEME.colors.textMuted}
                  value={venue}
                  onChangeText={(text) => {
                    setVenue(text);
                    setSelectedVenueId(null);
                  }}
                />
                <Text style={styles.inputIcon}>📍</Text>
              </View>

              {/* Venue Quick Chips from DB */}
              <View style={styles.quickChipsRow}>
                {relevantVenues.map((v) => {
                  const isSelected = selectedVenueId === v.id;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[
                        styles.quickChip,
                        isSelected && styles.quickChipActive
                      ]}
                      onPress={() => {
                        setSelectedVenueId(v.id);
                        setVenue(v.name);
                        setTotalCost((v.rate_hourly_min * 2).toString());
                      }}
                    >
                      <Text
                        style={[
                          styles.quickChipText,
                          isSelected && styles.quickChipTextActive
                        ]}
                      >
                        {isSelected ? '✓ ' : ''}
                        {v.name.length > 28 ? v.name.slice(0, 26) + '...' : v.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Field: Jadwal Kickoff */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldEyebrow}>JADWAL & WAKTU KICKOFF</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Contoh: 19:00 - 21:00"
                  placeholderTextColor={THEME.colors.textMuted}
                  value={kickoffTime}
                  onChangeText={setKickoffTime}
                />
                <Text style={styles.inputIcon}>⏰</Text>
              </View>
              {/* Day Chips */}
              <View style={styles.quickChipsRow}>
                {['Hari Ini', 'Besok', 'Sabtu Besok', 'Minggu'].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.quickChip,
                      dayLabel === d && styles.quickChipActive
                    ]}
                    onPress={() => setDayLabel(d)}
                  >
                    <Text
                      style={[
                        styles.quickChipText,
                        dayLabel === d && styles.quickChipTextActive
                      ]}
                    >
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Field: Total Biaya Sewa & Split Calculator */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldEyebrow}>TOTAL BIAYA SEWA LAPANGAN</Text>
              <View style={styles.inputBox}>
                <Text style={styles.rpPrefix}>Rp</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  placeholder="200000"
                  placeholderTextColor={THEME.colors.textMuted}
                  value={totalCost}
                  onChangeText={setTotalCost}
                />
              </View>
            </View>

            {/* Auto Patungan Summary Card */}
            <View style={styles.patunganCalcCard}>
              <View style={styles.patunganCalcHeader}>
                <Text style={styles.patunganCalcLabel}>
                  ESTIMASI PATUNGAN OTOMATIS
                </Text>
                <Text style={styles.patunganCalcQuota}>{quota} Pemain</Text>
              </View>
              <View style={styles.patunganCalcPriceRow}>
                <Text style={styles.patunganCalcPrice}>
                  Rp {splitPerPerson.toLocaleString('id-ID')}
                </Text>
                <Text style={styles.patunganCalcPerOrg}> / pemain</Text>
              </View>
              <Text style={styles.patunganCalcNote}>
                Sistem deposit mengunci dana pemain secara transparan. Jika ada pemain mangkir, deposit dialokasikan ke talangan venue.
              </Text>
            </View>
          </View>
        )}

        {/* STEP 3: Aturan Sportifitas & Ringkasan */}
        {step === 3 && (
          <View style={styles.stepBody}>
            {/* Field: Min Karma Requirement */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldEyebrow}>SYARAT MINIMUM KARMA SCORE</Text>
                <Text style={styles.karmaSelectedLabel}>
                  🛡️ Skor: {minKarma} ({minKarma >= 80 ? 'Disiplin' : 'Sportif'})
                </Text>
              </View>
              <View style={styles.karmaQuickRow}>
                {[60, 70, 80, 90].map((k) => (
                  <TouchableOpacity
                    key={k}
                    style={[
                      styles.karmaBtn,
                      minKarma === k && styles.karmaBtnActive
                    ]}
                    onPress={() => setMinKarma(k)}
                  >
                    <Text
                      style={[
                        styles.karmaBtnText,
                        minKarma === k && styles.karmaBtnTextActive
                      ]}
                    >
                      {k}+
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.karmaHelper}>
                Pemain dengan reputasi sering cancel mendadak tidak akan bisa masuk lobi ini.
              </Text>
            </View>

            {/* Ticket Preview Card */}
            <View style={styles.previewSection}>
              <Text style={styles.previewEyebrow}>PREVIEW MATCH PASS TICKET</Text>
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <View style={styles.previewSportBadge}>
                    <Text style={styles.previewSportText}>
                      ⚽ {sport.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.previewModeText}>
                    {sessionMode === 'play_now' ? '⚡ PLAY NOW' : '📅 TERJADWAL'}
                  </Text>
                </View>

                <Text style={styles.previewTitle}>{title}</Text>
                <Text style={styles.previewVenue}>📍 {venue}</Text>
                <Text style={styles.previewTime}>
                  ⏰ {dayLabel} · {kickoffTime}
                </Text>

                <View style={styles.previewFooter}>
                  <View>
                    <Text style={styles.previewFooterLabel}>EST. PATUNGAN</Text>
                    <Text style={styles.previewFooterPrice}>
                      {splitPerPerson > 0
                        ? `Rp ${splitPerPerson.toLocaleString('id-ID')} / org`
                        : 'Gratis'}
                    </Text>
                  </View>
                  <View style={styles.previewQuotaBadge}>
                    <Text style={styles.previewQuotaText}>
                      Kuota: {quota} Pemain
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Sticky Bottom CTA Button (Figma 194:87) */}
        <TouchableOpacity
          style={[styles.bottomCtaBtn, submitting && styles.bottomCtaDisabled]}
          activeOpacity={0.8}
          disabled={submitting}
          onPress={handleNextStep}
        >
          {submitting ? (
            <View style={styles.submittingRow}>
              <ActivityIndicator size="small" color={THEME.colors.textOnPrimary} />
              <Text style={styles.bottomCtaText}>Mempublikasikan Sesi...</Text>
            </View>
          ) : (
            <Text style={styles.bottomCtaText}>
              {step === 1
                ? 'Lanjut ke Step 2: Lokasi & Biaya ➔'
                : step === 2
                ? 'Lanjut ke Step 3: Sportifitas ➔'
                : 'Publikasikan Sesi Mabar 🚀'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Custom Alert Modal */}
      <CustomAlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onPrimaryPress={() => {
          if (alertConfig.onConfirm) alertConfig.onConfirm();
          else closeAlert();
        }}
        onClose={closeAlert}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background
  },
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background
  },
  contentContainer: {
    paddingHorizontal: THEME.spatial.screenPaddingHorizontal,
    paddingTop: 8,
    paddingBottom: 120
  },

  // Wizard Top Bar (Figma SCR-07 194:5)
  wizardTopBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spatial.screenPaddingHorizontal
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: 'rgba(192, 194, 184, 0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeBtnIcon: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 14,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  wizardTitleBox: {
    alignItems: 'center'
  },
  wizardTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 16,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  wizardSubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    includeFontPadding: false
  },
  stepBadge: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: 'rgba(213, 255, 64, 0.4)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepBadgeText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.primary,
    includeFontPadding: false
  },

  // Stepper Bar (Figma 194:13)
  stepperBar: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: THEME.spatial.screenPaddingHorizontal,
    marginVertical: 12
  },
  stepSegment: {
    flex: 1,
    height: 4,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.cardElevated
  },
  stepSegmentActive: {
    backgroundColor: THEME.colors.primary
  },

  // Step Body
  stepBody: {
    gap: 14
  },
  fieldSection: {
    gap: 6
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  fieldEyebrow: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8,
    includeFontPadding: false
  },
  charCounter: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 10,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  loadingVenuesText: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  inputBox: {
    height: 44,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: 'rgba(213, 255, 64, 0.4)',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14
  },
  textInput: {
    flex: 1,
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13,
    color: THEME.colors.text,
    includeFontPadding: false,
    paddingVertical: 0
  },
  rpPrefix: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13,
    color: THEME.colors.primary,
    marginRight: 6,
    includeFontPadding: false
  },
  inputIcon: {
    fontSize: 13,
    marginLeft: 8
  },

  // Cabor Grid (Figma 194:25)
  multiSportBadge: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  multiSportBadgeText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 9,
    color: THEME.colors.textOnPrimary,
    includeFontPadding: false
  },
  caborGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  caborCard: {
    width: '48.5%',
    height: 66,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'space-between'
  },
  caborCardActive: {
    backgroundColor: THEME.colors.cardElevated,
    borderColor: THEME.colors.primary,
    borderWidth: 1.5
  },
  caborCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  caborTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  caborTitleActive: {
    color: THEME.colors.primary
  },
  checkBadge: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4
  },
  checkBadgeText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 9,
    color: THEME.colors.textOnPrimary,
    includeFontPadding: false
  },
  caborSubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },

  // Session Mode
  sessionModeStatusText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 10,
    color: THEME.colors.primary,
    includeFontPadding: false
  },

  // Format Pertandingan (Figma 194:50)
  aiBalancedBadge: {
    backgroundColor: THEME.colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  aiBalancedBadgeText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 9,
    color: THEME.colors.textOnPrimary,
    includeFontPadding: false
  },
  formatRow: {
    flexDirection: 'row',
    gap: 10
  },
  formatCard: {
    flex: 1,
    height: 78,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: 10,
    padding: 10,
    justifyContent: 'space-between'
  },
  formatCardActive: {
    backgroundColor: THEME.colors.cardElevated,
    borderColor: THEME.colors.primary,
    borderWidth: 1.5
  },
  formatTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 11,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  formatTitleActive: {
    color: THEME.colors.primary
  },
  formatDesc: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 9,
    color: THEME.colors.textSecondary,
    lineHeight: 12,
    includeFontPadding: false
  },

  // Target Kuota Stepper (Figma 194:62)
  quotaStepperCard: {
    height: 64,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14
  },
  quotaStepperEyebrow: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8,
    includeFontPadding: false
  },
  quotaStepperSubtitle: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.text,
    marginTop: 2,
    includeFontPadding: false
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  stepperMinusBtn: {
    width: 32,
    height: 32,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: 'rgba(192, 194, 184, 0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepperMinusIcon: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 14,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  stepperValue: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 16,
    color: THEME.colors.primary,
    minWidth: 20,
    textAlign: 'center',
    includeFontPadding: false
  },
  stepperPlusBtn: {
    width: 32,
    height: 32,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepperPlusIcon: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 16,
    color: THEME.colors.textOnPrimary,
    includeFontPadding: false
  },

  // Visibilitas (Figma 194:72)
  visibilityStatusText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 10,
    color: THEME.colors.success,
    includeFontPadding: false
  },
  visibilityRow: {
    flexDirection: 'row',
    gap: 10
  },
  visibilityCard: {
    flex: 1,
    height: 56,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8
  },
  visibilityCardActive: {
    backgroundColor: THEME.colors.cardElevated,
    borderColor: 'rgba(213, 255, 64, 0.5)',
    borderWidth: 1
  },
  visibilityIcon: {
    fontSize: 16
  },
  visibilityTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 11,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  visibilityTitleActive: {
    color: THEME.colors.primary
  },
  visibilityDesc: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 9,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },

  // Quick Chips (Step 2)
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder
  },
  quickChipActive: {
    backgroundColor: THEME.colors.primaryMuted,
    borderColor: THEME.colors.primary
  },
  quickChipText: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  quickChipTextActive: {
    fontFamily: THEME.typography.fonts.bold,
    color: THEME.colors.primary,
    includeFontPadding: false
  },

  // Patungan Calculator Card (Step 2)
  patunganCalcCard: {
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: THEME.radius.lg,
    padding: 14
  },
  patunganCalcHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  patunganCalcLabel: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8,
    includeFontPadding: false
  },
  patunganCalcQuota: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  patunganCalcPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8
  },
  patunganCalcPrice: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 22,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  patunganCalcPerOrg: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  patunganCalcNote: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    color: THEME.colors.textMuted,
    lineHeight: 14,
    includeFontPadding: false
  },

  // Step 3 (Karma & Preview)
  karmaSelectedLabel: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 10,
    color: THEME.colors.warning,
    includeFontPadding: false
  },
  karmaQuickRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6
  },
  karmaBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center'
  },
  karmaBtnActive: {
    backgroundColor: THEME.colors.primaryMuted,
    borderColor: THEME.colors.primary
  },
  karmaBtnText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  karmaBtnTextActive: {
    color: THEME.colors.primary
  },
  karmaHelper: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 4,
    includeFontPadding: false
  },

  // Preview Card
  previewSection: {
    marginTop: 8,
    gap: 8
  },
  previewEyebrow: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8,
    includeFontPadding: false
  },
  previewCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    padding: 14
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  previewSportBadge: {
    backgroundColor: THEME.colors.cardElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  previewSportText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.accent,
    includeFontPadding: false
  },
  previewModeText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 9,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  previewTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 14,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  previewVenue: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 3,
    includeFontPadding: false
  },
  previewTime: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    includeFontPadding: false
  },
  previewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border
  },
  previewFooterLabel: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 9,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  previewFooterPrice: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 14,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  previewQuotaBadge: {
    backgroundColor: THEME.colors.cardElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  previewQuotaText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 10,
    color: THEME.colors.success,
    includeFontPadding: false
  },

  // Bottom Sticky CTA (Figma 194:87)
  bottomCtaBtn: {
    height: 50,
    backgroundColor: THEME.colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18
  },
  bottomCtaDisabled: {
    opacity: 0.6
  },
  submittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  bottomCtaText: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 13,
    color: THEME.colors.textOnPrimary,
    includeFontPadding: false
  }
});
