import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions
} from 'react-native';
import Svg, { Path, Circle, Line, Polyline, Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../theme';
import { MainTabScreenProps } from '../navigation/types';
import { api, ApiSession } from '../services/api';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';

type Props = MainTabScreenProps<'Explore'>;

interface UserProfileHeader {
  fullName: string;
  creditScore: number;
  initials: string;
}

interface ParticipantSummary {
  count: number;
  avatars: string[];
}

// Fallback mock data jika server offline / belum ada sesi aktif
const FALLBACK_SESSIONS: ApiSession[] = [
  {
    id: 'fallback-1',
    host_id: 'host-1',
    title: 'Futsal Malam Santai 5v5',
    activity_type: 'futsal',
    session_category: 'sports',
    session_mode: 'play_now',
    status: 'OPEN',
    venue_id: 'venue-1',
    custom_location: null,
    start_time: new Date(Date.now() + 3600 * 1000 * 2).toISOString(),
    duration_minutes: 120,
    end_time: null,
    max_slots: 10,
    min_credit_score: 70,
    required_skill_level: 'Intermediate',
    team_format: '2_teams',
    estimated_cost_total: 300000,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    profiles: { full_name: 'Jeremy Marvel', credit_score: 98 },
    venues: { name: 'Tifosi Sport Center · Vinyl', address: 'Gading Serpong, Tangerang' }
  },
  {
    id: 'fallback-2',
    host_id: 'host-2',
    title: 'Badminton Ganda Men Intermediate',
    activity_type: 'badminton',
    session_category: 'sports',
    session_mode: 'play_now',
    status: 'OPEN',
    venue_id: 'venue-2',
    custom_location: null,
    start_time: new Date(Date.now() + 3600 * 1000 * 1.5).toISOString(),
    duration_minutes: 90,
    end_time: null,
    max_slots: 4,
    min_credit_score: 80,
    required_skill_level: 'Intermediate',
    team_format: '2_teams',
    estimated_cost_total: 100000,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    profiles: { full_name: 'Ben Arief', credit_score: 92 },
    venues: { name: 'Champion Court Gading Serpong', address: 'Kelapa Dua, Tangerang' }
  },
  {
    id: 'fallback-3',
    host_id: 'host-3',
    title: 'MLBB Mythic Push Party Full Squad',
    activity_type: 'mlbb',
    session_category: 'esports',
    session_mode: 'play_now',
    status: 'OPEN',
    venue_id: null,
    custom_location: 'Discord Voice Room #01',
    start_time: new Date(Date.now() + 3600 * 1000 * 3).toISOString(),
    duration_minutes: 120,
    end_time: null,
    max_slots: 5,
    min_credit_score: 85,
    required_skill_level: 'Advanced',
    team_format: '2_teams',
    estimated_cost_total: 0,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    profiles: { full_name: 'Hyun Striker', credit_score: 88 },
    venues: null
  },
  {
    id: 'fallback-4',
    host_id: 'host-4',
    title: 'Futsal Akhir Pekan Friendly Match',
    activity_type: 'futsal',
    session_category: 'sports',
    session_mode: 'scheduled',
    status: 'OPEN',
    venue_id: 'venue-1',
    custom_location: null,
    start_time: new Date(Date.now() + 3600 * 1000 * 24).toISOString(),
    duration_minutes: 120,
    end_time: null,
    max_slots: 10,
    min_credit_score: 75,
    required_skill_level: 'Beginner',
    team_format: '2_teams',
    estimated_cost_total: 280000,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    profiles: { full_name: 'Jerikho Ruben', credit_score: 95 },
    venues: { name: 'GOR Gondrong · Cipondoh', address: 'Kota Tangerang' }
  }
];

function getInitials(name: string): string {
  if (!name) return 'MB';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatTimeHHMM(isoDateStr: string): string {
  try {
    const d = new Date(isoDateStr);
    if (isNaN(d.getTime())) return '19:00';
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '19:00';
  }
}

function getSportLabel(activityType: string = ''): string {
  const act = activityType.toLowerCase();
  if (act.includes('futsal')) return 'Futsal';
  if (act.includes('badminton')) return 'Badminton';
  if (act.includes('basket')) return 'Basket';
  if (act.includes('mini_soccer')) return 'Mini Soccer';
  if (act.includes('mlbb')) return 'MLBB';
  if (act.includes('valorant')) return 'Valorant';
  return activityType ? activityType.charAt(0).toUpperCase() + activityType.slice(1) : 'Mabar';
}

function getFormatLabel(activityType: string = '', maxSlots: number = 10): string {
  const act = activityType.toLowerCase();
  if (act.includes('badminton')) return maxSlots <= 2 ? '1V1' : '2V2';
  if (act.includes('basket')) return maxSlots <= 6 ? '3V3' : '5V5';
  if (act.includes('mlbb') || act.includes('valorant')) return '5V5';
  if (maxSlots >= 12) return '7V7';
  if (maxSlots === 10) return '5V5';
  if (maxSlots === 8) return '4V4';
  if (maxSlots === 6) return '3V3';
  return `${Math.max(1, Math.floor(maxSlots / 2))}V${Math.max(1, Math.floor(maxSlots / 2))}`;
}

function getSportTheme(activityType: string = ''): { hex: string; textHex: string } {
  const act = activityType.toLowerCase();
  if (act.includes('badminton')) return { hex: THEME.colors.success, textHex: THEME.colors.success };
  if (act.includes('basket')) return { hex: THEME.colors.warning, textHex: THEME.colors.warning };
  if (act.includes('mlbb') || act.includes('valorant')) {
    return { hex: '#7B79FF', textHex: '#9391FF' };
  }
  return { hex: THEME.colors.primary, textHex: THEME.colors.primary };
}

function formatShortPrice(totalCost: number | null | undefined, slots: number): { isFree: boolean; numStr: string } {
  if (!totalCost || totalCost <= 0) return { isFree: true, numStr: 'Gratis' };
  const perPerson = Math.round(totalCost / Math.max(slots, 1));
  if (perPerson >= 1000) {
    return { isFree: false, numStr: `${Math.round(perPerson / 1000)}` };
  }
  return { isFree: false, numStr: `${perPerson}` };
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

// --- MONOCHROME VECTOR ICONS ---
function SearchIcon({ color, size = 17 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={8} stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1={21} y1={21} x2={16.65} y2={16.65} stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CloseIcon({ color, size = 15 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={18} y1={6} x2={6} y2={18} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1={6} y1={6} x2={18} y2={18} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MapPinIcon({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={10} r={3} stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronDownIcon({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="6 9 12 15 18 9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ShieldIcon({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ArrowRightIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={5} y1={12} x2={19} y2={12} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="12 5 19 12 12 19" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// --- ARCHITECTURAL SPORT COURT WATERMARKS ---
function SportWatermark({ sport, dark }: { sport: string; dark: boolean }) {
  const strokeColor = dark ? 'rgba(10,11,14,0.11)' : 'rgba(255,255,255,0.06)';
  const s = sport.toLowerCase();

  if (s.includes('badminton')) {
    return (
      <Svg width={180} height={180} viewBox="0 0 200 200" fill="none" style={styles.sportWatermark}>
        <Rect x={15} y={15} width={170} height={170} stroke={strokeColor} strokeWidth={1} />
        <Line x1={30} y1={15} x2={30} y2={185} stroke={strokeColor} strokeWidth={1} />
        <Line x1={170} y1={15} x2={170} y2={185} stroke={strokeColor} strokeWidth={1} />
        <Line x1={15} y1={100} x2={185} y2={100} stroke={strokeColor} strokeWidth={1} strokeDasharray="4 4" />
        <Line x1={15} y1={72} x2={185} y2={72} stroke={strokeColor} strokeWidth={1} />
        <Line x1={15} y1={128} x2={185} y2={128} stroke={strokeColor} strokeWidth={1} />
        <Line x1={100} y1={15} x2={100} y2={72} stroke={strokeColor} strokeWidth={1} />
        <Line x1={100} y1={128} x2={100} y2={185} stroke={strokeColor} strokeWidth={1} />
      </Svg>
    );
  }

  if (s.includes('basket')) {
    return (
      <Svg width={180} height={180} viewBox="0 0 200 200" fill="none" style={styles.sportWatermark}>
        <Rect x={15} y={15} width={170} height={170} stroke={strokeColor} strokeWidth={1} />
        <Circle cx={100} cy={100} r={30} stroke={strokeColor} strokeWidth={1} />
        <Path d="M 50 15 L 50 75 A 45 45 0 0 0 150 75 L 150 15" stroke={strokeColor} strokeWidth={1} />
        <Rect x={70} y={15} width={60} height={60} stroke={strokeColor} strokeWidth={1} />
        <Circle cx={100} cy={35} r={8} stroke={strokeColor} strokeWidth={1} />
      </Svg>
    );
  }

  return (
    <Svg width={180} height={180} viewBox="0 0 200 200" fill="none" style={styles.sportWatermark}>
      <Rect x={10} y={10} width={180} height={180} rx={8} stroke={strokeColor} strokeWidth={1} />
      <Line x1={10} y1={100} x2={190} y2={100} stroke={strokeColor} strokeWidth={1} />
      <Circle cx={100} cy={100} r={26} stroke={strokeColor} strokeWidth={1} />
      <Circle cx={100} cy={100} r={2} fill={strokeColor} />
      <Rect x={55} y={10} width={90} height={40} stroke={strokeColor} strokeWidth={1} />
      <Rect x={75} y={10} width={50} height={18} stroke={strokeColor} strokeWidth={1} />
      <Path d="M78 50 C78 62 122 62 122 50" stroke={strokeColor} strokeWidth={1} />
      <Rect x={55} y={150} width={90} height={40} stroke={strokeColor} strokeWidth={1} />
      <Rect x={75} y={172} width={50} height={18} stroke={strokeColor} strokeWidth={1} />
      <Path d="M78 150 C78 138 122 138 122 150" stroke={strokeColor} strokeWidth={1} />
    </Svg>
  );
}

// --- OVERLAPPING AVATAR FACEPILE ---
function AvatarFacepile({
  names,
  extra,
  dark,
  ringOverride
}: {
  names: string[];
  extra: number;
  dark: boolean;
  ringOverride?: string;
}) {
  const ringColor = ringOverride || (dark ? THEME.colors.primary : THEME.colors.card);
  const circleBg = dark ? THEME.colors.background : '#1E2433';
  const circleText = dark ? THEME.colors.primary : THEME.colors.text;
  const extraBg = dark ? THEME.colors.background : 'rgba(255,255,255,0.1)';
  const extraText = dark ? THEME.colors.text : THEME.colors.textSecondary;

  return (
    <View style={styles.facepileRow}>
      {names.map((n, idx) => (
        <View
          key={`${n}-${idx}`}
          style={[
            styles.facepileCircle,
            {
              backgroundColor: circleBg,
              borderColor: ringColor,
              marginLeft: idx === 0 ? 0 : -6
            }
          ]}
        >
          <Text style={[styles.facepileText, { color: circleText }]}>{n}</Text>
        </View>
      ))}
      {extra > 0 && (
        <View
          style={[
            styles.facepileExtra,
            {
              backgroundColor: extraBg,
              borderColor: ringColor,
              marginLeft: names.length > 0 ? -6 : 0
            }
          ]}
        >
          <Text style={[styles.facepileText, { color: extraText }]}>+{extra}</Text>
        </View>
      )}
    </View>
  );
}

const CATEGORIES = ['Semua', 'Futsal', 'Badminton', 'Basket', 'MLBB'];

const CATEGORY_EMPTY_ICONS: Record<string, string> = {
  Semua: '🏆',
  Futsal: '⚽',
  Badminton: '🏸',
  Basket: '🏀',
  MLBB: '🎮'
};

export default function ExploreScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const { width: screenWidth } = useWindowDimensions();
  const bentoCardWidth = (screenWidth - 40 - 10) / 2;

  const [profile, setProfile] = useState<UserProfileHeader>({
    fullName: 'Pemain Mabar',
    creditScore: 100,
    initials: 'PM'
  });

  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [participantMap, setParticipantMap] = useState<Record<string, ParticipantSummary>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadUserProfile = useCallback(async () => {
    if (!user) {
      setProfile({ fullName: 'Pemain Mabar', creditScore: 100, initials: 'PM' });
      return;
    }

    try {
      const apiProf = await api.getMyProfile();
      if (apiProf && apiProf.full_name) {
        setProfile({
          fullName: apiProf.full_name,
          creditScore: apiProf.credit_score ?? 100,
          initials: getInitials(apiProf.full_name)
        });
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, credit_score')
        .eq('id', user.id)
        .maybeSingle();

      const fallbackName =
        data?.full_name ||
        user.user_metadata?.full_name ||
        user.email?.split('@')[0] ||
        'Pemain Mabar';

      setProfile({
        fullName: fallbackName,
        creditScore: (!error && data?.credit_score) ?? 100,
        initials: getInitials(fallbackName)
      });
    } catch (err) {
      console.warn('[ExploreScreen] Error loading profile:', err);
    }
  }, [user]);

  const fetchSessionsData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await api.getSessions();
      if (data && Array.isArray(data) && data.length > 0) {
        setSessions(data);

        const sessionIds = data.map((s) => s.id);
        const { data: parts, error: partErr } = await supabase
          .from('session_participants')
          .select('session_id, profiles:user_id(full_name)')
          .in('session_id', sessionIds)
          .neq('attendance_status', 'CANCELLED')
          .order('slot_number', { ascending: true });

        if (!partErr && parts) {
          const map: Record<string, ParticipantSummary> = {};
          parts.forEach((p: any) => {
            if (!map[p.session_id]) {
              map[p.session_id] = { count: 0, avatars: [] };
            }
            map[p.session_id].count += 1;
            const pProfile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
            const initials = getInitials(pProfile?.full_name || 'PM');
            if (map[p.session_id].avatars.length < 3) {
              map[p.session_id].avatars.push(initials);
            }
          });
          setParticipantMap(map);
        }
      } else {
        setSessions(FALLBACK_SESSIONS);
      }
    } catch (err) {
      console.warn('[ExploreScreen] Gagal memuat sesi live dari API, menggunakan fallback:', err);
      setSessions(FALLBACK_SESSIONS);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUserProfile();
    fetchSessionsData();
  }, [loadUserProfile, fetchSessionsData]);

  useEffect(() => {
    const channel = supabase
      .channel('explore-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        fetchSessionsData(false);
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_participants' },
        () => {
          fetchSessionsData(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSessionsData]);

  const activeSessions = useMemo(() => {
    return sessions.filter((s) => s.status !== 'CANCELLED' && s.status !== 'COMPLETED');
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return activeSessions.filter((s) => {
      const matchesCat =
        selectedCategory === 'Semua' ||
        (s.activity_type &&
          s.activity_type.toLowerCase().includes(selectedCategory.toLowerCase())) ||
        (selectedCategory === 'MLBB' && s.session_category === 'esports');

      const venueName = s.venues?.name || s.custom_location || '';
      const hostName = s.profiles?.full_name || '';
      const matchesSearch =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.activity_type.toLowerCase().includes(q) ||
        venueName.toLowerCase().includes(q) ||
        hostName.toLowerCase().includes(q);

      return matchesCat && matchesSearch;
    });
  }, [activeSessions, selectedCategory, searchQuery]);

  const getSlotStats = useCallback(
    (s: ApiSession) => {
      const total = s.max_slots || 10;
      const summary = participantMap[s.id];
      const filled = Math.min(total, summary?.count || 1);
      const remaining = Math.max(0, total - filled);
      const hostInitials = getInitials(s.profiles?.full_name || 'Host');
      const rawAvatars = summary?.avatars?.length ? summary.avatars : [hostInitials];
      const extra = Math.max(0, filled - rawAvatars.length);
      return { total, filled, remaining, avatars: rawAvatars, extra };
    },
    [participantMap]
  );

  // Hero "Hampir Penuh": sesi OPEN dengan sisa <= 2 pemain
  const urgentSessions = useMemo(() => {
    return filteredSessions.filter((s) => {
      const { remaining } = getSlotStats(s);
      return s.status === 'OPEN' && remaining > 0 && remaining <= 2;
    });
  }, [filteredSessions, getSlotStats]);

  // Split "Hari Ini" vs "Besok / Mendatang"
  const { todaySessions, upcomingSessions } = useMemo(() => {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const today: ApiSession[] = [];
    const upcoming: ApiSession[] = [];

    filteredSessions.forEach((s) => {
      const start = new Date(s.start_time);
      if (isNaN(start.getTime()) || isSameCalendarDay(start, now)) {
        today.push(s);
      } else if (start > endOfToday) {
        upcoming.push(s);
      } else {
        // Sesi OPEN dari tanggal sebelumnya tetap ditampilkan di Hari Ini agar tidak hilang saat testing
        today.push(s);
      }
    });

    today.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    upcoming.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    return { todaySessions: today, upcomingSessions: upcoming };
  }, [filteredSessions]);

  const handleOpenLobby = (session: ApiSession) => {
    navigation.navigate('Lobby', {
      sessionId: session.id,
      sessionTitle: session.title
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchSessionsData(true)}
            tintColor={THEME.colors.primary}
            colors={[THEME.colors.primary]}
          />
        }
      >
        {/* 1. GROUNDED 1-ROW NATIVE MOBILE TOP BAR + COLLAPSIBLE SEARCH */}
        <View style={styles.topBarWrapper}>
          <View style={styles.topBarRow}>
            {/* Left: mabar. + hairline + Tangerang */}
            <View style={styles.topBarLeft}>
              <Text style={styles.brandWordmark}>
                mabar<Text style={styles.brandDot}>.</Text>
              </Text>
              <View style={styles.topBarDivider} />
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.locationTrigger}
                onPress={() => fetchSessionsData(true)}
              >
                <MapPinIcon color={THEME.colors.primary} size={13} />
                <Text style={styles.locationText}>Tangerang</Text>
                <ChevronDownIcon color={THEME.colors.textMuted} size={12} />
              </TouchableOpacity>
            </View>

            {/* Right: Search Toggle + Shield Score + Avatar */}
            <View style={styles.topBarRight}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSearchOpen((prev) => !prev)}
                style={[styles.searchToggleBtn, searchOpen && styles.searchToggleBtnActive]}
                accessibilityLabel="Cari Sesi"
              >
                {searchOpen ? (
                  <CloseIcon color={THEME.colors.textOnPrimary} size={16} />
                ) : (
                  <SearchIcon color={THEME.colors.textMuted} size={17} />
                )}
              </TouchableOpacity>

              <View style={styles.scoreCluster}>
                <ShieldIcon color={THEME.colors.textMuted} size={12} />
                <Text style={styles.scoreText}>{profile.creditScore}</Text>
              </View>

              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{profile.initials}</Text>
              </View>
            </View>
          </View>

          {searchOpen && (
            <View style={styles.collapsibleSearchBox}>
              <SearchIcon color={THEME.colors.primary} size={15} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Cari futsal, lapangan, atau lokasi..."
                placeholderTextColor={THEME.colors.textMuted}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                  <CloseIcon color={THEME.colors.textMuted} size={14} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* 2. SCULPTURAL CATEGORY CHIPS (Locked Height 44px, Text Only) */}
        <View style={styles.categoryBarWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScrollFix}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  activeOpacity={0.8}
                  onPress={() => setSelectedCategory(cat)}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                >
                  <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* LOADING */}
        {isLoading && !isRefreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
            <Text style={styles.loadingText}>Memuat sesi mabar...</Text>
          </View>
        ) : filteredSessions.length === 0 ? (
          /* EMPTY STATE */
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{CATEGORY_EMPTY_ICONS[selectedCategory] || '🏆'}</Text>
            <Text style={styles.emptyTitle}>Belum Ada Sesi Tersedia</Text>
            <Text style={styles.emptySubtitle}>
              Tidak ditemukan sesi untuk kategori "{selectedCategory}". Coba ubah filter atau buat sesi mabar baru!
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('Create')}
            >
              <Text style={styles.emptyBtnText}>+ Buat Sesi Baru</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* 3. SECTION 1: "HAMPIR PENUH" — HORIZONTAL HERO POSTERS */}
            {urgentSessions.length > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionTitleWithDot}>
                    <View style={styles.voltDot} />
                    <Text style={styles.sectionHeading}>Hampir Penuh</Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedCategory('Semua');
                      setSearchQuery('');
                    }}
                  >
                    <Text style={styles.sectionActionLink}>Lihat semua</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.heroCarouselWrapper}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.horizontalScrollFix}
                    contentContainerStyle={styles.heroCarouselContent}
                  >
                  {urgentSessions.map((s, idx) => {
                    const isFirst = idx === 0;
                    const sport = getSportLabel(s.activity_type);
                    const format = getFormatLabel(s.activity_type, s.max_slots);
                    const timeStr = formatTimeHHMM(s.start_time);
                    const venue = s.venues?.name || s.custom_location || 'Venue Mabar';
                    const stats = getSlotStats(s);
                    const price = formatShortPrice(s.estimated_cost_total, stats.total);

                    return (
                      <TouchableOpacity
                        key={s.id}
                        activeOpacity={0.9}
                        onPress={() => handleOpenLobby(s)}
                        style={[
                          styles.heroCard,
                          isFirst ? styles.heroCardVolt : styles.heroCardDark
                        ]}
                      >
                        <SportWatermark sport={sport} dark={isFirst} />

                        <Text
                          style={[
                            styles.heroGhostFormat,
                            { color: isFirst ? 'rgba(10,11,14,0.06)' : 'rgba(255,255,255,0.03)' }
                          ]}
                        >
                          {format}
                        </Text>

                        {/* Top Rail */}
                        <View style={styles.heroTopRail}>
                          <Text
                            style={[
                              styles.heroSportMeta,
                              { color: isFirst ? THEME.colors.textOnPrimary : THEME.colors.text }
                            ]}
                          >
                            {sport.toUpperCase()} {format}
                          </Text>
                          <Text
                            style={[
                              styles.heroUrgencyText,
                              {
                                color: isFirst
                                  ? 'rgba(10,11,14,0.8)'
                                  : THEME.colors.warning
                              }
                            ]}
                          >
                            Kurang {stats.remaining} pemain
                          </Text>
                        </View>

                        {/* Solid 36px Kickoff Time + Title + Venue */}
                        <View style={styles.heroMiddle}>
                          <Text
                            style={[
                              styles.heroKickoff,
                              { color: isFirst ? THEME.colors.textOnPrimary : THEME.colors.text }
                            ]}
                          >
                            {timeStr}
                          </Text>
                          <Text
                            numberOfLines={2}
                            style={[
                              styles.heroTitle,
                              { color: isFirst ? THEME.colors.textOnPrimary : THEME.colors.text }
                            ]}
                          >
                            {s.title}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.heroVenue,
                              {
                                color: isFirst
                                  ? 'rgba(10,11,14,0.75)'
                                  : THEME.colors.textMuted
                              }
                            ]}
                          >
                            {venue}
                          </Text>
                        </View>

                        {/* Swiss 3-Col Grid */}
                        <View
                          style={[
                            styles.heroGrid,
                            {
                              borderTopColor: isFirst
                                ? 'rgba(10,11,14,0.15)'
                                : 'rgba(255,255,255,0.08)'
                            }
                          ]}
                        >
                          <View style={styles.heroGridCol}>
                            <Text
                              style={[
                                styles.heroGridLabel,
                                {
                                  color: isFirst
                                    ? 'rgba(10,11,14,0.6)'
                                    : THEME.colors.textMuted
                                }
                              ]}
                            >
                              MIN. SKOR
                            </Text>
                            <Text
                              style={[
                                styles.heroGridValue,
                                { color: isFirst ? THEME.colors.textOnPrimary : THEME.colors.text }
                              ]}
                            >
                              {s.min_credit_score ?? 70}+
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.heroGridColMid,
                              {
                                borderColor: isFirst
                                  ? 'rgba(10,11,14,0.15)'
                                  : 'rgba(255,255,255,0.08)'
                              }
                            ]}
                          >
                            <Text
                              style={[
                                styles.heroGridLabel,
                                {
                                  color: isFirst
                                    ? 'rgba(10,11,14,0.6)'
                                    : THEME.colors.textMuted
                                }
                              ]}
                            >
                              PEMAIN
                            </Text>
                            <Text
                              style={[
                                styles.heroGridValue,
                                { color: isFirst ? THEME.colors.textOnPrimary : THEME.colors.text }
                              ]}
                            >
                              {String(stats.filled).padStart(2, '0')}
                              <Text
                                style={[
                                  styles.heroGridSubValue,
                                  {
                                    color: isFirst
                                      ? 'rgba(10,11,14,0.7)'
                                      : THEME.colors.textMuted
                                  }
                                ]}
                              >
                                /{stats.total}
                              </Text>
                            </Text>
                          </View>

                          <View style={styles.heroGridColRight}>
                            <Text
                              style={[
                                styles.heroGridLabel,
                                {
                                  color: isFirst
                                    ? 'rgba(10,11,14,0.6)'
                                    : THEME.colors.textMuted
                                }
                              ]}
                            >
                              PATUNGAN
                            </Text>
                            <Text
                              style={[
                                styles.heroGridValue,
                                { color: isFirst ? THEME.colors.textOnPrimary : THEME.colors.text }
                              ]}
                            >
                              {price.isFree ? 'Gratis' : `Rp ${price.numStr}k`}
                            </Text>
                          </View>
                        </View>

                        {/* Bottom Row: Facepile + Circular Arrow */}
                        <View
                          style={[
                            styles.heroBottomRow,
                            {
                              borderTopColor: isFirst
                                ? 'rgba(10,11,14,0.15)'
                                : 'rgba(255,255,255,0.08)'
                            }
                          ]}
                        >
                          <AvatarFacepile
                            names={stats.avatars}
                            extra={stats.extra}
                            dark={isFirst}
                          />

                          <View
                            style={[
                              styles.heroArrowBtn,
                              {
                                backgroundColor: isFirst
                                  ? THEME.colors.background
                                  : 'rgba(255,255,255,0.1)'
                              }
                            ]}
                          >
                            <ArrowRightIcon
                              color={isFirst ? THEME.colors.primary : THEME.colors.text}
                              size={16}
                            />
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  </ScrollView>
                </View>
              </View>
            )}

            {/* 4. SECTION 2: "HARI INI" — FULL-WIDTH ATHLETIC MATCH CARDS (C BIASA) */}
            {todaySessions.length > 0 && (
              <View style={styles.paddedSection}>
                <View style={styles.sectionHeaderNoPad}>
                  <Text style={styles.sectionHeading}>Hari Ini</Text>
                  <Text style={styles.sectionCountMeta}>{todaySessions.length} sesi</Text>
                </View>

                <View style={styles.todayCardsList}>
                  {todaySessions.map((s) => {
                    const sport = getSportLabel(s.activity_type);
                    const format = getFormatLabel(s.activity_type, s.max_slots);
                    const timeStr = formatTimeHHMM(s.start_time);
                    const venue = s.venues?.name || s.custom_location || 'Venue Mabar';
                    const stats = getSlotStats(s);
                    const price = formatShortPrice(s.estimated_cost_total, stats.total);
                    const isLastPlayer = stats.remaining === 1;
                    const st = getSportTheme(s.activity_type);
                    const pipCount = Math.min(stats.total, 14);
                    const filledPips =
                      stats.total <= 14
                        ? stats.filled
                        : Math.round((stats.filled / Math.max(stats.total, 1)) * pipCount);

                    return (
                      <TouchableOpacity
                        key={s.id}
                        activeOpacity={0.88}
                        onPress={() => handleOpenLobby(s)}
                        style={styles.todayCard}
                      >
                        {/* Top Row: Solid 26px Time + WIB | Colored Sport · Format */}
                        <View style={styles.todayTopRow}>
                          <View style={styles.todayTimeWrap}>
                            <Text style={styles.todayTimeText}>{timeStr}</Text>
                            <Text style={styles.todayWibText}>WIB</Text>
                          </View>
                          <Text style={[styles.todaySportMeta, { color: st.textHex }]}>
                            {sport.toUpperCase()} · {format}
                          </Text>
                        </View>

                        {/* Middle: Full-width Title & Colored Pin Venue */}
                        <Text style={styles.todayTitle}>{s.title}</Text>
                        <View style={styles.todayVenueRow}>
                          <MapPinIcon color={st.hex} size={12} />
                          <Text numberOfLines={1} style={styles.todayVenueText}>
                            {venue}
                          </Text>
                        </View>

                        {/* Segmented Sport-Colored Quota Pips */}
                        <View style={styles.todayPipsRow}>
                          {Array.from({ length: pipCount }, (_, i) => (
                            <View
                              key={i}
                              style={[
                                styles.todayPip,
                                {
                                  backgroundColor:
                                    i < filledPips ? st.hex : 'rgba(255,255,255,0.09)'
                                }
                              ]}
                            />
                          ))}
                        </View>

                        {/* Bottom Row: Facepile + Player Status | Price */}
                        <View style={styles.todayBottomRow}>
                          <View style={styles.todayBottomLeft}>
                            <AvatarFacepile
                              names={stats.avatars}
                              extra={stats.extra}
                              dark={false}
                              ringOverride="#171A24"
                            />
                            <Text style={styles.todayPlayerStatus}>
                              {isLastPlayer ? (
                                <>
                                  {stats.filled}/{stats.total} ·{' '}
                                  <Text style={[styles.kurangSatuHighlight, { color: st.textHex }]}>
                                    kurang 1
                                  </Text>
                                </>
                              ) : (
                                `${stats.filled}/${stats.total} pemain`
                              )}
                            </Text>
                          </View>

                          <View>
                            {price.isFree ? (
                              <Text style={[styles.todayPriceFree, { color: st.textHex }]}>
                                Gratis
                              </Text>
                            ) : (
                              <Text style={styles.todayPriceNum}>Rp {price.numStr}k</Text>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 5. SECTION 3: "BESOK" — 2-COLUMN BENTO GRID (C BIASA) */}
            {upcomingSessions.length > 0 && (
              <View style={styles.paddedSection}>
                <View style={styles.sectionHeaderNoPad}>
                  <Text style={styles.sectionHeading}>Besok</Text>
                  <Text style={styles.sectionCountMeta}>{upcomingSessions.length} sesi</Text>
                </View>

                <View style={styles.bentoGrid}>
                  {upcomingSessions.map((s) => {
                    const sport = getSportLabel(s.activity_type);
                    const timeStr = formatTimeHHMM(s.start_time);
                    const venue = s.venues?.name || s.custom_location || 'Venue Mabar';
                    const stats = getSlotStats(s);
                    const price = formatShortPrice(s.estimated_cost_total, stats.total);
                    const st = getSportTheme(s.activity_type);

                    return (
                      <TouchableOpacity
                        key={s.id}
                        activeOpacity={0.88}
                        onPress={() => handleOpenLobby(s)}
                        style={[styles.bentoCard, { width: bentoCardWidth }]}
                      >
                        <View>
                          <View style={styles.bentoTopRow}>
                            <Text style={[styles.bentoSport, { color: st.textHex }]}>
                              {sport.toUpperCase()}
                            </Text>
                            <Text style={styles.bentoTime}>{timeStr}</Text>
                          </View>

                          <Text numberOfLines={2} style={styles.bentoTitle}>
                            {s.title}
                          </Text>
                          <Text numberOfLines={1} style={styles.bentoVenue}>
                            {venue}
                          </Text>
                        </View>

                        <View style={styles.bentoBottomRow}>
                          <Text style={styles.bentoPlayers}>
                            {stats.filled}/{stats.total} pemain
                          </Text>
                          <Text
                            style={[
                              styles.bentoPrice,
                              price.isFree && { color: st.textHex }
                            ]}
                          >
                            {price.isFree ? 'Gratis' : `Rp ${price.numStr}k`}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
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
    paddingBottom: 32
  },

  // 1. Grounded 1-Row Native Top Bar
  topBarWrapper: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  brandWordmark: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 20,
    color: THEME.colors.text,
    letterSpacing: -0.8,
    includeFontPadding: false
  },
  brandDot: {
    color: THEME.colors.primary
  },
  topBarDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 10
  },
  locationTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  locationText: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 13,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  searchToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },
  searchToggleBtnActive: {
    backgroundColor: THEME.colors.primary
  },
  scoreCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  scoreText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#181C26',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 11,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  collapsibleSearchBox: {
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: '#141720',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(213, 255, 64, 0.4)'
  },
  searchInput: {
    flex: 1,
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 13,
    color: THEME.colors.text,
    paddingVertical: 0,
    includeFontPadding: false
  },

  // 2. Category Chips
  categoryBarWrapper: {
    height: 44,
    justifyContent: 'center'
  },
  horizontalScrollFix: {
    flexGrow: 0,
    flexShrink: 0
  },
  categoryScroll: {
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#151821',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)'
  },
  categoryChipActive: {
    backgroundColor: THEME.colors.text,
    borderColor: THEME.colors.text
  },
  categoryChipText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  categoryChipTextActive: {
    color: THEME.colors.textOnPrimary
  },

  // Loading & Empty
  loadingContainer: {
    paddingVertical: 56,
    alignItems: 'center',
    gap: 12
  },
  loadingText: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 13,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  emptyContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
    includeFontPadding: false
  },
  emptyTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 16,
    color: THEME.colors.text,
    marginBottom: 6,
    includeFontPadding: false
  },
  emptySubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    includeFontPadding: false
  },
  emptyBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: THEME.radius.md
  },
  emptyBtnText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13,
    color: THEME.colors.textOnPrimary,
    includeFontPadding: false
  },

  // Section Headers
  sectionBlock: {
    paddingTop: 20
  },
  paddedSection: {
    paddingHorizontal: 20,
    paddingTop: 26
  },
  sectionHeaderRow: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12
  },
  sectionHeaderNoPad: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12
  },
  sectionTitleWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  voltDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.primary
  },
  sectionHeading: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 17,
    color: THEME.colors.text,
    letterSpacing: -0.3,
    includeFontPadding: false
  },
  sectionActionLink: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 12,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  sectionCountMeta: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 12,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },

  // 3. Hero Carousel ("Hampir Penuh")
  heroCarouselWrapper: {
    height: 282
  },
  heroCarouselContent: {
    paddingHorizontal: 20,
    paddingBottom: 6,
    gap: 12
  },
  heroCard: {
    width: 290,
    height: 276,
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    justifyContent: 'space-between'
  },
  heroCardVolt: {
    backgroundColor: THEME.colors.primary
  },
  heroCardDark: {
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)'
  },
  sportWatermark: {
    position: 'absolute',
    right: -24,
    top: -24,
    opacity: 0.7
  },
  heroGhostFormat: {
    position: 'absolute',
    right: -10,
    top: -8,
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 96,
    letterSpacing: -4,
    includeFontPadding: false
  },
  heroTopRail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8
  },
  heroSportMeta: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 11,
    letterSpacing: 1,
    includeFontPadding: false
  },
  heroUrgencyText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    includeFontPadding: false
  },
  heroMiddle: {
    marginVertical: 4
  },
  heroKickoff: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 36,
    letterSpacing: -1.4,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false
  },
  heroTitle: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 17,
    lineHeight: 22,
    marginTop: 4,
    includeFontPadding: false
  },
  heroVenue: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 12,
    marginTop: 3,
    includeFontPadding: false
  },
  heroGrid: {
    flexDirection: 'row',
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1
  },
  heroGridCol: {
    flex: 1
  },
  heroGridColMid: {
    flex: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 8
  },
  heroGridColRight: {
    flex: 1,
    paddingLeft: 8
  },
  heroGridLabel: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    letterSpacing: 0.6,
    includeFontPadding: false
  },
  heroGridValue: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 13,
    marginTop: 3,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false
  },
  heroGridSubValue: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    includeFontPadding: false
  },
  heroBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 10,
    borderTopWidth: 1
  },
  heroArrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },

  // Facepile
  facepileRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  facepileCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  facepileExtra: {
    height: 28,
    paddingHorizontal: 7,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  facepileText: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 10,
    includeFontPadding: false
  },

  // 4. "Hari Ini" Full-Width Cards (C Biasa)
  todayCardsList: {
    gap: 12
  },
  todayCard: {
    backgroundColor: '#171A24',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden'
  },
  todayTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  todayTimeWrap: {
    flexDirection: 'row',
    alignItems: 'baseline'
  },
  todayTimeText: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 26,
    color: THEME.colors.text,
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false
  },
  todayWibText: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginLeft: 6,
    includeFontPadding: false
  },
  todaySportMeta: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 11,
    letterSpacing: 0.8,
    includeFontPadding: false
  },
  todayTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 15,
    color: THEME.colors.text,
    lineHeight: 20,
    marginTop: 10,
    includeFontPadding: false
  },
  todayVenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4
  },
  todayVenueText: {
    flex: 1,
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: '#B8C0CE',
    includeFontPadding: false
  },
  todayPipsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 12
  },
  todayPip: {
    flex: 1,
    height: 4,
    borderRadius: 999
  },
  todayBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 10
  },
  todayBottomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  todayPlayerStatus: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false
  },
  kurangSatuHighlight: {
    fontFamily: THEME.typography.fonts.bold
  },
  todayPriceNum: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 15,
    color: THEME.colors.text,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false
  },
  todayPriceFree: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 15,
    includeFontPadding: false
  },

  // 5. "Besok" 2-Column Bento Grid (C Biasa)
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  bentoCard: {
    backgroundColor: '#171A24',
    borderRadius: 16,
    padding: 14,
    minHeight: 156,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    justifyContent: 'space-between',
    overflow: 'hidden'
  },
  bentoTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  bentoSport: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 10,
    letterSpacing: 0.6,
    includeFontPadding: false
  },
  bentoTime: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 18,
    color: THEME.colors.text,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false
  },
  bentoTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13,
    color: THEME.colors.text,
    lineHeight: 18,
    marginTop: 8,
    includeFontPadding: false
  },
  bentoVenue: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 4,
    includeFontPadding: false
  },
  bentoBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)'
  },
  bentoPlayers: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false
  },
  bentoPrice: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 13,
    color: THEME.colors.text,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false
  }
});
