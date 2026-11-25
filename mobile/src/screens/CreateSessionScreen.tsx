import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../theme';
import { MainTabScreenProps } from '../navigation/types';
import CustomAlertModal, { AlertType } from '../components/CustomAlertModal';
import { BentoCard, CustomButton, InputForm, QuotaPips, StatusBadge } from '../components';
import { api, ApiVenue } from '../services/api';
import { useAuthStore } from '../store/authStore';

type Props = MainTabScreenProps<'Create'>;

type SportType = 'Futsal' | 'Badminton' | 'Basket' | 'MLBB';
type MatchFormat = 'balanced' | 'casual';
type VisibilityType = 'public' | 'private';

interface DayOption {
  offset: number;
  label: string;
  dateStr: string;
}

function getDayOptions(): DayOption[] {
  const options: DayOption[] = [];
  const now = new Date();
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ];

  for (let i = 0; i < 4; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);

    let label = `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]}`;
    if (i === 0) label = `Hari Ini (${d.getDate()} ${monthNames[d.getMonth()]})`;
    else if (i === 1) label = `Besok (${d.getDate()} ${monthNames[d.getMonth()]})`;

    options.push({
      offset: i,
      label,
      dateStr: `${d.getDate()} ${monthNames[d.getMonth()]}`
    });
  }
  return options;
}

const TIME_SLOTS = [
  '07:00', '09:00', '15:00', '16:00',
  '17:00', '18:00', '19:00', '20:00', '21:00'
];

export default function CreateSessionScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);

  // Live Venues State
  const [venuesList, setVenuesList] = useState<ApiVenue[]>([]);
  const [isLoadingVenues, setIsLoadingVenues] = useState(true);

  // Step 1: Info & Format State
  const [title, setTitle] = useState('');
  const [sport, setSport] = useState<SportType>('Futsal');
  const [matchFormat, setMatchFormat] = useState<MatchFormat>('balanced');
  const [quota, setQuota] = useState(10);
  const [visibility, setVisibility] = useState<VisibilityType>('public');

  // Step 2: Lokasi, Jadwal & Biaya State
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [isCustomVenue, setIsCustomVenue] = useState(false);
  const [customVenueName, setCustomVenueName] = useState('');
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);
  const [selectedTime, setSelectedTime] = useState('19:00');
  const [durationHours, setDurationHours] = useState(2);
  const [totalCost, setTotalCost] = useState('200000');

  // Step 3: Aturan & Publish State
  const [minCreditScore, setMinCreditScore] = useState(70);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const dayOptions = getDayOptions();

  // Load venues on mount
  useEffect(() => {
    let isMounted = true;
    const loadVenues = async () => {
      try {
        setIsLoadingVenues(true);
        const list = await api.getVenues();
        if (!isMounted) return;
        setVenuesList(list);

        // Preselect venue if passed from route
        const preId = route.params?.preselectedVenueId;
        const preRate = route.params?.preselectedRate;
        if (preId) {
          setSelectedVenueId(preId);
          setIsCustomVenue(false);
          if (preRate) {
            setTotalCost((preRate * durationHours).toString());
          }
        } else if (list.length > 0) {
          setSelectedVenueId(list[0].id);
          setTotalCost((list[0].rate_hourly_min * durationHours).toString());
        }
      } catch (err) {
        console.warn('[CreateSessionScreen] Gagal memuat venue:', err);
      } finally {
        if (isMounted) setIsLoadingVenues(false);
      }
    };

    loadVenues();
    return () => {
      isMounted = false;
    };
  }, [route.params?.preselectedVenueId, route.params?.preselectedRate, durationHours]);

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

  const resetForm = () => {
    setStep(1);
    setTitle('');
    setSport('Futsal');
    setQuota(10);
    setMatchFormat('balanced');
    setVisibility('public');
    setSelectedDayOffset(0);
    setSelectedTime('19:00');
    setDurationHours(2);
    setMinCreditScore(70);
    if (venuesList.length > 0) {
      setSelectedVenueId(venuesList[0].id);
      setIsCustomVenue(false);
      setTotalCost((venuesList[0].rate_hourly_min * 2).toString());
    }
  };

  // Quota stepper controls
  const handleDecrementQuota = () => {
    const minQuota = sport === 'Badminton' ? 2 : sport === 'MLBB' ? 2 : 4;
    const stepVal = sport === 'MLBB' ? 1 : 2;
    if (quota > minQuota) setQuota(quota - stepVal);
  };

  const handleIncrementQuota = () => {
    const maxQuota = sport === 'Badminton' ? 8 : sport === 'MLBB' ? 10 : 20;
    const stepVal = sport === 'MLBB' ? 1 : 2;
    if (quota < maxQuota) setQuota(quota + stepVal);
  };

  // Handle Sport Selection
  const handleSelectSport = (newSport: SportType) => {
    setSport(newSport);
    if (newSport === 'Futsal') setQuota(10);
    else if (newSport === 'Badminton') setQuota(4);
    else if (newSport === 'Basket') setQuota(10);
    else if (newSport === 'MLBB') setQuota(5);
  };

  // Cost calculations
  const parsedCost = parseInt(totalCost, 10) || 0;
  const splitPerPerson = quota > 0 ? Math.round(parsedCost / quota) : 0;

  // Selected venue object
  const selectedVenue = venuesList.find((v) => v.id === selectedVenueId);
  const resolvedVenueName = isCustomVenue
    ? customVenueName || 'Lapangan Kustom'
    : selectedVenue?.name || 'Venue Lapangan';

  // Handle venue selection
  const handleSelectVenue = (venue: ApiVenue) => {
    setSelectedVenueId(venue.id);
    setIsCustomVenue(false);
    if (venue.rate_hourly_min > 0) {
      setTotalCost((venue.rate_hourly_min * durationHours).toString());
    }
  };

  // Handle Step Navigation
  const handleNextStep = () => {
    if (step === 1) {
      if (!title.trim()) {
        showAlert('warning', 'Judul Wajib Diisi', 'Silakan masukkan nama atau judul sesi mabar.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (isCustomVenue && !customVenueName.trim()) {
        showAlert('warning', 'Lokasi Wajib Diisi', 'Silakan masukkan nama lapangan atau alamat venue.');
        return;
      }
      if (!isCustomVenue && !selectedVenueId) {
        showAlert('warning', 'Pilih Venue', 'Silakan pilih lapangan rekanan atau gunakan opsi lapangan custom.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      handlePublishSession();
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.navigate('Explore');
    }
  };

  // Publish session to Supabase live
  const handlePublishSession = async () => {
    if (!user?.id) {
      showAlert(
        'warning',
        'Wajib Masuk Akun',
        'Kamu perlu masuk ke akun terlebih dahulu sebelum membuat sesi mabar.',
        () => {
          closeAlert();
          navigation.navigate('Auth');
        }
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Hitung ISO Timestamp start_time
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + selectedDayOffset);
      const [hStr, mStr] = selectedTime.split(':');
      targetDate.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);
      const startTimeIso = targetDate.toISOString();

      // 2. Kirim payload create session
      const newSession = await api.createSession({
        host_id: user.id,
        title: title.trim(),
        activity_type: sport,
        session_category: sport === 'MLBB' ? 'esports' : 'sports',
        session_mode: selectedDayOffset === 0 ? 'play_now' : 'scheduled',
        venue_id: isCustomVenue ? null : selectedVenueId,
        custom_location: isCustomVenue ? customVenueName.trim() : null,
        start_time: startTimeIso,
        duration_minutes: durationHours * 60,
        max_slots: quota,
        min_credit_score: minCreditScore,
        team_format: matchFormat === 'balanced' ? '2_teams' : 'free_for_all',
        estimated_cost_total: parsedCost
      });

      // 3. Daftarkan host di Slot 1
      try {
        await api.joinSession(newSession.id, user.id);
      } catch (jErr) {
        console.warn('[CreateSessionScreen] Catatan auto-join host:', jErr);
      }

      // 4. Alert sukses dan redirect ke Lobby
      showAlert(
        'success',
        'Sesi Berhasil Dibuat! 🚀',
        `Sesi "${newSession.title}" telah aktif dan live di radar Explore. Kamu telah terdaftar sebagai Host di Slot #1.`,
        () => {
          closeAlert();
          resetForm();
          navigation.navigate('Lobby', {
            sessionId: newSession.id,
            sessionTitle: newSession.title
          });
        }
      );
    } catch (err: any) {
      showAlert(
        'error',
        'Gagal Mempublikasikan Sesi',
        err?.message || 'Terjadi kesalahan sistem saat membuat sesi mabar.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepSubtitles = [
    'Info & format pertandingan',
    'Lokasi lapangan & jadwal kickoff',
    'Konfirmasi & publikasi sesi'
  ];

  // If user is not authenticated
  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.wizardTopBar}>
          <TouchableOpacity
            style={styles.closeBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Explore')}
          >
            <Text style={styles.closeBtnIcon}>✕</Text>
          </TouchableOpacity>
          <View style={styles.wizardTitleBox}>
            <Text style={styles.wizardTitle}>Buat Sesi Mabar</Text>
            <Text style={styles.wizardSubtitle}>Autentikasi Akun Host</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.authPromptContainer}>
          <Text style={styles.authPromptIcon}>🔒</Text>
          <Text style={styles.authPromptTitle}>Masuk untuk Menjadi Host</Text>
          <Text style={styles.authPromptSubtitle}>
            Kamu perlu masuk ke akun Mabar terlebih dahulu untuk membuat sesi, membagikan tim otomatis, dan mengelola deposit patungan.
          </Text>
          <TouchableOpacity
            style={styles.authBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Auth')}
          >
            <Text style={styles.authBtnText}>Masuk ke Akun Sekarang ➔</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Wizard Top Bar */}
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

        <StatusBadge label={`STEP ${step}/3`} variant="brand" tone="solid" size="sm" />
      </View>

      {/* Stepper Progress Bar */}
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
              <InputForm
                value={title}
                onChangeText={setTitle}
                placeholder="Contoh: Futsal Santai Akhir Pekan 5v5"
                maxLength={50}
              />
            </View>

            {/* Field: Pilih Cabor */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldEyebrow}>PILIH CABANG OLAHRAGA / GAME</Text>
                <StatusBadge label="MULTI-SPORT" variant="neutral" size="sm" />
              </View>
              <View style={styles.caborGrid}>
                {/* Futsal */}
                <TouchableOpacity
                  style={[
                    styles.caborCard,
                    sport === 'Futsal' && styles.caborCardActive
                  ]}
                  activeOpacity={0.8}
                  onPress={() => handleSelectSport('Futsal')}
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
                  onPress={() => handleSelectSport('Badminton')}
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
                  onPress={() => handleSelectSport('Basket')}
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
                  onPress={() => handleSelectSport('MLBB')}
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

            {/* Field: Format Match */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldEyebrow}>FORMAT PERTANDINGAN</Text>
                <StatusBadge label="AI BALANCED" variant="brand" tone="solid" size="sm" />
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
                    2 Tim ({Math.floor(quota / 2)}v{Math.floor(quota / 2)} Seimbang)
                  </Text>
                  <Text style={styles.formatDesc}>
                    Tim dibagi rata otomatis saat slot penuh.
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
                    Pemain bebas atur dan tukar tim sendiri.
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Field: Target Kuota Pemain */}
            <BentoCard eyebrow="TARGET KUOTA PEMAIN">
              <View style={styles.quotaRow}>
                <View>
                  <Text style={styles.quotaValue}>{quota} Slot</Text>
                  <Text style={styles.quotaHint}>
                    {Math.floor(quota / 2)} vs {Math.floor(quota / 2)} pemain
                  </Text>
                </View>
                <View style={styles.stepperControls}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    activeOpacity={0.7}
                    onPress={handleDecrementQuota}
                  >
                    <Text style={styles.stepperMinusIcon}>−</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.stepperBtn, styles.stepperBtnPlus]}
                    activeOpacity={0.7}
                    onPress={handleIncrementQuota}
                  >
                    <Text style={styles.stepperPlusIcon}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <QuotaPips
                filled={quota}
                total={quota}
                variant={sport === 'Badminton' ? 'badminton' : 'futsal'}
                label={`${quota} SLOT TOTAL`}
                showCount={false}
                groups={2}
              />
            </BentoCard>

            {/* Field: Visibilitas Lobi */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldEyebrow}>VISIBILITAS LOBI</Text>
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
                    <Text style={styles.visibilityDesc}>Tampil di feed Explore</Text>
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
                    <Text style={styles.visibilityDesc}>Khusus teman undangan</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* STEP 2: Lokasi, Jadwal & Biaya */}
        {step === 2 && (
          <View style={styles.stepBody}>
            {/* Field: Pilih Venue Lapangan */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldEyebrow}>LOKASI & VENUE LAPANGAN</Text>
                {isLoadingVenues && <ActivityIndicator size="small" color={THEME.colors.primary} />}
              </View>

              {/* Daftar Venue dari Database */}
              <View style={styles.venueChipsColumn}>
                {venuesList.map((v) => {
                  const isSelected = !isCustomVenue && selectedVenueId === v.id;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[
                        styles.venueCardSelect,
                        isSelected && styles.venueCardSelectActive
                      ]}
                      activeOpacity={0.8}
                      onPress={() => handleSelectVenue(v)}
                    >
                      <View style={styles.venueCardLeft}>
                        <Text
                          style={[
                            styles.venueCardName,
                            isSelected && styles.venueCardNameActive
                          ]}
                          numberOfLines={1}
                        >
                          📍 {v.name}
                        </Text>
                        <Text style={styles.venueCardAddress} numberOfLines={1}>
                          {v.address}
                        </Text>
                      </View>
                      <View style={styles.venueCardRight}>
                        <Text style={styles.venueCardRate}>
                          Rp {v.rate_hourly_min.toLocaleString('id-ID')}/jam
                        </Text>
                        {isSelected && (
                          <View style={styles.checkBadge}>
                            <Text style={styles.checkBadgeText}>✓</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {/* Opsi Lokasi Custom */}
                <TouchableOpacity
                  style={[
                    styles.venueCardSelect,
                    isCustomVenue && styles.venueCardSelectActive
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setIsCustomVenue(true);
                    setSelectedVenueId(null);
                  }}
                >
                  <View style={styles.venueCardLeft}>
                    <Text
                      style={[
                        styles.venueCardName,
                        isCustomVenue && styles.venueCardNameActive
                      ]}
                    >
                      🏢 Lapangan Lainnya / Lokasi Kustom
                    </Text>
                    <Text style={styles.venueCardAddress}>
                      Ketik nama tempat atau lapangan sendiri
                    </Text>
                  </View>
                  {isCustomVenue && (
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkBadgeText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Input Custom Venue jika dipilih */}
              {isCustomVenue && (
                <View style={{ marginTop: 10 }}>
                  <InputForm
                    value={customVenueName}
                    onChangeText={setCustomVenueName}
                    placeholder="Contoh: Lapangan RW 05 Meruya"
                  />
                </View>
              )}
            </View>

            {/* Field: Jadwal Tanggal Kickoff */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldEyebrow}>PILIH HARI & TANGGAL</Text>
              <View style={styles.quickChipsGrid}>
                {dayOptions.map((d) => (
                  <TouchableOpacity
                    key={d.offset}
                    style={[
                      styles.quickChip,
                      selectedDayOffset === d.offset && styles.quickChipActive
                    ]}
                    onPress={() => setSelectedDayOffset(d.offset)}
                  >
                    <Text
                      style={[
                        styles.quickChipText,
                        selectedDayOffset === d.offset && styles.quickChipTextActive
                      ]}
                    >
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Field: Jam Kickoff */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldEyebrow}>WAKTU MULAI</Text>
                <Text style={styles.timeValueText}>{selectedTime} WIB</Text>
              </View>
              <View style={styles.quickChipsGrid}>
                {TIME_SLOTS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.quickChipTime,
                      selectedTime === t && styles.quickChipActive
                    ]}
                    onPress={() => setSelectedTime(t)}
                  >
                    <Text
                      style={[
                        styles.quickChipText,
                        selectedTime === t && styles.quickChipTextActive
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Field: Durasi Main */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldEyebrow}>DURASI PERTANDINGAN</Text>
              <View style={styles.durationRow}>
                {[1, 2, 3].map((dur) => (
                  <TouchableOpacity
                    key={dur}
                    style={[
                      styles.durationBtn,
                      durationHours === dur && styles.durationBtnActive
                    ]}
                    onPress={() => {
                      setDurationHours(dur);
                      if (selectedVenue && selectedVenue.rate_hourly_min > 0) {
                        setTotalCost((selectedVenue.rate_hourly_min * dur).toString());
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.durationBtnText,
                        durationHours === dur && styles.durationBtnTextActive
                      ]}
                    >
                      {dur} Jam
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Field: Total Biaya Sewa */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldEyebrow}>TOTAL BIAYA SEWA LAPANGAN</Text>
                <Text style={styles.freeHint}>Isi 0 jika gratis</Text>
              </View>
              <InputForm
                value={totalCost}
                onChangeText={setTotalCost}
                keyboardType="numeric"
                placeholder="200000"
                leftIcon="Rp"
              />
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
                  {parsedCost > 0 ? `Rp ${splitPerPerson.toLocaleString('id-ID')}` : 'Gratis'}
                </Text>
                {parsedCost > 0 && <Text style={styles.patunganCalcPerOrg}> / pemain</Text>}
              </View>
              <Text style={styles.patunganCalcNote}>
                Biaya patungan dibagi rata berdasarkan total biaya sewa dan target kuota slot pemain.
              </Text>
            </View>
          </View>
        )}

        {/* STEP 3: Aturan & Konfirmasi Publikasi */}
        {step === 3 && (
          <View style={styles.stepBody}>
            {/* Field: Min Credit Score */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldEyebrow}>MINIMAL CREDIT SCORE</Text>
                <Text style={styles.creditSelectedLabel}>
                  Credit {minCreditScore} · {minCreditScore >= 80 ? 'Disiplin' : 'Sportif'}
                </Text>
              </View>
              <View style={styles.creditQuickRow}>
                {[60, 70, 80, 90].map((k) => (
                  <TouchableOpacity
                    key={k}
                    style={[
                      styles.creditBtn,
                      minCreditScore === k && styles.creditBtnActive
                    ]}
                    onPress={() => setMinCreditScore(k)}
                  >
                    <Text
                      style={[
                        styles.creditBtnText,
                        minCreditScore === k && styles.creditBtnTextActive
                      ]}
                    >
                      {k}+
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.creditHelper}>
                Pemain dengan Credit Score di bawah batas ini tidak bisa bergabung.
              </Text>
            </View>

            {/* Ticket Preview Card */}
            <View style={styles.previewSection}>
              <Text style={styles.fieldEyebrow}>PRATINJAU SESI</Text>
              <BentoCard
                eyebrow={`${sport.toUpperCase()} · ${Math.floor(quota / 2)}v${Math.floor(quota / 2)}`}
                title={title || 'Sesi Mabar Baru'}
                subtitle={`${resolvedVenueName} · ${dayOptions[selectedDayOffset]?.dateStr} @ ${selectedTime} WIB`}
                accentColor={sport === 'MLBB' ? THEME.colors.accent : THEME.colors.primary}
                rightAccessory={
                  <StatusBadge
                    label={visibility === 'public' ? 'PUBLIK' : 'PRIVAT'}
                    variant={visibility === 'public' ? 'brand' : 'neutral'}
                    tone={visibility === 'public' ? 'solid' : 'soft'}
                    size="sm"
                  />
                }
                priceLabel="EST. PATUNGAN"
                priceValue={parsedCost > 0 ? `Rp ${splitPerPerson.toLocaleString('id-ID')} / org` : 'Gratis'}
              >
                <QuotaPips
                  filled={1}
                  total={quota}
                  variant={sport === 'Badminton' ? 'badminton' : 'futsal'}
                  label="HOST LANGSUNG MASUK DI SLOT #1"
                  groups={2}
                />
              </BentoCard>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom CTA */}
      <View style={[styles.footerBar, { paddingBottom: Math.max(insets.bottom + 8, 14) }]}>
        <CustomButton
          label={
            isSubmitting
              ? 'Membuat Sesi...'
              : step === 1
              ? 'Lanjut · Lokasi & Biaya ➔'
              : step === 2
              ? 'Lanjut · Konfirmasi ➔'
              : 'Buat Sesi'
          }
          disabled={isSubmitting}
          loading={isSubmitting}
          onPress={handleNextStep}
        />
      </View>

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
    paddingBottom: 28
  },
  wizardTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: THEME.colors.background
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeBtnIcon: {
    color: THEME.colors.text,
    fontSize: 16,
    fontFamily: THEME.typography.fonts.semiBold,
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
  stepperBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 6,
    marginVertical: 8
  },
  stepSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: THEME.colors.cardElevated
  },
  stepSegmentActive: {
    backgroundColor: THEME.colors.primary
  },
  stepBody: {
    gap: 16
  },
  fieldSection: {
    gap: 8
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  fieldEyebrow: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 11,
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
  timeValueText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  freeHint: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  caborGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  caborCard: {
    width: '48%',
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: THEME.radius.lg,
    padding: 14,
    gap: 6
  },
  caborCardActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primaryMuted
  },
  caborCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  caborTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 14,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  caborTitleActive: {
    color: THEME.colors.primary
  },
  caborSubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  checkBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkBadgeText: {
    color: THEME.colors.background,
    fontSize: 11,
    fontFamily: THEME.typography.fonts.bold,
    includeFontPadding: false
  },
  formatRow: {
    flexDirection: 'row',
    gap: 10
  },
  formatCard: {
    flex: 1,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: THEME.radius.lg,
    padding: 12,
    gap: 4
  },
  formatCardActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primaryMuted
  },
  formatTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  formatTitleActive: {
    color: THEME.colors.primary
  },
  formatDesc: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    lineHeight: 14,
    includeFontPadding: false
  },
  quotaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  quotaValue: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 28,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  quotaHint: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  stepperControls: {
    flexDirection: 'row',
    gap: 10
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepperBtnPlus: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary
  },
  stepperMinusIcon: {
    fontSize: 22,
    color: THEME.colors.text,
    fontFamily: THEME.typography.fonts.bold,
    includeFontPadding: false
  },
  stepperPlusIcon: {
    fontSize: 20,
    color: THEME.colors.background,
    fontFamily: THEME.typography.fonts.bold,
    includeFontPadding: false
  },
  visibilityStatusText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 10,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  visibilityRow: {
    flexDirection: 'row',
    gap: 10
  },
  visibilityCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: THEME.radius.lg,
    padding: 12,
    gap: 10
  },
  visibilityCardActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primaryMuted
  },
  visibilityIcon: {
    fontSize: 20
  },
  visibilityTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  visibilityTitleActive: {
    color: THEME.colors.primary
  },
  visibilityDesc: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  venueChipsColumn: {
    gap: 8
  },
  venueCardSelect: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  venueCardSelectActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primaryMuted
  },
  venueCardLeft: {
    flex: 1,
    marginRight: 10,
    gap: 2
  },
  venueCardName: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  venueCardNameActive: {
    color: THEME.colors.primary
  },
  venueCardAddress: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  venueCardRight: {
    alignItems: 'flex-end',
    gap: 4
  },
  venueCardRate: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 10,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  quickChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder
  },
  quickChipTime: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    minWidth: 64,
    alignItems: 'center'
  },
  quickChipActive: {
    backgroundColor: THEME.colors.primaryMuted,
    borderColor: THEME.colors.primary
  },
  quickChipText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  quickChipTextActive: {
    fontFamily: THEME.typography.fonts.bold,
    color: THEME.colors.primary
  },
  durationRow: {
    flexDirection: 'row',
    gap: 10
  },
  durationBtn: {
    flex: 1,
    height: 42,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center'
  },
  durationBtnActive: {
    backgroundColor: THEME.colors.primaryMuted,
    borderColor: THEME.colors.primary
  },
  durationBtnText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  durationBtnTextActive: {
    fontFamily: THEME.typography.fonts.bold,
    color: THEME.colors.primary
  },
  patunganCalcCard: {
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: THEME.radius.lg,
    padding: 16
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
    fontSize: 11,
    color: THEME.colors.textMuted,
    lineHeight: 15,
    includeFontPadding: false
  },
  creditSelectedLabel: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.warning,
    includeFontPadding: false
  },
  creditQuickRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6
  },
  creditBtn: {
    flex: 1,
    height: 44,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center'
  },
  creditBtnActive: {
    backgroundColor: THEME.colors.primaryMuted,
    borderColor: THEME.colors.primary
  },
  creditBtnText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  creditBtnTextActive: {
    color: THEME.colors.primary
  },
  creditHelper: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    lineHeight: 15,
    color: THEME.colors.textMuted,
    marginTop: 4,
    includeFontPadding: false
  },
  previewSection: {
    marginTop: 8,
    gap: 8
  },
  footerBar: {
    paddingHorizontal: THEME.spatial.screenPaddingHorizontal,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: THEME.colors.card,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.cardBorder
  },
  authPromptContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12
  },
  authPromptIcon: {
    fontSize: 48,
    marginBottom: 8
  },
  authPromptTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 18,
    color: THEME.colors.text,
    textAlign: 'center',
    includeFontPadding: false
  },
  authPromptSubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 12,
    includeFontPadding: false
  },
  authBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  authBtnText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13,
    color: THEME.colors.background,
    includeFontPadding: false
  }
});
