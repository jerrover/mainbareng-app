import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Pressable
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Rect, Polygon } from 'react-native-svg';
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
  shortDay: string;
  dateNum: string;
  monthShort: string;
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

    const shortDay = i === 0 ? 'Hari Ini' : i === 1 ? 'Besok' : dayNames[d.getDay()];
    const dateNum = String(d.getDate());
    const monthShort = monthNames[d.getMonth()];

    options.push({
      offset: i,
      shortDay,
      dateNum,
      monthShort,
      dateStr: `${dateNum} ${monthShort}`
    });
  }
  return options;
}

const TIME_SLOTS = [
  '07:00', '09:00', '12:00', '15:00', '16:00',
  '17:00', '18:00', '19:00', '20:00', '21:00'
];

function isTimeSlotPast(timeStr: string, dayOffset: number): boolean {
  if (dayOffset > 0) return false;
  const now = new Date();
  const [hStr, mStr] = timeStr.split(':');
  const slotMinutes = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return slotMinutes <= nowMinutes;
}

interface SportConfig {
  id: SportType;
  label: string;
  subtitle: string;
  color: string;
  softBg: string;
  borderColor: string;
  defaultQuota: number;
  minQuota: number;
  maxQuota: number;
  stepQuota: number;
  presets: Array<{ label: string; quota: number }>;
}

const SPORT_CONFIGS: Record<SportType, SportConfig> = {
  Futsal: {
    id: 'Futsal',
    label: 'Futsal',
    subtitle: 'Vinyl & Rumput Sintetis',
    color: THEME.colors.primary,
    softBg: THEME.colors.primaryMuted,
    borderColor: THEME.colors.primaryBorder,
    defaultQuota: 10,
    minQuota: 4,
    maxQuota: 20,
    stepQuota: 2,
    presets: [
      { label: '4v4', quota: 8 },
      { label: '5v5', quota: 10 },
      { label: '7v7', quota: 14 }
    ]
  },
  Badminton: {
    id: 'Badminton',
    label: 'Badminton',
    subtitle: 'Ganda & Tunggal',
    color: THEME.colors.success,
    softBg: THEME.colors.successSoft,
    borderColor: THEME.colors.successBorder,
    defaultQuota: 4,
    minQuota: 2,
    maxQuota: 8,
    stepQuota: 2,
    presets: [
      { label: '1v1', quota: 2 },
      { label: '2v2', quota: 4 },
      { label: 'Rotasi 6', quota: 6 }
    ]
  },
  Basket: {
    id: 'Basket',
    label: 'Basket',
    subtitle: '3v3 Half / 5v5 Full',
    color: THEME.colors.warning,
    softBg: THEME.colors.warningSoft,
    borderColor: THEME.colors.warningBorder,
    defaultQuota: 10,
    minQuota: 4,
    maxQuota: 14,
    stepQuota: 2,
    presets: [
      { label: '3v3', quota: 6 },
      { label: '4v4', quota: 8 },
      { label: '5v5', quota: 10 }
    ]
  },
  MLBB: {
    id: 'MLBB',
    label: 'MLBB',
    subtitle: 'Esports 5-Man / Custom',
    color: THEME.colors.accent,
    softBg: THEME.colors.accentSoft,
    borderColor: THEME.colors.accentBorder,
    defaultQuota: 5,
    minQuota: 2,
    maxQuota: 10,
    stepQuota: 1,
    presets: [
      { label: 'Trio', quota: 3 },
      { label: '5-Man', quota: 5 },
      { label: '5v5', quota: 10 }
    ]
  }
};

const SPORT_LIST: SportType[] = ['Futsal', 'Badminton', 'Basket', 'MLBB'];

// --- MONOCHROME VECTOR ICONS ---
function CloseIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ArrowLeftIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19L5 12L12 5" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CheckIcon({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17L4 12" stroke={color} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MapPinIcon({ color, size = 15 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 5.02944 7.02944 1 12 1C16.9706 1 21 5.02944 21 10Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function GlobeIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Path d="M2 12H22" stroke={color} strokeWidth={1.8} />
      <Path
        d="M12 2C14.5 4.74 15.92 8.29 16 12C15.92 15.71 14.5 19.26 12 22C9.5 19.26 8.08 15.71 8 12C8.08 8.29 9.5 4.74 12 2Z"
        stroke={color}
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function LockIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth={2} />
      <Path d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function SearchIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth={2} />
      <Path d="M21 21L16.65 16.65" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function ChevronRightIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18L15 12L9 6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ShieldIcon({ color, size = 15 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SportVectorIcon({ sport, color, size = 18 }: { sport: SportType; color: string; size?: number }) {
  if (sport === 'Futsal') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth={2} />
        <Polygon points="12,7 16,10 14.5,15 9.5,15 8,10" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      </Svg>
    );
  }
  if (sport === 'Badminton') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M6 18L11 13" stroke={color} strokeWidth={2} strokeLinecap="round" />
        <Path d="M10 14L17 4L20 7L13 17L10 14Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
        <Circle cx="5.5" cy="18.5" r="2" stroke={color} strokeWidth={1.8} />
      </Svg>
    );
  }
  if (sport === 'Basket') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth={2} />
        <Path d="M2.5 12H21.5M12 2.5V21.5" stroke={color} strokeWidth={1.6} />
        <Path d="M5.5 5.5C8.5 8.5 8.5 15.5 5.5 18.5M18.5 5.5C15.5 8.5 15.5 15.5 18.5 18.5" stroke={color} strokeWidth={1.6} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="6" width="20" height="12" rx="4" stroke={color} strokeWidth={2} />
      <Line x1="6" y1="12" x2="10" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="8" y1="10" x2="8" y2="14" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="15.5" cy="10.5" r="1" fill={color} />
      <Circle cx="17.5" cy="13.5" r="1" fill={color} />
    </Svg>
  );
}

export default function CreateSessionScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);

  // Live Venues State
  const [venuesList, setVenuesList] = useState<ApiVenue[]>([]);
  const [isLoadingVenues, setIsLoadingVenues] = useState(true);
  const [venueLoadError, setVenueLoadError] = useState(false);
  const [isVenueSheetOpen, setIsVenueSheetOpen] = useState(false);
  const [venueSearch, setVenueSearch] = useState('');
  const [venueFilterSportOnly, setVenueFilterSportOnly] = useState(true);

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

  const dayOptions = useMemo(() => getDayOptions(), []);
  const activeSportConfig = SPORT_CONFIGS[sport];

  // Auto-advance selectedTime if Hari Ini and selectedTime is already past
  useEffect(() => {
    if (selectedDayOffset === 0 && isTimeSlotPast(selectedTime, 0)) {
      const nextAvailable = TIME_SLOTS.find((t) => !isTimeSlotPast(t, 0));
      if (nextAvailable) {
        setSelectedTime(nextAvailable);
      } else {
        // All slots today have passed -> default to Besok 19:00
        setSelectedDayOffset(1);
        setSelectedTime('19:00');
      }
    }
  }, [selectedDayOffset, selectedTime]);

  // Load venues on mount / preselected route param
  const fetchVenues = async (isMountedCheck?: () => boolean) => {
    try {
      setIsLoadingVenues(true);
      setVenueLoadError(false);
      const list = await api.getVenues();
      if (isMountedCheck && !isMountedCheck()) return;
      setVenuesList(list);

      const preId = route.params?.preselectedVenueId;
      const preRate = route.params?.preselectedRate;
      if (preId) {
        setSelectedVenueId(preId);
        setIsCustomVenue(false);
        if (preRate) {
          setTotalCost((preRate * durationHours).toString());
        }
      } else if (list.length > 0) {
        setSelectedVenueId((prev) => prev || list[0].id);
        setTotalCost((prev) => prev || (list[0].rate_hourly_min * durationHours).toString());
      }
    } catch (err) {
      console.warn('[CreateSessionScreen] Gagal memuat venue:', err);
      if (!isMountedCheck || isMountedCheck()) {
        setVenueLoadError(true);
      }
    } finally {
      if (!isMountedCheck || isMountedCheck()) {
        setIsLoadingVenues(false);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetchVenues(() => isMounted);
    return () => {
      isMounted = false;
    };
  }, [route.params?.preselectedVenueId, route.params?.preselectedRate]);

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
    if (quota > activeSportConfig.minQuota) {
      setQuota(quota - activeSportConfig.stepQuota);
    }
  };

  const handleIncrementQuota = () => {
    if (quota < activeSportConfig.maxQuota) {
      setQuota(quota + activeSportConfig.stepQuota);
    }
  };

  // Handle Sport Selection
  const handleSelectSport = (newSport: SportType) => {
    setSport(newSport);
    setQuota(SPORT_CONFIGS[newSport].defaultQuota);

    if (newSport === 'MLBB') {
      setIsCustomVenue(true);
      setSelectedVenueId(null);
      if (!customVenueName.trim()) {
        setCustomVenueName('Online · Discord / Room Custom');
      }
      setTotalCost('0');
    } else {
      const matchingVenue = venuesList.find((v) =>
        v.supported_activities?.some((a) => a.toLowerCase().includes(newSport.toLowerCase()))
      );
      if (matchingVenue) {
        setIsCustomVenue(false);
        setSelectedVenueId(matchingVenue.id);
        if (matchingVenue.rate_hourly_min > 0) {
          setTotalCost((matchingVenue.rate_hourly_min * durationHours).toString());
        }
      }
    }
  };

  // Cost calculations
  const parsedCost = parseInt(totalCost, 10) || 0;
  const splitPerPerson = quota > 0 ? Math.round(parsedCost / quota) : 0;

  // Selected venue object
  const selectedVenue = venuesList.find((v) => v.id === selectedVenueId);
  const resolvedVenueName = isCustomVenue
    ? customVenueName.trim() || 'Lokasi Kustom'
    : selectedVenue?.name || 'Venue Lapangan';

  // Filtered venues for bottom sheet
  const filteredVenues = useMemo(() => {
    const q = venueSearch.trim().toLowerCase();
    return venuesList.filter((v) => {
      const matchesSport =
        !venueFilterSportOnly ||
        sport === 'MLBB' ||
        v.supported_activities?.some((a) => a.toLowerCase().includes(sport.toLowerCase()));
      const matchesSearch =
        !q ||
        v.name.toLowerCase().includes(q) ||
        v.address.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q);
      return matchesSport && matchesSearch;
    });
  }, [venuesList, venueFilterSportOnly, sport, venueSearch]);

  // Handle venue selection
  const handleSelectVenue = (venue: ApiVenue) => {
    setSelectedVenueId(venue.id);
    setIsCustomVenue(false);
    if (venue.rate_hourly_min > 0) {
      setTotalCost((venue.rate_hourly_min * durationHours).toString());
    }
    setIsVenueSheetOpen(false);
  };

  // Format team label cleanly
  const teamFormatLabel = useMemo(() => {
    if (matchFormat === 'casual') return 'Casual';
    if (quota % 2 === 0) return `${quota / 2}v${quota / 2}`;
    return `${quota}P Party`;
  }, [matchFormat, quota]);

  // Handle Step Navigation
  const handleNextStep = () => {
    if (step === 1) {
      if (!title.trim()) {
        showAlert('warning', 'Judul Wajib Diisi', 'Masukkan nama atau judul sesi mabar dulu.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (isCustomVenue && !customVenueName.trim()) {
        showAlert('warning', 'Lokasi Wajib Diisi', 'Masukkan nama lapangan, alamat, atau info room.');
        return;
      }
      if (!isCustomVenue && !selectedVenueId) {
        showAlert('warning', 'Pilih Venue', 'Pilih lapangan rekanan atau gunakan lokasi kustom.');
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
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + selectedDayOffset);
      const [hStr, mStr] = selectedTime.split(':');
      targetDate.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);
      const startTimeIso = targetDate.toISOString();

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

      try {
        await api.joinSession(newSession.id, user.id);
      } catch (jErr) {
        console.warn('[CreateSessionScreen] Catatan auto-join host:', jErr);
      }

      showAlert(
        'success',
        'Sesi Berhasil Dibuat',
        `Sesi "${newSession.title}" sudah aktif di Explore. Kamu otomatis terdaftar sebagai Host di Slot #1.`,
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
    'Lokasi, jadwal & patungan',
    'Aturan & konfirmasi akhir'
  ];

  const creditTierMeta =
    minCreditScore >= 90
      ? { label: 'Elit', color: THEME.colors.success }
      : minCreditScore >= 80
      ? { label: 'Disiplin', color: THEME.colors.primary }
      : minCreditScore >= 70
      ? { label: 'Sportif', color: THEME.colors.warning }
      : { label: 'Terbuka', color: THEME.colors.textSecondary };

  // Unauthenticated State
  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.wizardTopBar}>
          <TouchableOpacity
            style={styles.closeBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Explore')}
          >
            <CloseIcon color={THEME.colors.text} size={16} />
          </TouchableOpacity>
          <View style={styles.wizardTitleBox}>
            <Text style={styles.wizardTitle}>Buat Sesi Mabar</Text>
            <Text style={styles.wizardSubtitle}>Autentikasi Akun Host</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.authPromptContainer}>
          <View style={styles.authLockCircle}>
            <LockIcon color={THEME.colors.primary} size={28} />
          </View>
          <Text style={styles.authPromptTitle}>Masuk untuk Jadi Host</Text>
          <Text style={styles.authPromptSubtitle}>
            Masuk ke akun Mabar dulu untuk membuat sesi, membagi tim otomatis, dan mengatur patungan lapangan.
          </Text>
          <TouchableOpacity
            style={styles.authBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Auth')}
          >
            <Text style={styles.authBtnText}>Masuk ke Akun</Text>
            <ChevronRightIcon color={THEME.colors.textOnPrimary} size={16} />
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
          accessibilityLabel={step === 1 ? 'Tutup' : 'Kembali'}
        >
          {step === 1 ? (
            <CloseIcon color={THEME.colors.text} size={16} />
          ) : (
            <ArrowLeftIcon color={THEME.colors.text} size={16} />
          )}
        </TouchableOpacity>

        <View style={styles.wizardTitleBox}>
          <Text style={styles.wizardTitle}>Buat Sesi Mabar</Text>
          <Text style={styles.wizardSubtitle}>{stepSubtitles[step - 1]}</Text>
        </View>

        <View style={[styles.stepPill, { borderColor: THEME.colors.primaryBorder, backgroundColor: THEME.colors.primaryMuted }]}>
          <Text style={[styles.stepPillText, { color: THEME.colors.primary }]}>
            {step} / 3
          </Text>
        </View>
      </View>

      {/* Stepper Progress Bar */}
      <View style={styles.stepperBar}>
        {[1, 2, 3].map((idx) => (
          <View
            key={idx}
            style={[
              styles.stepSegment,
              step >= idx && { backgroundColor: THEME.colors.primary }
            ]}
          />
        ))}
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* STEP 1: Info & Format */}
        {step === 1 && (
          <View style={styles.stepBody}>
            {/* Judul Sesi */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldEyebrow}>JUDUL SESI</Text>
                <Text style={styles.charCounter}>{title.length} / 50</Text>
              </View>
              <InputForm
                value={title}
                onChangeText={setTitle}
                placeholder={
                  sport === 'MLBB'
                    ? 'Contoh: Push Rank Mythic 5-Man Malam'
                    : `Contoh: ${sport} Santai Akhir Pekan`
                }
                maxLength={50}
              />
            </View>

            {/* Pilih Cabor (Horizontal Sport Pills) */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldEyebrow}>CABANG OLAHRAGA</Text>
              <View style={styles.sportPillsRow}>
                {SPORT_LIST.map((item) => {
                  const cfg = SPORT_CONFIGS[item];
                  const active = sport === item;
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.sportPill,
                        active && {
                          backgroundColor: THEME.colors.primary,
                          borderColor: THEME.colors.primary
                        }
                      ]}
                      activeOpacity={0.82}
                      onPress={() => handleSelectSport(item)}
                    >
                      <SportVectorIcon
                        sport={item}
                        color={active ? THEME.colors.textOnPrimary : cfg.color}
                        size={14}
                      />
                      <Text
                        style={[
                          styles.sportPillText,
                          active && { color: THEME.colors.textOnPrimary, fontFamily: THEME.typography.fonts.bold }
                        ]}
                        numberOfLines={1}
                      >
                        {cfg.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.sectionDivider} />

            {/* Estimasi Jumlah Pemain (Hero Focal Card) */}
            <BentoCard eyebrow="ESTIMASI JUMLAH PEMAIN" accentColor={THEME.colors.primary}>
              <View style={styles.quotaRow}>
                <View>
                  <View style={styles.quotaNumRow}>
                    <Text style={styles.quotaValue}>{quota}</Text>
                    <Text style={styles.quotaUnit}>Slot</Text>
                  </View>
                  <Text style={styles.quotaHint}>
                    {quota % 2 === 0
                      ? `${quota / 2} vs ${quota / 2} pemain`
                      : `${quota} pemain dalam 1 lobi`}
                  </Text>
                </View>

                <View style={styles.stepperControls}>
                  <TouchableOpacity
                    style={[
                      styles.stepperBtn,
                      quota <= activeSportConfig.minQuota && styles.stepperBtnDisabled
                    ]}
                    activeOpacity={0.7}
                    onPress={handleDecrementQuota}
                    disabled={quota <= activeSportConfig.minQuota}
                  >
                    <Text style={styles.stepperMinusIcon}>−</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.stepperBtn,
                      {
                        backgroundColor: THEME.colors.primary,
                        borderColor: THEME.colors.primary
                      },
                      quota >= activeSportConfig.maxQuota && styles.stepperBtnDisabled
                    ]}
                    activeOpacity={0.7}
                    onPress={handleIncrementQuota}
                    disabled={quota >= activeSportConfig.maxQuota}
                  >
                    <Text style={styles.stepperPlusIcon}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Quick Presets */}
              <View style={styles.presetRow}>
                {activeSportConfig.presets.map((preset) => {
                  const isPresetActive = quota === preset.quota;
                  return (
                    <TouchableOpacity
                      key={preset.label}
                      style={[
                        styles.presetChip,
                        isPresetActive && {
                          borderColor: THEME.colors.primary,
                          backgroundColor: THEME.colors.primaryMuted
                        }
                      ]}
                      activeOpacity={0.8}
                      onPress={() => setQuota(preset.quota)}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          isPresetActive && { color: THEME.colors.primary }
                        ]}
                      >
                        {preset.label} · {preset.quota}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <QuotaPips
                filled={quota}
                total={quota}
                variant={sport === 'Badminton' ? 'badminton' : 'futsal'}
                label={`${quota} SLOT TOTAL`}
                showCount={false}
                groups={quota % 2 === 0 ? 2 : 1}
              />
            </BentoCard>

            {/* Format Pertandingan (Segmented Control) */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldEyebrow}>FORMAT TIM</Text>
              <View style={styles.segmentedTrack}>
                <TouchableOpacity
                  style={[
                    styles.segmentedThumb,
                    matchFormat === 'balanced' && {
                      backgroundColor: THEME.colors.primaryMuted,
                      borderColor: THEME.colors.primaryBorder
                    }
                  ]}
                  activeOpacity={0.85}
                  onPress={() => setMatchFormat('balanced')}
                >
                  <Text
                    style={[
                      styles.segmentedText,
                      matchFormat === 'balanced' && { color: THEME.colors.primary }
                    ]}
                  >
                    {quota % 2 === 0 ? `${quota / 2}v${quota / 2} Seimbang` : 'Auto Seimbang'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segmentedThumb,
                    matchFormat === 'casual' && {
                      backgroundColor: THEME.colors.primaryMuted,
                      borderColor: THEME.colors.primaryBorder
                    }
                  ]}
                  activeOpacity={0.85}
                  onPress={() => setMatchFormat('casual')}
                >
                  <Text
                    style={[
                      styles.segmentedText,
                      matchFormat === 'casual' && { color: THEME.colors.primary }
                    ]}
                  >
                    Casual / Bebas
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.fieldHelperText}>
                {matchFormat === 'balanced'
                  ? 'Tim dibagi rata otomatis berdasarkan OVR pemain saat lobi di-split.'
                  : 'Pemain bebas memilih dan bertukar tim sendiri di dalam lobi.'}
              </Text>
            </View>

            {/* Visibilitas Lobi (Segmented Control) */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldEyebrow}>VISIBILITAS LOBI</Text>
                <Text style={[styles.visibilityStatusText, { color: THEME.colors.primary }]}>
                  {visibility === 'public' ? 'Terbuka Umum' : 'Khusus Undangan'}
                </Text>
              </View>
              <View style={styles.segmentedTrack}>
                <TouchableOpacity
                  style={[
                    styles.segmentedThumb,
                    visibility === 'public' && {
                      backgroundColor: THEME.colors.primaryMuted,
                      borderColor: THEME.colors.primaryBorder
                    }
                  ]}
                  activeOpacity={0.85}
                  onPress={() => setVisibility('public')}
                >
                  <GlobeIcon
                    color={visibility === 'public' ? THEME.colors.primary : THEME.colors.textSecondary}
                    size={14}
                  />
                  <Text
                    style={[
                      styles.segmentedText,
                      visibility === 'public' && { color: THEME.colors.primary }
                    ]}
                  >
                    Publik
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segmentedThumb,
                    visibility === 'private' && {
                      backgroundColor: THEME.colors.primaryMuted,
                      borderColor: THEME.colors.primaryBorder
                    }
                  ]}
                  activeOpacity={0.85}
                  onPress={() => setVisibility('private')}
                >
                  <LockIcon
                    color={visibility === 'private' ? THEME.colors.primary : THEME.colors.textSecondary}
                    size={14}
                  />
                  <Text
                    style={[
                      styles.segmentedText,
                      visibility === 'private' && { color: THEME.colors.primary }
                    ]}
                  >
                    Privat (Kode Room)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* STEP 2: Lokasi, Jadwal & Biaya */}
        {step === 2 && (
          <View style={styles.stepBody}>
            {/* Lokasi / Venue Selector (Mode Toggle + Compact Card / Custom Input) */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldEyebrow}>LOKASI & VENUE</Text>

              <View style={styles.segmentedTrack}>
                <TouchableOpacity
                  style={[
                    styles.segmentedThumb,
                    !isCustomVenue && {
                      backgroundColor: THEME.colors.primaryMuted,
                      borderColor: THEME.colors.primaryBorder
                    }
                  ]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setIsCustomVenue(false);
                    if (!selectedVenueId && venuesList.length > 0) {
                      const matching = venuesList.find((v) =>
                        v.supported_activities?.some((a) => a.toLowerCase().includes(sport.toLowerCase()))
                      ) || venuesList[0];
                      setSelectedVenueId(matching.id);
                      if (matching.rate_hourly_min > 0) {
                        setTotalCost((matching.rate_hourly_min * durationHours).toString());
                      }
                    }
                  }}
                >
                  <MapPinIcon
                    color={!isCustomVenue ? THEME.colors.primary : THEME.colors.textSecondary}
                    size={14}
                  />
                  <Text
                    style={[
                      styles.segmentedText,
                      !isCustomVenue && { color: THEME.colors.primary }
                    ]}
                  >
                    Venue Rekanan
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentedThumb,
                    isCustomVenue && {
                      backgroundColor: THEME.colors.primaryMuted,
                      borderColor: THEME.colors.primaryBorder
                    }
                  ]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setIsCustomVenue(true);
                    setSelectedVenueId(null);
                  }}
                >
                  <Text
                    style={[
                      styles.segmentedText,
                      isCustomVenue && { color: THEME.colors.primary }
                    ]}
                  >
                    Lokasi Kustom
                  </Text>
                </TouchableOpacity>
              </View>

              {isCustomVenue ? (
                <View style={styles.customVenueWrap}>
                  <InputForm
                    value={customVenueName}
                    onChangeText={setCustomVenueName}
                    placeholder={
                      sport === 'MLBB'
                        ? 'Contoh: Online · Discord / Room Custom'
                        : 'Contoh: Lapangan RW 05 Meruya'
                    }
                  />
                  {sport === 'MLBB' && (
                    <View style={styles.quickCustomRow}>
                      {['Online · Discord', 'Room Custom MLBB', 'Kafe / Basecamp'].map((preset) => (
                        <TouchableOpacity
                          key={preset}
                          style={styles.quickCustomChip}
                          onPress={() => setCustomVenueName(preset)}
                        >
                          <Text style={styles.quickCustomChipText}>{preset}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ) : isLoadingVenues ? (
                <View style={styles.venueLoadingCard}>
                  <ActivityIndicator size="small" color={THEME.colors.primary} />
                  <Text style={styles.venueLoadingText}>Memuat daftar venue rekanan...</Text>
                </View>
              ) : selectedVenue ? (
                <TouchableOpacity
                  style={[styles.selectedVenueCard, { borderColor: THEME.colors.primaryBorder }]}
                  activeOpacity={0.85}
                  onPress={() => setIsVenueSheetOpen(true)}
                >
                  <View style={styles.selectedVenueTop}>
                    <View style={[styles.venuePinBadge, { backgroundColor: THEME.colors.primaryMuted }]}>
                      <MapPinIcon color={THEME.colors.primary} size={16} />
                    </View>
                    <View style={styles.selectedVenueInfo}>
                      <Text style={styles.selectedVenueName} numberOfLines={2}>
                        {selectedVenue.name}
                      </Text>
                      <Text style={styles.selectedVenueAddress} numberOfLines={1}>
                        {selectedVenue.address}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.selectedVenueBottom}>
                    <Text style={[styles.selectedVenueRate, { color: THEME.colors.primary }]}>
                      IDR {selectedVenue.rate_hourly_min.toLocaleString('id-ID')}/jam
                    </Text>
                    <View style={styles.changeVenuePill}>
                      <Text style={styles.changeVenueText}>Ganti Venue</Text>
                      <ChevronRightIcon color={THEME.colors.text} size={13} />
                    </View>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.venueFallbackCard}>
                  <Text style={styles.venueFallbackText}>
                    {venueLoadError
                      ? 'Gagal memuat venue dari server.'
                      : 'Belum ada venue dipilih.'}
                  </Text>
                  <View style={styles.venueFallbackActions}>
                    <TouchableOpacity
                      style={styles.venueFallbackBtn}
                      onPress={() => fetchVenues()}
                    >
                      <Text style={[styles.venueFallbackBtnText, { color: THEME.colors.primary }]}>
                        Muat Ulang
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.venueFallbackBtn}
                      onPress={() => {
                        setIsCustomVenue(true);
                        setSelectedVenueId(null);
                      }}
                    >
                      <Text style={styles.venueFallbackBtnText}>Isi Lokasi Kustom</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Jadwal: Hari & Tanggal */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldEyebrow}>HARI & TANGGAL</Text>
              <View style={styles.dayCardsRow}>
                {dayOptions.map((d) => {
                  const active = selectedDayOffset === d.offset;
                  return (
                    <TouchableOpacity
                      key={d.offset}
                      style={[
                        styles.dayCard,
                        active && {
                          borderColor: THEME.colors.primary,
                          backgroundColor: THEME.colors.primaryMuted
                        }
                      ]}
                      activeOpacity={0.8}
                      onPress={() => setSelectedDayOffset(d.offset)}
                    >
                      <Text
                        style={[
                          styles.dayCardTop,
                          active && { color: THEME.colors.primary }
                        ]}
                        numberOfLines={1}
                      >
                        {d.shortDay}
                      </Text>
                      <Text style={[styles.dayCardNum, active && { color: THEME.colors.text }]}>
                        {d.dateNum}
                      </Text>
                      <Text style={styles.dayCardMonth}>{d.monthShort}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Jam Kickoff (Time-Aware) */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldEyebrow}>WAKTU MULAI</Text>
                <Text style={[styles.timeValueText, { color: THEME.colors.primary }]}>
                  {selectedTime} WIB
                </Text>
              </View>
              <View style={styles.quickChipsGrid}>
                {TIME_SLOTS.map((t) => {
                  const isPast = isTimeSlotPast(t, selectedDayOffset);
                  const active = selectedTime === t && !isPast;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.quickChipTime,
                        active && {
                          backgroundColor: THEME.colors.primaryMuted,
                          borderColor: THEME.colors.primary
                        },
                        isPast && styles.quickChipDisabled
                      ]}
                      activeOpacity={0.8}
                      disabled={isPast}
                      onPress={() => setSelectedTime(t)}
                    >
                      <Text
                        style={[
                          styles.quickChipText,
                          active && { color: THEME.colors.primary, fontFamily: THEME.typography.fonts.bold },
                          isPast && styles.quickChipTextDisabled
                        ]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Durasi & Total Biaya */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldEyebrow}>DURASI MAIN</Text>
              <View style={styles.durationRow}>
                {[1, 2, 3].map((dur) => {
                  const active = durationHours === dur;
                  return (
                    <TouchableOpacity
                      key={dur}
                      style={[
                        styles.durationBtn,
                        active && {
                          backgroundColor: THEME.colors.primaryMuted,
                          borderColor: THEME.colors.primary
                        }
                      ]}
                      activeOpacity={0.8}
                      onPress={() => {
                        setDurationHours(dur);
                        if (!isCustomVenue && selectedVenue && selectedVenue.rate_hourly_min > 0) {
                          setTotalCost((selectedVenue.rate_hourly_min * dur).toString());
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.durationBtnText,
                          active && { color: THEME.colors.primary, fontFamily: THEME.typography.fonts.bold }
                        ]}
                      >
                        {dur} Jam
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Total Biaya Sewa + Toggle Gratis */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldEyebrow}>TOTAL BIAYA SEWA</Text>
                <TouchableOpacity
                  style={[
                    styles.freeTogglePill,
                    parsedCost === 0 && {
                      backgroundColor: THEME.colors.successSoft,
                      borderColor: THEME.colors.successBorder
                    }
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setTotalCost(parsedCost === 0 && selectedVenue ? String(selectedVenue.rate_hourly_min * durationHours) : '0')}
                >
                  <Text
                    style={[
                      styles.freeToggleText,
                      parsedCost === 0 && { color: THEME.colors.success }
                    ]}
                  >
                    {parsedCost === 0 ? 'Gratis Aktif' : 'Set Gratis'}
                  </Text>
                </TouchableOpacity>
              </View>
              <InputForm
                value={totalCost}
                onChangeText={setTotalCost}
                keyboardType="numeric"
                placeholder="200000"
                leftIcon="IDR"
              />
            </View>

            {/* Estimasi Patungan Card */}
            <View style={[styles.patunganCalcCard, { borderColor: THEME.colors.primaryBorder }]}>
              <View style={styles.patunganCalcHeader}>
                <Text style={styles.patunganCalcLabel}>ESTIMASI PATUNGAN</Text>
                <Text style={[styles.patunganCalcQuota, { color: THEME.colors.primary }]}>
                  {parsedCost > 0
                    ? `IDR ${parsedCost.toLocaleString('id-ID')} ÷ ${quota} org`
                    : `${quota} Pemain`}
                </Text>
              </View>
              <View style={styles.patunganCalcPriceRow}>
                <Text style={[styles.patunganCalcPrice, { color: THEME.colors.primary }]}>
                  {parsedCost > 0 ? `IDR ${splitPerPerson.toLocaleString('id-ID')}` : 'Gratis'}
                </Text>
                {parsedCost > 0 && <Text style={styles.patunganCalcPerOrg}> / pemain</Text>}
              </View>
            </View>
          </View>
        )}

        {/* STEP 3: Aturan & Konfirmasi Publikasi */}
        {step === 3 && (
          <View style={styles.stepBody}>
            {/* Minimal Credit Score */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeader}>
                <View style={styles.eyebrowWithIcon}>
                  <ShieldIcon color={creditTierMeta.color} size={14} />
                  <Text style={styles.fieldEyebrow}>MINIMAL CREDIT SCORE</Text>
                </View>
                <Text style={[styles.creditSelectedLabel, { color: creditTierMeta.color }]}>
                  {minCreditScore}+ · {creditTierMeta.label}
                </Text>
              </View>
              <View style={styles.creditQuickRow}>
                {[
                  { score: 60, sub: 'Terbuka' },
                  { score: 70, sub: 'Sportif' },
                  { score: 80, sub: 'Disiplin' },
                  { score: 90, sub: 'Elit' }
                ].map((tier) => {
                  const active = minCreditScore === tier.score;
                  return (
                    <TouchableOpacity
                      key={tier.score}
                      style={[
                        styles.creditBtn,
                        active && {
                          backgroundColor: THEME.colors.primaryMuted,
                          borderColor: THEME.colors.primary
                        }
                      ]}
                      activeOpacity={0.8}
                      onPress={() => setMinCreditScore(tier.score)}
                    >
                      <Text
                        style={[
                          styles.creditBtnText,
                          active && { color: THEME.colors.primary }
                        ]}
                      >
                        {tier.score}+
                      </Text>
                      <Text style={styles.creditBtnSub}>{tier.sub}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.creditHelper}>
                Pemain dengan Credit Score di bawah {minCreditScore} tidak bisa masuk ke lobi ini.
              </Text>
            </View>

            {/* Pratinjau Kartu Explore (Match Pass) */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldEyebrow}>PRATINJAU KARTU EXPLORE</Text>
              <BentoCard
                eyebrow={`${sport.toUpperCase()} · ${teamFormatLabel}`}
                title={title.trim() || 'Sesi Mabar Baru'}
                subtitle={`${resolvedVenueName} · ${dayOptions[selectedDayOffset]?.dateStr} · ${selectedTime} WIB`}
                accentColor={activeSportConfig.color}
                rightAccessory={
                  <StatusBadge
                    label={visibility === 'public' ? 'PUBLIK' : 'PRIVAT'}
                    variant={visibility === 'public' ? 'brand' : 'neutral'}
                    tone={visibility === 'public' ? 'solid' : 'soft'}
                    size="sm"
                  />
                }
                priceLabel="EST. PATUNGAN"
                priceValue={
                  parsedCost > 0 ? `IDR ${splitPerPerson.toLocaleString('id-ID')} / org` : 'Gratis'
                }
              >
                <QuotaPips
                  filled={1}
                  total={quota}
                  variant={sport === 'Badminton' ? 'badminton' : 'futsal'}
                  label="HOST MASUK OTOMATIS DI SLOT #1"
                  groups={quota % 2 === 0 ? 2 : 1}
                />
              </BentoCard>
            </View>

            {/* Ringkasan Konfirmasi (Ledger) */}
            <View style={styles.summaryLedgerCard}>
              <Text style={styles.fieldEyebrow}>RINGKASAN SESI</Text>
              <View style={styles.ledgerDivider} />
              <View style={styles.ledgerRow}>
                <Text style={styles.ledgerKey}>Cabang & Format</Text>
                <Text style={styles.ledgerVal}>
                  {sport} · {teamFormatLabel} ({quota} slot)
                </Text>
              </View>
              <View style={styles.ledgerRow}>
                <Text style={styles.ledgerKey}>Jadwal & Durasi</Text>
                <Text style={styles.ledgerVal}>
                  {dayOptions[selectedDayOffset]?.shortDay} ({dayOptions[selectedDayOffset]?.dateStr}), {selectedTime} WIB · {durationHours} Jam
                </Text>
              </View>
              <View style={styles.ledgerRow}>
                <Text style={styles.ledgerKey}>Lokasi</Text>
                <Text style={styles.ledgerVal} numberOfLines={1}>
                  {resolvedVenueName}
                </Text>
              </View>
              <View style={styles.ledgerRow}>
                <Text style={styles.ledgerKey}>Total Sewa</Text>
                <Text style={[styles.ledgerVal, { color: THEME.colors.primary }]}>
                  {parsedCost > 0 ? `IDR ${parsedCost.toLocaleString('id-ID')}` : 'Gratis'}
                </Text>
              </View>
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
              ? 'Lanjut · Lokasi & Biaya'
              : step === 2
              ? 'Lanjut · Konfirmasi'
              : 'Buat & Publikasikan Sesi'
          }
          disabled={isSubmitting}
          loading={isSubmitting}
          onPress={handleNextStep}
        />
      </View>

      {/* Venue Picker Bottom Sheet Modal */}
      <Modal
        visible={isVenueSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsVenueSheetOpen(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setIsVenueSheetOpen(false)}>
          <Pressable
            style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom + 12, 20) }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Pilih Venue Lapangan</Text>
              <TouchableOpacity style={styles.sheetCloseBtn} onPress={() => setIsVenueSheetOpen(false)}>
                <CloseIcon color={THEME.colors.text} size={15} />
              </TouchableOpacity>
            </View>

            {/* Search Venue */}
            <View style={styles.sheetSearchBox}>
              <SearchIcon color={THEME.colors.textMuted} size={16} />
              <TextInput
                style={styles.sheetSearchInput}
                value={venueSearch}
                onChangeText={setVenueSearch}
                placeholder="Cari nama lapangan atau area..."
                placeholderTextColor={THEME.colors.textMuted}
              />
            </View>

            {/* Filter Chips */}
            <View style={styles.sheetFilterRow}>
              {sport !== 'MLBB' && (
                <TouchableOpacity
                  style={[
                    styles.sheetFilterChip,
                    venueFilterSportOnly && {
                      borderColor: THEME.colors.primary,
                      backgroundColor: THEME.colors.primaryMuted
                    }
                  ]}
                  onPress={() => setVenueFilterSportOnly(true)}
                >
                  <Text
                    style={[
                      styles.sheetFilterText,
                      venueFilterSportOnly && { color: THEME.colors.primary }
                    ]}
                  >
                    Khusus {sport}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.sheetFilterChip,
                  (!venueFilterSportOnly || sport === 'MLBB') && {
                    borderColor: THEME.colors.primary,
                    backgroundColor: THEME.colors.primaryMuted
                  }
                ]}
                onPress={() => setVenueFilterSportOnly(false)}
              >
                <Text
                  style={[
                    styles.sheetFilterText,
                    (!venueFilterSportOnly || sport === 'MLBB') && { color: THEME.colors.primary }
                  ]}
                >
                  Semua Venue ({venuesList.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sheetFilterChip}
                onPress={() => {
                  setIsCustomVenue(true);
                  setSelectedVenueId(null);
                  setIsVenueSheetOpen(false);
                }}
              >
                <Text style={styles.sheetFilterText}>+ Lokasi Kustom</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
              {filteredVenues.length === 0 ? (
                <View style={styles.sheetEmpty}>
                  <Text style={styles.sheetEmptyText}>
                    Tidak ada venue yang cocok. Coba tampilkan semua venue atau pakai lokasi kustom.
                  </Text>
                </View>
              ) : (
                filteredVenues.map((v) => {
                  const isSelected = !isCustomVenue && selectedVenueId === v.id;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[
                        styles.sheetVenueRow,
                        isSelected && {
                          borderColor: THEME.colors.primary,
                          backgroundColor: THEME.colors.primaryMuted
                        }
                      ]}
                      activeOpacity={0.8}
                      onPress={() => handleSelectVenue(v)}
                    >
                      <View style={styles.sheetVenueInfo}>
                        <Text
                          style={[styles.sheetVenueName, isSelected && { color: THEME.colors.primary }]}
                          numberOfLines={2}
                        >
                          {v.name}
                        </Text>
                        <Text style={styles.sheetVenueAddress} numberOfLines={1}>
                          {v.address}
                        </Text>
                        <Text style={[styles.sheetVenueRate, { color: THEME.colors.primary }]}>
                          IDR {v.rate_hourly_min.toLocaleString('id-ID')}/jam
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={[styles.checkBadge, { backgroundColor: THEME.colors.primary }]}>
                          <CheckIcon color={THEME.colors.textOnPrimary} size={11} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

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
    paddingTop: 10,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center'
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
  stepPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.full,
    borderWidth: 1
  },
  stepPillText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 11,
    letterSpacing: 0.4,
    includeFontPadding: false
  },
  stepperBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 6
  },
  stepSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: THEME.colors.cardElevated
  },
  stepBody: {
    gap: 18
  },
  fieldSection: {
    gap: 8
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  eyebrowWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
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
  sportActiveTag: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11,
    includeFontPadding: false
  },
  sportPillsRow: {
    flexDirection: 'row',
    gap: 6
  },
  sportPill: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder
  },
  sportPillText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11.5,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  sectionDivider: {
    height: 1,
    backgroundColor: THEME.colors.border
  },
  checkBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  segmentedTrack: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    padding: 4,
    gap: 4
  },
  segmentedThumb: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  segmentedText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  fieldHelperText: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textMuted,
    lineHeight: 16,
    includeFontPadding: false
  },
  quotaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  quotaNumRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6
  },
  quotaValue: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 30,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  quotaUnit: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 14,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  quotaHint: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    includeFontPadding: false
  },
  stepperControls: {
    flexDirection: 'row',
    gap: 8
  },
  stepperBtn: {
    width: 42,
    height: 42,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepperBtnDisabled: {
    opacity: 0.35
  },
  stepperMinusIcon: {
    fontSize: 22,
    color: THEME.colors.text,
    fontFamily: THEME.typography.fonts.bold,
    includeFontPadding: false
  },
  stepperPlusIcon: {
    fontSize: 20,
    color: THEME.colors.textOnPrimary,
    fontFamily: THEME.typography.fonts.bold,
    includeFontPadding: false
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  presetChip: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center'
  },
  presetChipText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  visibilityStatusText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11,
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
  visibilityIconWrap: {
    width: 34,
    height: 34,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center'
  },
  visibilityTextBox: {
    flex: 1,
    gap: 2
  },
  visibilityTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  visibilityDesc: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  inlineActionText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11,
    includeFontPadding: false
  },
  venueLoadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: THEME.radius.lg,
    padding: 16
  },
  venueLoadingText: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  venueFallbackCard: {
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: THEME.radius.lg,
    padding: 14,
    gap: 10
  },
  venueFallbackText: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  venueFallbackActions: {
    flexDirection: 'row',
    gap: 8
  },
  venueFallbackBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border
  },
  venueFallbackBtnText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  selectedVenueCard: {
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderRadius: THEME.radius.lg,
    padding: 14,
    gap: 12
  },
  selectedVenueTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10
  },
  venuePinBadge: {
    width: 34,
    height: 34,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2
  },
  selectedVenueInfo: {
    flex: 1,
    gap: 3
  },
  selectedVenueName: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 14,
    color: THEME.colors.text,
    lineHeight: 19,
    includeFontPadding: false
  },
  selectedVenueAddress: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  selectedVenueBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border
  },
  selectedVenueRate: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    includeFontPadding: false
  },
  changeVenuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border
  },
  changeVenueText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  customVenueWrap: {
    gap: 8
  },
  quickCustomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  quickCustomChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border
  },
  quickCustomChipText: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  dayCardsRow: {
    flexDirection: 'row',
    gap: 8
  },
  dayCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    gap: 2
  },
  dayCardTop: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  dayCardNum: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 17,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  dayCardMonth: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  timeValueText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    includeFontPadding: false
  },
  quickChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  quickChipTime: {
    width: '18.2%',
    paddingVertical: 9,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    alignItems: 'center'
  },
  quickChipDisabled: {
    opacity: 0.3
  },
  quickChipText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  quickChipTextDisabled: {
    textDecorationLine: 'line-through'
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8
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
  durationBtnText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  freeTogglePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border
  },
  freeToggleText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  patunganCalcCard: {
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderRadius: THEME.radius.lg,
    padding: 15,
    gap: 4
  },
  patunganCalcHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  patunganCalcLabel: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8,
    includeFontPadding: false
  },
  patunganCalcQuota: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11,
    includeFontPadding: false
  },
  patunganCalcPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2
  },
  patunganCalcPrice: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 24,
    includeFontPadding: false
  },
  patunganCalcPerOrg: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  creditSelectedLabel: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 11,
    includeFontPadding: false
  },
  creditQuickRow: {
    flexDirection: 'row',
    gap: 8
  },
  creditBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    alignItems: 'center',
    gap: 2
  },
  creditBtnText: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 14,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  creditBtnSub: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  creditHelper: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    lineHeight: 16,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  summaryLedgerCard: {
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: THEME.radius.lg,
    padding: 15,
    gap: 10
  },
  ledgerDivider: {
    height: 1,
    backgroundColor: THEME.colors.border
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  ledgerKey: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  ledgerVal: {
    flex: 1,
    textAlign: 'right',
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 12,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  footerBar: {
    paddingHorizontal: THEME.spatial.screenPaddingHorizontal,
    paddingTop: 12,
    backgroundColor: THEME.colors.card,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.cardBorder
  },
  // Bottom Sheet Modal
  sheetBackdrop: {
    flex: 1,
    backgroundColor: THEME.colors.overlay,
    justifyContent: 'flex-end'
  },
  sheetContainer: {
    backgroundColor: THEME.colors.card,
    borderTopLeftRadius: THEME.radius.xl,
    borderTopRightRadius: THEME.radius.xl,
    borderTopWidth: 1,
    borderColor: THEME.colors.cardBorder,
    paddingHorizontal: 16,
    paddingTop: 10,
    maxHeight: '80%'
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.colors.borderStrong,
    alignSelf: 'center',
    marginBottom: 12
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sheetTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 16,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sheetSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10
  },
  sheetSearchInput: {
    flex: 1,
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 13,
    color: THEME.colors.text,
    paddingVertical: 0
  },
  sheetFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12
  },
  sheetFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border
  },
  sheetFilterText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  sheetList: {
    maxHeight: 360
  },
  sheetEmpty: {
    paddingVertical: 28,
    alignItems: 'center'
  },
  sheetEmptyText: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18
  },
  sheetVenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    padding: 12,
    marginBottom: 8
  },
  sheetVenueInfo: {
    flex: 1,
    gap: 3
  },
  sheetVenueName: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  sheetVenueAddress: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  sheetVenueRate: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11,
    marginTop: 2,
    includeFontPadding: false
  },
  authPromptContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12
  },
  authLockCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.colors.primaryMuted,
    borderWidth: 1,
    borderColor: THEME.colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
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
    marginBottom: 10,
    includeFontPadding: false
  },
  authBtn: {
    flexDirection: 'row',
    gap: 6,
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
    color: THEME.colors.textOnPrimary,
    includeFontPadding: false
  }
});
