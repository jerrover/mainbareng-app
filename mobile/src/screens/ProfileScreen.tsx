import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Modal,
  Pressable,
  TextInput
} from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';
import { THEME } from '../theme';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';
import CustomAlertModal, { AlertType } from '../components/CustomAlertModal';
import RadarChart from '../components/RadarChart';
import { api, ApiAnonymousReview, ApiCreditTransaction, ApiOvrProfile } from '../services/api';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

interface UserProfileData {
  fullName: string;
  email: string;
  creditScore: number;
  totalSessions: number;
  showUpRate: string;
}

interface ActivityItem {
  type: string;
  rawType: string;
  role: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  rating: string;
  inGameName: string | null;
}

const SPORT_OPTIONS = ['futsal', 'badminton', 'basket', 'mlbb'] as const;
const LEVEL_OPTIONS: Array<'Beginner' | 'Intermediate' | 'Advanced'> = [
  'Beginner',
  'Intermediate',
  'Advanced'
];

const ROLE_PRESETS: Record<string, string[]> = {
  futsal: ['Pivot', 'Anchor', 'Flank', 'Kiper'],
  badminton: ['Tunggal', 'Ganda Depan', 'Ganda Belakang'],
  basket: ['Guard', 'Forward', 'Center'],
  mlbb: ['Roamer', 'Jungler', 'Mid', 'Gold', 'EXP']
};

function formatCreditReason(reason: string): string {
  switch (reason) {
    case 'ATTEND_ON_TIME':
      return 'Hadir Tepat Waktu';
    case 'LATE_ARRIVAL':
      return 'Terlambat Hadir';
    case 'NO_SHOW':
      return 'Tidak Hadir (No-Show)';
    case 'GOOD_SPORTSMANSHIP':
      return 'Sportif & Kooperatif';
    case 'POOR_SPORTSMANSHIP':
      return 'Kurang Sportif';
    case 'HOST_CANCEL_LATE':
      return 'Batal Mendadak';
    default:
      return reason.replace(/_/g, ' ');
  }
}

function formatTxDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${months[d.getMonth()]}, ${hh}:${mm}`;
}

function CloseIcon({ color, size = 15 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SettingsIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckIcon({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="20 6 9 17 4 12" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronRightIcon({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="9 18 15 12 9 6" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SportWatermark({ activityType = '' }: { activityType?: string }) {
  const act = activityType.toLowerCase();
  const stroke = 'rgba(255, 255, 255, 0.055)';

  if (act.includes('badminton')) {
    return (
      <Svg width={120} height={120} viewBox="0 0 200 200" fill="none" style={styles.skillWatermark}>
        <Rect x="15" y="15" width="170" height="170" stroke={stroke} strokeWidth="1.5" />
        <Line x1="32" y1="15" x2="32" y2="185" stroke={stroke} strokeWidth="1.5" />
        <Line x1="168" y1="15" x2="168" y2="185" stroke={stroke} strokeWidth="1.5" />
        <Line x1="15" y1="100" x2="185" y2="100" stroke={stroke} strokeWidth="1.5" strokeDasharray="4 4" />
      </Svg>
    );
  }

  return (
    <Svg width={120} height={120} viewBox="0 0 200 200" fill="none" style={styles.skillWatermark}>
      <Rect x="10" y="10" width="180" height="180" stroke={stroke} strokeWidth="1.5" />
      <Line x1="10" y1="100" x2="190" y2="100" stroke={stroke} strokeWidth="1.5" />
      <Circle cx="100" cy="100" r="32" stroke={stroke} strokeWidth="1.5" />
    </Svg>
  );
}

export default function ProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const radarWidth = Math.min(310, Math.max(250, screenWidth - 68));
  const { session, user, signOut } = useAuthStore();
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [ovrProfile, setOvrProfile] = useState<ApiOvrProfile | null>(null);

  // Credit History & Anonymous Reviews Bottom Sheet
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyTab, setHistoryTab] = useState<'credit' | 'reviews'>('credit');
  const [creditHistory, setCreditHistory] = useState<ApiCreditTransaction[]>([]);
  const [anonymousReviews, setAnonymousReviews] = useState<ApiAnonymousReview[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Activity Profile Editor Bottom Sheet
  const [isActivitySheetOpen, setIsActivitySheetOpen] = useState(false);
  const [editSport, setEditSport] = useState<(typeof SPORT_OPTIONS)[number]>('futsal');
  const [editLevel, setEditLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [editRole, setEditRole] = useState('Pivot');
  const [editIgn, setEditIgn] = useState('');
  const [isSavingActivity, setIsSavingActivity] = useState(false);
  const [isDeletingActivity, setIsDeletingActivity] = useState(false);

  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
    primaryButtonText?: string;
    onPrimaryPress?: () => void;
    secondaryButtonText?: string;
    onSecondaryPress?: () => void;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: ''
  });

  const showAlert = (
    title: string,
    message: string,
    type: AlertType = 'info',
    onPrimaryPress?: () => void,
    primaryButtonText = 'Mengerti',
    secondaryButtonText?: string,
    onSecondaryPress?: () => void
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
      },
      secondaryButtonText,
      onSecondaryPress: secondaryButtonText
        ? () => {
            setModalConfig((prev) => ({ ...prev, visible: false }));
            if (onSecondaryPress) onSecondaryPress();
          }
        : undefined
    });
  };

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfileData(null);
      setActivities([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, credit_score, total_sessions_completed, show_up_rate')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('[ProfileScreen] Fetch profile error:', error.message);
      }

      const resolvedName =
        data?.full_name ||
        user.user_metadata?.full_name ||
        user.email?.split('@')[0] ||
        'Pemain Mabar';

      setProfileData({
        fullName: resolvedName,
        email: data?.email || user.email || '',
        creditScore: data?.credit_score ?? 100,
        totalSessions: data?.total_sessions_completed ?? 0,
        showUpRate: `${data?.show_up_rate ?? 100}%`
      });

      const { data: actData } = await supabase
        .from('user_activity_profiles')
        .select('activity_type, in_game_name, preferred_role, skill_rating_level, skill_rating_points')
        .eq('user_id', user.id);

      if (actData && actData.length > 0) {
        setActivities(
          actData.map((act) => {
            const pts = act.skill_rating_points ?? 1200;
            const convertedRating = (pts / 20).toFixed(1);
            const rawType = (act.activity_type || 'futsal').toLowerCase();
            return {
              type: rawType.toUpperCase(),
              rawType,
              level: (act.skill_rating_level as ActivityItem['level']) || 'Intermediate',
              role: act.preferred_role || 'Pemain',
              rating: convertedRating,
              inGameName: act.in_game_name || null
            };
          })
        );
      } else {
        setActivities([]);
      }

      try {
        const ovrRes = await api.getMyOvr();
        if (ovrRes) {
          setOvrProfile(ovrRes);
        } else {
          const completed = data?.total_sessions_completed ?? 0;
          const exp = Math.min(100, Math.round(30 + Math.sqrt(completed) * 15.65));
          setOvrProfile({
            ovr: 75,
            grade: 'B',
            is_calibrated: completed >= 3,
            matches_played: completed,
            total_reviews: 0,
            radar: [
              { key: 'teamwork', label: 'TMW', name: 'Teamwork', value: 75 },
              { key: 'fair_play', label: 'FRP', name: 'Fair Play', value: 80 },
              { key: 'reliability', label: 'REL', name: 'Reliability', value: data?.credit_score ?? 100 },
              { key: 'experience', label: 'EXP', name: 'Experience', value: exp },
              { key: 'skill_fit', label: 'SKL', name: 'Skill Fit', value: 75 }
            ]
          });
        }
      } catch (ovrErr) {
        console.warn('[ProfileScreen] Fetch OVR error:', ovrErr);
      }
    } catch (err) {
      console.warn('[ProfileScreen] Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleOpenCreditHistory = async (initialTab: 'credit' | 'reviews' = 'credit') => {
    setHistoryTab(initialTab);
    setIsHistoryOpen(true);
    setIsLoadingHistory(true);
    try {
      const [txRes, revRes] = await Promise.allSettled([
        api.getCreditHistory(),
        api.getMyReviews()
      ]);

      if (txRes.status === 'fulfilled') {
        setCreditHistory(txRes.value);
      } else if (user?.id) {
        const { data } = await supabase
          .from('credit_transactions')
          .select('id, user_id, session_id, delta, reason, balance_after, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        setCreditHistory((data as ApiCreditTransaction[]) || []);
      }

      if (revRes.status === 'fulfilled') {
        setAnonymousReviews(revRes.value);
      } else {
        setAnonymousReviews([]);
      }
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleOpenActivityEditor = (existing?: ActivityItem) => {
    if (existing) {
      const normalized = SPORT_OPTIONS.includes(existing.rawType as any)
        ? (existing.rawType as (typeof SPORT_OPTIONS)[number])
        : 'futsal';
      setEditSport(normalized);
      setEditLevel(existing.level);
      setEditRole(existing.role);
      setEditIgn(existing.inGameName || '');
    } else {
      setEditSport('futsal');
      setEditLevel('Intermediate');
      setEditRole(ROLE_PRESETS.futsal[0]);
      setEditIgn('');
    }
    setIsActivitySheetOpen(true);
  };

  const handleSaveActivity = async () => {
    setIsSavingActivity(true);
    try {
      await api.upsertActivityProfile({
        activity_type: editSport,
        preferred_role: editRole.trim() || ROLE_PRESETS[editSport][0],
        skill_rating_level: editLevel,
        in_game_name: editSport === 'mlbb' && editIgn.trim() ? editIgn.trim() : null
      });
      setIsActivitySheetOpen(false);
      await loadProfile();
    } catch (err: any) {
      showAlert('Gagal Menyimpan', err?.message || 'Coba ulangi beberapa saat lagi.', 'error');
    } finally {
      setIsSavingActivity(false);
    }
  };

  const isEditingSavedSport = activities.some((a) => a.rawType === editSport);

  const handleDeleteActivity = async () => {
    setIsDeletingActivity(true);
    try {
      await api.deleteActivityProfile(editSport);
      setIsActivitySheetOpen(false);
      await loadProfile();
    } catch (err: any) {
      showAlert('Gagal Menghapus', err?.message || 'Coba ulangi beberapa saat lagi.', 'error');
    } finally {
      setIsDeletingActivity(false);
    }
  };

  const handleSignOut = () => {
    showAlert(
      'Konfirmasi Keluar',
      'Yakin ingin keluar dari akun?',
      'warning',
      async () => {
        await signOut();
        const root = navigation.getParent<any>();
        if (root) root.navigate('Auth');
      },
      'Keluar Akun',
      'Batal'
    );
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getPillarDescription = (key: string, value: number) => {
    switch (key) {
      case 'teamwork':
        return `Skor Teamwork (${value}/100): Mengukur kekompakan, unselfish play, dan koordinasi dengan rekan setim di lapangan.`;
      case 'fair_play':
        return `Skor Fair Play (${value}/100): Dihitung dari akumulasi review sportivitas sesama pemain di lapangan.`;
      case 'reliability':
        return `Skor Reliability (${value}/100): Terikat langsung dengan Credit Score kamu, menjamin kamu tidak pernah ghosting slot.`;
      case 'experience':
        return `Skor Experience (${value}/100): Mengukur konsistensi dan jumlah sesi yang berhasil kamu selesaikan.`;
      case 'skill_fit':
        return `Skor Skill Fit (${value}/100): Evaluasi kesesuaian tingkat kemahiran teknis agar tim tetap seimbang.`;
      default:
        return `Skor atribut: ${value}/100`;
    }
  };

  // Guest Mode View
  if (!session || !user) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <View style={styles.brandLeft}>
              <Text style={styles.brandWordmark}>
                mabar<Text style={styles.brandDot}>.</Text>
              </Text>
              <View style={styles.topBarDivider} />
              <Text style={styles.pageCrumb}>Profil</Text>
            </View>
          </View>

          <View style={styles.guestCard}>
            <View style={[styles.avatarRing, { borderColor: THEME.colors.border }]}>
              <Text style={[styles.avatarText, { color: THEME.colors.textMuted }]}>?</Text>
            </View>
            <Text style={styles.guestTitle}>Mode Tamu</Text>
            <Text style={styles.guestSubtitle}>
              Masuk untuk melihat statistik main, kehadiran, dan skor kamu.
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.btnLoginPrimary}
              onPress={() => {
                const root = navigation.getParent<any>();
                if (root) root.navigate('Auth');
                else (navigation as any).navigate('Auth');
              }}
            >
              <Text style={styles.btnLoginPrimaryText}>Masuk / Daftar Akun</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const name = profileData?.fullName || user.user_metadata?.full_name || 'Jeremy Marvel';
  const creditScore = profileData?.creditScore ?? 100;
  const totalSessions = profileData?.totalSessions ?? 0;
  const showUpRate = profileData?.showUpRate ?? '100%';
  const creditStatusText = creditScore >= 70 ? 'Aman' : 'Kena Jeda';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar matching ExploreScreen */}
        <View style={styles.topBar}>
          <View style={styles.brandLeft}>
            <Text style={styles.brandWordmark}>
              mabar<Text style={styles.brandDot}>.</Text>
            </Text>
            <View style={styles.topBarDivider} />
            <Text style={styles.pageCrumb}>Profil</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.iconCircleBtn}
            onPress={() =>
              showAlert(
                'Pengaturan',
                'Menu preferensi dan notifikasi akun segera hadir di rilis berikutnya.',
                'info'
              )
            }
            accessibilityLabel="Pengaturan"
          >
            <SettingsIcon color={THEME.colors.textSecondary} size={18} />
          </TouchableOpacity>
        </View>

        {/* Hero Athlete Card (Unboxed OVR + Inline Metadata) */}
        <View style={styles.heroCard}>
          <Svg width={160} height={160} viewBox="0 0 200 200" fill="none" style={styles.heroWatermark}>
            <Rect x="10" y="10" width="180" height="180" stroke="rgba(255,255,255,0.06)" strokeWidth="1.2" />
            <Line x1="10" y1="100" x2="190" y2="100" stroke="rgba(255,255,255,0.06)" strokeWidth="1.2" />
            <Circle cx="100" cy="100" r="32" stroke="rgba(255,255,255,0.06)" strokeWidth="1.2" />
          </Svg>

          <View style={styles.heroTop}>
            <View style={styles.heroIdentity}>
              <View style={styles.avatarRing}>
                <Text style={styles.avatarText}>{getInitials(name)}</Text>
              </View>
              <View style={styles.heroNameBlock}>
                <Text style={styles.heroName} numberOfLines={1}>
                  {name}
                </Text>
                <View style={styles.inlineStatus}>
                  <CheckIcon color={THEME.colors.textSecondary} size={12} />
                  <Text style={styles.inlineStatusText}>
                    {ovrProfile?.is_calibrated ? 'Pemain Aktif' : 'Main 3x lagi'}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.ovrUnboxed}
              onPress={() =>
                showAlert(
                  `Status OVR: ${ovrProfile?.ovr ?? 75} (${ovrProfile?.grade ?? 'B'})`,
                  `Overall Rating dihitung dari 5 aspek: Teamwork, Fair Play, Reliability, Experience, dan Skill Fit.${
                    ovrProfile?.is_calibrated
                      ? ' Profil kamu sudah terkalibrasi penuh.'
                      : ' Main 3x lagi agar profil terkalibrasi penuh.'
                  }`,
                  'info'
                )
              }
            >
              <Text style={styles.ovrNumSculptural}>{ovrProfile?.ovr ?? 75}</Text>
              <Text style={styles.ovrSubLabel}>OVR · TIER {ovrProfile?.grade ?? 'B'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroStatsStrip}>
            <View style={styles.stripItem}>
              <Text style={styles.stripVal}>{totalSessions}</Text>
              <Text style={styles.stripLbl}>Main</Text>
            </View>
            <View style={styles.stripDivider} />
            <View style={styles.stripItem}>
              <Text style={styles.stripVal}>{showUpRate}</Text>
              <Text style={styles.stripLbl}>Hadir</Text>
            </View>
            <View style={styles.stripDivider} />
            <View style={styles.stripItem}>
              <Text style={[styles.stripVal, { color: THEME.colors.primary }]}>{creditScore}</Text>
              <Text style={styles.stripLbl}>Skor</Text>
            </View>
            <View style={styles.stripDivider} />
            <View style={styles.stripItem}>
              <Text style={styles.stripVal}>{totalSessions * 2}</Text>
              <Text style={styles.stripLbl}>Jam</Text>
            </View>
          </View>
        </View>

        {/* Section: Statistik Main */}
        <View style={styles.sectionHeadClean}>
          <Text style={styles.sectionHeading}>Statistik Main</Text>
        </View>

        <View style={styles.radarTactileCard}>
          {ovrProfile?.radar ? (
            <RadarChart
              data={ovrProfile.radar}
              size={radarWidth}
              accentColor={THEME.colors.primary}
              onPressPoint={(pt) =>
                showAlert(
                  `${pt.name}: ${pt.value} / 100`,
                  getPillarDescription(pt.key, pt.value),
                  'info'
                )
              }
            />
          ) : (
            <ActivityIndicator color={THEME.colors.primary} style={{ marginVertical: 32 }} />
          )}
        </View>

        {/* Section: Credit Score */}
        <View style={styles.sectionHeadClean}>
          <Text style={styles.sectionHeading}>Credit Score</Text>
        </View>

        <View style={styles.tactileCard}>
          <View style={styles.creditTop}>
            <View style={styles.creditScoreRow}>
              <Text style={styles.creditScoreBig}>{creditScore}</Text>
              <Text style={styles.creditScoreUnit}> / 100</Text>
            </View>
            <Text style={styles.statusUnboxed}>{creditStatusText}</Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFillVolt,
                { width: `${Math.min(100, Math.max(0, creditScore))}%` }
              ]}
            />
          </View>

          <View style={styles.creditMetaRow}>
            <Text style={styles.creditRuleText}>Skor &lt; 70 · Jeda main 24 jam</Text>
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.historyLinkBtn}
              onPress={() => handleOpenCreditHistory('credit')}
            >
              <Text style={styles.historyLinkText}>Riwayat &amp; Ulasan</Text>
              <ChevronRightIcon color={THEME.colors.primary} size={13} />
            </TouchableOpacity>
          </View>

          <View style={styles.inlineHighlights}>
            <Text style={styles.inlineHighlightsText}>Tepat waktu · Sportif · Sesuai level</Text>
          </View>
        </View>

        {/* Section: Rating per Cabang */}
        <View style={styles.sectionHeadClean}>
          <Text style={styles.sectionHeading}>Rating per Cabang</Text>
          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.addActivityBtn}
            onPress={() => handleOpenActivityEditor()}
          >
            <Text style={styles.addActivityBtnText}>+ Atur</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={THEME.colors.primary} style={{ marginVertical: 16 }} />
        ) : activities.length === 0 ? (
          <View style={styles.emptySkillCard}>
            <Text style={styles.emptySkillTitle}>Belum ada cabor terdaftar</Text>
            <Text style={styles.emptySkillSubtitle}>
              Tambahkan cabang olahraga &amp; role favoritmu untuk matchmaking yang lebih pas.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.emptySkillBtn}
              onPress={() => handleOpenActivityEditor()}
            >
              <Text style={styles.emptySkillBtnText}>+ Tambah Cabor</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.skillStack}>
            {activities.map((act) => (
              <TouchableOpacity
                key={act.type}
                style={styles.skillRowCard}
                activeOpacity={0.82}
                onPress={() => handleOpenActivityEditor(act)}
              >
                <SportWatermark activityType={act.type} />
                <View style={styles.skillInfo}>
                  <Text style={styles.skillSportName}>
                    {act.type} · {act.level}
                  </Text>
                  <Text style={styles.skillSportSub}>
                    {act.role}{act.inGameName ? ` · ${act.inGameName}` : ''}
                  </Text>
                </View>
                <View style={styles.skillRatingCol}>
                  <Text style={styles.skillRatingUnboxed}>{act.rating}</Text>
                  <Text style={styles.skillRatingLabel}>SKILL</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Calm Borderless Logout */}
        <TouchableOpacity activeOpacity={0.7} style={styles.btnLogoutCalm} onPress={handleSignOut}>
          <Text style={styles.btnLogoutCalmText}>Keluar Akun</Text>
        </TouchableOpacity>

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
          secondaryButtonText={modalConfig.secondaryButtonText}
          onSecondaryPress={modalConfig.onSecondaryPress}
          onClose={() => setModalConfig((prev) => ({ ...prev, visible: false }))}
        />
      </ScrollView>

      {/* Credit History Bottom Sheet */}
      <Modal
        visible={isHistoryOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsHistoryOpen(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setIsHistoryOpen(false)}>
          <Pressable
            style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom + 12, 20) }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Riwayat &amp; Ulasan</Text>
                <Text style={styles.sheetSub}>Skor saat ini: {creditScore} / 100</Text>
              </View>
              <TouchableOpacity style={styles.sheetCloseBtn} onPress={() => setIsHistoryOpen(false)}>
                <CloseIcon color={THEME.colors.text} size={15} />
              </TouchableOpacity>
            </View>

            <View style={styles.sheetTabRow}>
              <TouchableOpacity
                style={[styles.sheetTabBtn, historyTab === 'credit' && styles.sheetTabBtnActive]}
                onPress={() => setHistoryTab('credit')}
              >
                <Text
                  style={[
                    styles.sheetTabText,
                    historyTab === 'credit' && styles.sheetTabTextActive
                  ]}
                >
                  Skor
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetTabBtn, historyTab === 'reviews' && styles.sheetTabBtnActive]}
                onPress={() => setHistoryTab('reviews')}
              >
                <Text
                  style={[
                    styles.sheetTabText,
                    historyTab === 'reviews' && styles.sheetTabTextActive
                  ]}
                >
                  Ulasan ({anonymousReviews.length})
                </Text>
              </TouchableOpacity>
            </View>

            {isLoadingHistory ? (
              <ActivityIndicator color={THEME.colors.primary} style={{ marginVertical: 28 }} />
            ) : historyTab === 'credit' ? (
              creditHistory.length === 0 ? (
                <View style={styles.sheetEmpty}>
                  <Text style={styles.sheetEmptyText}>
                    Belum ada perubahan skor. Skor awal 100 masih utuh.
                  </Text>
                </View>
              ) : (
                <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
                  {creditHistory.map((tx) => {
                    const isPositive = tx.delta >= 0;
                    return (
                      <View key={tx.id} style={styles.txRow}>
                        <View style={styles.txLeft}>
                          <Text style={styles.txReason}>{formatCreditReason(tx.reason)}</Text>
                          <Text style={styles.txMeta}>
                            {formatTxDate(tx.created_at)}
                            {tx.balance_after !== null ? ` · Saldo ${tx.balance_after}` : ''}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.txDeltaPill,
                            isPositive ? styles.txDeltaPos : styles.txDeltaNeg
                          ]}
                        >
                          <Text
                            style={[
                              styles.txDeltaText,
                              { color: isPositive ? THEME.colors.success : THEME.colors.danger }
                            ]}
                          >
                            {isPositive ? `+${tx.delta}` : tx.delta}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              )
            ) : anonymousReviews.length === 0 ? (
              <View style={styles.sheetEmpty}>
                <Text style={styles.sheetEmptyText}>
                  Belum ada ulasan masuk dari teman mabar.
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
                {anonymousReviews.map((rev) => {
                  const sportLabel =
                    rev.sportsmanship === 'good'
                      ? 'Asik'
                      : rev.sportsmanship === 'okay'
                      ? 'Standar'
                      : 'Kurang';
                  const sportColor =
                    rev.sportsmanship === 'good'
                      ? THEME.colors.success
                      : rev.sportsmanship === 'poor'
                      ? THEME.colors.danger
                      : THEME.colors.textSecondary;
                  const levelLabel =
                    rev.level_fit === 'higher'
                      ? 'Level di atas'
                      : rev.level_fit === 'lower'
                      ? 'Level di bawah'
                      : 'Level pas';
                  return (
                    <View key={rev.id} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <Text style={[styles.reviewBadge, { color: sportColor }]}>
                          {sportLabel} · {levelLabel}
                        </Text>
                        <Text style={styles.txMeta}>{formatTxDate(rev.created_at)}</Text>
                      </View>
                      {rev.notes ? (
                        <Text style={styles.reviewNotes}>&ldquo;{rev.notes}&rdquo;</Text>
                      ) : (
                        <Text style={styles.reviewNoNotes}>Tanpa catatan</Text>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Activity Profile Editor Bottom Sheet */}
      <Modal
        visible={isActivitySheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsActivitySheetOpen(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setIsActivitySheetOpen(false)}>
          <Pressable
            style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom + 12, 20) }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Atur Cabor &amp; Role</Text>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setIsActivitySheetOpen(false)}
              >
                <CloseIcon color={THEME.colors.text} size={15} />
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetLabel}>CABANG OLAHRAGA</Text>
            <View style={styles.sheetPillRow}>
              {SPORT_OPTIONS.map((sp) => {
                const active = editSport === sp;
                return (
                  <TouchableOpacity
                    key={sp}
                    style={[styles.sheetChip, active && styles.sheetChipActive]}
                    onPress={() => {
                      setEditSport(sp);
                      setEditRole(ROLE_PRESETS[sp][0]);
                    }}
                  >
                    <Text style={[styles.sheetChipText, active && styles.sheetChipTextActive]}>
                      {sp.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sheetLabel}>LEVEL MAIN</Text>
            <View style={styles.sheetPillRow}>
              {LEVEL_OPTIONS.map((lvl) => {
                const active = editLevel === lvl;
                return (
                  <TouchableOpacity
                    key={lvl}
                    style={[styles.sheetChip, active && styles.sheetChipActive]}
                    onPress={() => setEditLevel(lvl)}
                  >
                    <Text style={[styles.sheetChipText, active && styles.sheetChipTextActive]}>
                      {lvl}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sheetLabel}>POSISI / ROLE FAVORIT</Text>
            <View style={styles.sheetPillWrap}>
              {ROLE_PRESETS[editSport].map((r) => {
                const active = editRole === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[styles.sheetChipSmall, active && styles.sheetChipActive]}
                    onPress={() => setEditRole(r)}
                  >
                    <Text style={[styles.sheetChipText, active && styles.sheetChipTextActive]}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              style={styles.sheetInput}
              value={editRole}
              onChangeText={setEditRole}
              placeholder="Atau ketik posisi sendiri..."
              placeholderTextColor={THEME.colors.textMuted}
            />

            {editSport === 'mlbb' && (
              <>
                <Text style={styles.sheetLabel}>NICKNAME IN-GAME (OPSIONAL)</Text>
                <TextInput
                  style={styles.sheetInput}
                  value={editIgn}
                  onChangeText={setEditIgn}
                  placeholder="Contoh: Voskav#1234"
                  placeholderTextColor={THEME.colors.textMuted}
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.sheetSaveBtn, (isSavingActivity || isDeletingActivity) && { opacity: 0.6 }]}
              activeOpacity={0.85}
              disabled={isSavingActivity || isDeletingActivity}
              onPress={handleSaveActivity}
            >
              {isSavingActivity ? (
                <ActivityIndicator color={THEME.colors.textOnPrimary} />
              ) : (
                <Text style={styles.sheetSaveBtnText}>Simpan Profil Cabor</Text>
              )}
            </TouchableOpacity>

            {isEditingSavedSport && (
              <TouchableOpacity
                style={[styles.sheetDeleteBtn, (isSavingActivity || isDeletingActivity) && { opacity: 0.6 }]}
                activeOpacity={0.85}
                disabled={isSavingActivity || isDeletingActivity}
                onPress={handleDeleteActivity}
              >
                {isDeletingActivity ? (
                  <ActivityIndicator color={THEME.colors.danger} />
                ) : (
                  <Text style={styles.sheetDeleteBtnText}>Hapus {editSport.toUpperCase()}</Text>
                )}
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40
  },

  // Top Bar (Matches ExploreScreen)
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 14
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  brandWordmark: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 22,
    color: THEME.colors.text,
    letterSpacing: -0.6,
    includeFontPadding: false
  },
  brandDot: {
    color: THEME.colors.primary
  },
  topBarDivider: {
    width: 1,
    height: 16,
    backgroundColor: THEME.colors.border
  },
  pageCrumb: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 13,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  iconCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },

  // Hero Athlete Card (Matte Tactile Elevated)
  heroCard: {
    backgroundColor: THEME.colors.cardElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 18,
    overflow: 'hidden',
    position: 'relative'
  },
  heroWatermark: {
    position: 'absolute',
    right: -18,
    top: -18
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  heroIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  avatarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: THEME.colors.card,
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 16,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  heroNameBlock: {
    flex: 1
  },
  heroName: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 18,
    color: THEME.colors.text,
    letterSpacing: -0.3,
    includeFontPadding: false
  },
  inlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4
  },
  inlineStatusText: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  ovrUnboxed: {
    alignItems: 'flex-end'
  },
  ovrNumSculptural: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 28,
    lineHeight: 30,
    color: THEME.colors.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.6,
    includeFontPadding: false
  },
  ovrSubLabel: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textMuted,
    letterSpacing: 0.8,
    marginTop: 3,
    includeFontPadding: false
  },
  heroStatsStrip: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    flexDirection: 'row',
    alignItems: 'center'
  },
  stripItem: {
    flex: 1,
    alignItems: 'center'
  },
  stripDivider: {
    width: 1,
    height: 24,
    backgroundColor: THEME.colors.border
  },
  stripVal: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 16,
    color: THEME.colors.text,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false
  },
  stripLbl: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 3,
    includeFontPadding: false
  },

  // Clean Bold Section Headers (No dots, no right-side filler)
  sectionHeadClean: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 12
  },
  sectionHeading: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 17,
    color: THEME.colors.text,
    letterSpacing: -0.3,
    includeFontPadding: false
  },

  // Matte Tactile Cards
  tactileCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 18
  },
  radarTactileCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center'
  },

  // Skor Kehadiran
  creditTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between'
  },
  creditScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline'
  },
  creditScoreBig: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 28,
    color: THEME.colors.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.6,
    includeFontPadding: false
  },
  creditScoreUnit: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 13,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  statusUnboxed: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 999,
    marginTop: 14,
    marginBottom: 12,
    overflow: 'hidden'
  },
  progressFillVolt: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: 999
  },
  creditMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  creditRuleText: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textMuted,
    includeFontPadding: false,
    flex: 1
  },
  historyLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3
  },
  historyLinkText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 11,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  inlineHighlights: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border
  },
  inlineHighlightsText: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },

  // Rating per Cabang
  skillStack: {
    gap: 10
  },
  skillRowCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative'
  },
  skillWatermark: {
    position: 'absolute',
    right: 42,
    top: -12
  },
  skillInfo: {
    flex: 1,
    gap: 3
  },
  skillSportName: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 14,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  skillSportSub: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  skillRatingCol: {
    alignItems: 'flex-end',
    gap: 1
  },
  skillRatingUnboxed: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 20,
    color: THEME.colors.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
    includeFontPadding: false
  },
  skillRatingLabel: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 9,
    color: THEME.colors.textMuted,
    letterSpacing: 0.8,
    includeFontPadding: false
  },
  emptySkillCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingVertical: 26,
    paddingHorizontal: 20,
    alignItems: 'center'
  },
  emptySkillTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 14,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  emptySkillSubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    includeFontPadding: false
  },

  // Calm Borderless Logout
  btnLogoutCalm: {
    marginTop: 22,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnLogoutCalmText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },

  // Guest Mode
  guestCard: {
    backgroundColor: THEME.colors.cardElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 12
  },
  guestTitle: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 18,
    color: THEME.colors.text,
    marginTop: 14,
    includeFontPadding: false
  },
  guestSubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 18,
    includeFontPadding: false
  },
  btnLoginPrimary: {
    backgroundColor: THEME.colors.primary,
    height: 48,
    paddingHorizontal: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  },
  btnLoginPrimaryText: {
    fontFamily: THEME.typography.fonts.extraBold,
    color: THEME.colors.textOnPrimary,
    fontSize: 14,
    includeFontPadding: false
  },
  addActivityBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.primaryMuted,
    borderWidth: 1,
    borderColor: THEME.colors.primaryBorder
  },
  addActivityBtnText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 11,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  emptySkillBtn: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.primary
  },
  emptySkillBtnText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.textOnPrimary,
    includeFontPadding: false
  },
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
    paddingHorizontal: 18,
    paddingTop: 10,
    maxHeight: '82%'
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
    marginBottom: 14
  },
  sheetTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 16,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  sheetSub: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
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
  sheetList: {
    maxHeight: 360
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    gap: 12
  },
  txLeft: {
    flex: 1,
    gap: 3
  },
  txReason: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 13,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  txMeta: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  txDeltaPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.sm,
    borderWidth: 1
  },
  txDeltaPos: {
    backgroundColor: THEME.colors.successSoft,
    borderColor: THEME.colors.successBorder
  },
  txDeltaNeg: {
    backgroundColor: THEME.colors.dangerSoft,
    borderColor: THEME.colors.dangerBorder
  },
  txDeltaText: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false
  },
  sheetLabel: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 6,
    includeFontPadding: false
  },
  sheetPillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10
  },
  sheetPillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10
  },
  sheetChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center'
  },
  sheetChipSmall: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border
  },
  sheetChipActive: {
    backgroundColor: THEME.colors.primaryMuted,
    borderColor: THEME.colors.primary
  },
  sheetChipText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  sheetChipTextActive: {
    color: THEME.colors.primary,
    fontFamily: THEME.typography.fonts.bold
  },
  sheetInput: {
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 14,
    height: 44,
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 13,
    color: THEME.colors.text,
    marginBottom: 10
  },
  sheetSaveBtn: {
    marginTop: 6,
    height: 48,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sheetSaveBtnText: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 14,
    color: THEME.colors.textOnPrimary,
    includeFontPadding: false
  },
  sheetDeleteBtn: {
    marginTop: 8,
    height: 44,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.dangerFill,
    borderWidth: 1,
    borderColor: THEME.colors.dangerBorder,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sheetDeleteBtnText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13,
    color: THEME.colors.danger,
    includeFontPadding: false
  },
  sheetTabRow: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.cardElevated,
    borderRadius: THEME.radius.md,
    padding: 4,
    gap: 4,
    marginBottom: 12
  },
  sheetTabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: THEME.radius.sm,
    alignItems: 'center'
  },
  sheetTabBtnActive: {
    backgroundColor: THEME.colors.primaryMuted
  },
  sheetTabText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  sheetTabTextActive: {
    color: THEME.colors.primary,
    fontFamily: THEME.typography.fonts.bold
  },
  reviewCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    gap: 5
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  reviewBadge: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    includeFontPadding: false
  },
  reviewNotes: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 13,
    color: THEME.colors.text,
    lineHeight: 19,
    includeFontPadding: false
  },
  reviewNoNotes: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  }
});
