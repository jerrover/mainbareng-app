import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { THEME } from '../theme';
import { MainTabParamList } from '../navigation/types';
import { api, ApiSession } from '../services/api';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';

type Props = BottomTabScreenProps<MainTabParamList, 'Explore'>;

interface UserProfileHeader {
  fullName: string;
  creditScore: number;
  initials: string;
  tier: string;
}

// Fallback mock data jika server offline / belum ada sesi aktif
const FALLBACK_SESSIONS: ApiSession[] = [
  {
    id: 'fallback-1',
    host_id: 'host-1',
    title: 'Futsal Malam Santai 5v5 Serpong',
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
    notes: 'Bawa jersey cadangan hitam/putih',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    profiles: {
      full_name: 'Jeremy Marvel',
      credit_score: 98
    },
    venues: {
      name: 'Tifosi Sport Center · Vinyl',
      address: 'Gading Serpong, Tangerang'
    }
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
    start_time: new Date(Date.now() + 3600 * 1000 * 3.5).toISOString(),
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
    profiles: {
      full_name: 'Ben_Mobile',
      credit_score: 92
    },
    venues: {
      name: 'Champion Court Gading Serpong',
      address: 'Kelapa Dua, Tangerang'
    }
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
    start_time: new Date(Date.now() + 3600 * 1000 * 4).toISOString(),
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
    profiles: {
      full_name: 'Hyun_Striker',
      credit_score: 88
    },
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
    estimated_cost_total: 350000,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    profiles: {
      full_name: 'Jerikho Ruben',
      credit_score: 90
    },
    venues: {
      name: 'Tifosi Sport Center · Rumput',
      address: 'Gading Serpong, Tangerang'
    }
  }
];

function getInitials(name: string): string {
  if (!name) return 'MB';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getCreditTier(score: number): string {
  if (score >= 90) return 'Prima';
  if (score >= 75) return 'Baik';
  if (score >= 60) return 'Standar';
  return 'Waspada';
}

function formatKickoff(isoDateStr: string): { time: string; dayLabel: string } {
  try {
    const d = new Date(isoDateStr);
    if (isNaN(d.getTime())) return { time: '19:00', dayLabel: 'Hari Ini' };

    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const time = `${hours}:${minutes}`;

    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow =
      d.getDate() === tomorrow.getDate() &&
      d.getMonth() === tomorrow.getMonth() &&
      d.getFullYear() === tomorrow.getFullYear();

    let dayLabel = `${d.getDate()} ${d.toLocaleString('id-ID', { month: 'short' })}`;
    if (isToday) dayLabel = 'Hari Ini';
    else if (isTomorrow) dayLabel = 'Besok';

    return { time, dayLabel };
  } catch {
    return { time: '19:00', dayLabel: 'Hari Ini' };
  }
}

function getActivityBadgeLabel(activityType: string = ''): string {
  const act = activityType.toLowerCase();
  if (act.includes('futsal')) return 'FUTSAL 5v5';
  if (act.includes('badminton')) return 'BADMINTON GANDA';
  if (act.includes('basket')) return 'BASKET 3v3';
  if (act.includes('mlbb')) return 'MLBB RANKED';
  return activityType.toUpperCase() || 'MABAR SESI';
}

export default function ExploreScreen({ navigation }: Props) {
  const { user } = useAuthStore();

  // Dynamic user profile state
  const [profile, setProfile] = useState<UserProfileHeader>({
    fullName: 'Pemain Mabar',
    creditScore: 100,
    initials: 'PM',
    tier: 'Prima'
  });

  // Sessions state from Real API
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [scheduleTab, setScheduleTab] = useState<'now' | 'scheduled'>('now');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = [
    { id: 'Semua', label: 'Semua' },
    { id: 'Futsal', label: '⚽ Futsal' },
    { id: 'Badminton', label: '🏸 Badminton' },
    { id: 'Basket', label: '🏀 Basket' },
    { id: 'MLBB', label: '🎮 MLBB' }
  ];

  // 1. Fetch User Profile
  const loadUserProfile = useCallback(async () => {
    if (!user) {
      setProfile({
        fullName: 'Pemain Mabar',
        creditScore: 100,
        initials: 'PM',
        tier: 'Prima'
      });
      return;
    }

    try {
      // Coba ambil dari endpoint API profile/me
      const apiProf = await api.getMyProfile();
      if (apiProf && apiProf.full_name) {
        const name = apiProf.full_name;
        const score = apiProf.credit_score ?? 100;
        setProfile({
          fullName: name,
          creditScore: score,
          initials: getInitials(name),
          tier: getCreditTier(score)
        });
        return;
      }

      // Fallback: Query langsung ke tabel profiles Supabase
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, credit_score')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && data) {
        const name =
          data.full_name ||
          user.user_metadata?.full_name ||
          user.email?.split('@')[0] ||
          'Pemain Mabar';
        const score = data.credit_score ?? 100;
        setProfile({
          fullName: name,
          creditScore: score,
          initials: getInitials(name),
          tier: getCreditTier(score)
        });
      } else {
        const name =
          user.user_metadata?.full_name ||
          user.email?.split('@')[0] ||
          'Pemain Mabar';
        setProfile({
          fullName: name,
          creditScore: 100,
          initials: getInitials(name),
          tier: 'Prima'
        });
      }
    } catch (err) {
      console.warn('[ExploreScreen] Error loading profile:', err);
    }
  }, [user]);

  // 2. Fetch Sessions from Real API
  const fetchSessionsData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const data = await api.getSessions();
      if (data && Array.isArray(data) && data.length > 0) {
        setSessions(data);
        setIsLiveConnected(true);

        // Ambil jumlah peserta real-time per session dari session_participants
        const sessionIds = data.map((s) => s.id);
        const { data: parts, error: partErr } = await supabase
          .from('session_participants')
          .select('session_id')
          .in('session_id', sessionIds)
          .neq('attendance_status', 'CANCELLED');

        if (!partErr && parts) {
          const counts: Record<string, number> = {};
          parts.forEach((p) => {
            counts[p.session_id] = (counts[p.session_id] || 0) + 1;
          });
          setParticipantCounts(counts);
        }
      } else {
        // Jika server mengembalikan array kosong, gunakan data fallback
        setSessions(FALLBACK_SESSIONS);
        setIsLiveConnected(false);
      }
    } catch (err) {
      console.warn('[ExploreScreen] Gagal memuat sesi live dari API, menggunakan fallback:', err);
      setSessions(FALLBACK_SESSIONS);
      setIsLiveConnected(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Inisialisasi awal
  useEffect(() => {
    loadUserProfile();
    fetchSessionsData();
  }, [loadUserProfile, fetchSessionsData]);

  // Real-time listener: dengarkan perubahan sesi & peserta di Supabase
  useEffect(() => {
    const channel = supabase
      .channel('explore-live-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions' },
        () => {
          fetchSessionsData(false);
        }
      )
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

  // Dynamic counts for tabs
  const { playNowCount, scheduledCount } = useMemo(() => {
    let now = 0;
    let sched = 0;
    sessions.forEach((s) => {
      if (s.session_mode === 'play_now') {
        now++;
      } else {
        sched++;
      }
    });
    return { playNowCount: now, scheduledCount: sched };
  }, [sessions]);

  // Filtering data
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // 1. Kategori
      const matchesCat =
        selectedCategory === 'Semua' ||
        (s.activity_type &&
          s.activity_type.toLowerCase().includes(selectedCategory.toLowerCase())) ||
        (selectedCategory === 'MLBB' && s.session_category === 'esports');

      // 2. Search query
      const venueName = s.venues?.name || s.custom_location || '';
      const hostName = s.profiles?.full_name || '';
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        s.title.toLowerCase().includes(query) ||
        s.activity_type.toLowerCase().includes(query) ||
        venueName.toLowerCase().includes(query) ||
        hostName.toLowerCase().includes(query);

      // 3. Mode Sesi (Play Now vs Terjadwal)
      const matchesSchedule =
        scheduleTab === 'now'
          ? s.session_mode === 'play_now' || playNowCount === 0 // Fallback fleksibel jika 0 Play Now
          : s.session_mode === 'scheduled' || scheduledCount === 0;

      return matchesCat && matchesSearch && matchesSchedule;
    });
  }, [sessions, selectedCategory, searchQuery, scheduleTab, playNowCount, scheduledCount]);

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
        {/* Top App Bar (Dynamic User Profile) */}
        <View style={styles.topAppBar}>
          <View style={styles.userInfo}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{profile.initials}</Text>
            </View>
            <View>
              <Text style={styles.greetingText}>Halo, {profile.fullName}</Text>
              <Text style={styles.karmaText}>
                🛡️ Credit: {profile.creditScore} ({profile.tier})
              </Text>
            </View>
          </View>
          <View style={styles.creditBadge}>
            <Text style={styles.creditBadgeText}>
              ⚡ {profile.creditScore} {profile.tier}
            </Text>
          </View>
        </View>

        {/* Live Database Indicator Badge */}
        <View style={styles.liveIndicatorRow}>
          <View
            style={[
              styles.liveDot,
              { backgroundColor: isLiveConnected ? THEME.colors.success : THEME.colors.warning }
            ]}
          />
          <Text style={styles.liveIndicatorText}>
            {isLiveConnected ? 'Online' : 'Offline Mode (Fallback Data)'}
          </Text>
        </View>

        {/* Search & Filter Bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Cari sesi, venue, atau game..."
              placeholderTextColor={THEME.colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={styles.filterBtn}
            activeOpacity={0.8}
            onPress={() => fetchSessionsData(true)}
            accessibilityLabel="Refresh Data"
          >
            <Text style={styles.filterBtnIcon}>🔄</Text>
          </TouchableOpacity>
        </View>

        {/* Category Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                activeOpacity={0.7}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isActive && styles.categoryChipTextActive
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Schedule Tab Switch */}
        <View style={styles.scheduleSwitch}>
          <TouchableOpacity
            style={[
              styles.scheduleTab,
              scheduleTab === 'now' && styles.scheduleTabActive
            ]}
            onPress={() => setScheduleTab('now')}
          >
            <Text
              style={[
                styles.scheduleTabText,
                scheduleTab === 'now' && styles.scheduleTabTextActive
              ]}
            >
              Play Now ({playNowCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.scheduleTab,
              scheduleTab === 'scheduled' && styles.scheduleTabActive
            ]}
            onPress={() => setScheduleTab('scheduled')}
          >
            <Text
              style={[
                styles.scheduleTabText,
                scheduleTab === 'scheduled' && styles.scheduleTabTextActive
              ]}
            >
              Terjadwal ({scheduledCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Play Now Alert Banner */}
        {scheduleTab === 'now' && playNowCount > 0 && (
          <View style={styles.alertBanner}>
            <View style={styles.alertBannerLeft}>
              <View style={styles.playNowBadge}>
                <Text style={styles.playNowBadgeText}>PLAY NOW</Text>
              </View>
              <Text style={styles.alertTitle}>{playNowCount} sesi darurat butuh pemain!</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                const firstNow = sessions.find((s) => s.session_mode === 'play_now');
                if (firstNow) {
                  navigation.navigate('Lobby', {
                    sessionId: firstNow.id,
                    sessionTitle: firstNow.title
                  });
                }
              }}
            >
              <Text style={styles.alertActionText}>Lihat →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderTitle}>SESI AKTIF DATABASE</Text>
          <Text style={styles.sectionHeaderMeta}>
            {filteredSessions.length} Sesi Ditemukan
          </Text>
        </View>

        {/* Loading Indicator */}
        {isLoading && !isRefreshing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
            <Text style={styles.loadingText}>Fetching Data, please wait...</Text>
          </View>
        )}

        {/* Empty State */}
        {!isLoading && filteredSessions.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎾</Text>
            <Text style={styles.emptyTitle}>Belum Ada Sesi Tersedia</Text>
            <Text style={styles.emptySubtitle}>
              Tidak ditemukan sesi untuk kategori "{selectedCategory}". Coba ubah filter atau buat sesi mabar baru!
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('Create')}
            >
              <Text style={styles.emptyBtnText}>+ Buat Sesi Baru</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Match Pass Bento Ticket Cards */}
        {!isLoading && (
          <View style={styles.ticketList}>
            {filteredSessions.map((session) => {
              const totalSlots = session.max_slots || 10;
              const filledSlots = Math.min(
                totalSlots,
                participantCounts[session.id] || (session.status === 'COMPLETED' ? totalSlots : 1)
              );
              const emptySlots = Math.max(0, totalSlots - filledSlots);
              const pips = Array.from({ length: totalSlots }, (_, i) => i < filledSlots);
              const isFutsal = totalSlots === 10;

              const kickoff = formatKickoff(session.start_time);
              const venueName =
                session.venues?.name || session.custom_location || 'Venue Rekanan Mabar';
              const hostName = session.profiles?.full_name || 'Host Mabar';
              const hostScore = session.profiles?.credit_score ?? 100;

              const costDisplay =
                session.estimated_cost_total && session.estimated_cost_total > 0
                  ? `Rp ${Math.round(session.estimated_cost_total / totalSlots).toLocaleString('id-ID')}`
                  : 'Gratis';

              return (
                <View key={session.id} style={styles.matchPassCard}>
                  {/* Stub Header */}
                  <View style={styles.stubHeader}>
                    <View style={styles.stubHeaderLeft}>
                      <View style={styles.activityPill}>
                        <Text style={styles.activityPillText}>
                          {getActivityBadgeLabel(session.activity_type)}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.modePill,
                          session.status === 'LOCKED' && styles.modePillLocked,
                          session.status === 'COMPLETED' && styles.modePillCompleted
                        ]}
                      >
                        <Text
                          style={[
                            styles.modePillText,
                            session.status === 'LOCKED' && styles.modePillLockedText,
                            session.status === 'COMPLETED' && styles.modePillCompletedText
                          ]}
                        >
                          {session.status || 'OPEN'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.hostText}>
                      Host: {hostName} ({hostScore})
                    </Text>
                  </View>

                  {/* Main Ticket Info Row */}
                  <View style={styles.mainInfoRow}>
                    {/* Left: Kickoff Box */}
                    <View style={styles.kickoffBox}>
                      <Text style={styles.kickoffEyebrow}>KICKOFF</Text>
                      <Text style={styles.kickoffTime}>{kickoff.time}</Text>
                      <Text style={styles.kickoffDay}>{kickoff.dayLabel}</Text>
                    </View>

                    {/* Vertical Divider */}
                    <View style={styles.verticalDivider} />

                    {/* Right: Title & Meta */}
                    <View style={styles.detailsBox}>
                      <Text style={styles.matchTitle} numberOfLines={2}>
                        {session.title}
                      </Text>
                      <Text style={styles.matchVenue} numberOfLines={1}>
                        📍 {venueName}
                      </Text>
                      <View style={styles.karmaBadgeBox}>
                        <Text style={styles.karmaBadgeText}>
                          🛡️ Min Credit: {session.min_credit_score ?? 70}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Quota Progress Pips */}
                  <View style={styles.quotaSection}>
                    <View style={styles.quotaHeader}>
                      <Text style={styles.quotaTitle}>
                        KUOTA: {filledSlots}/{totalSlots} TERISI
                      </Text>
                      <Text
                        style={[
                          styles.quotaRemaining,
                          emptySlots === 0 && { color: THEME.colors.warning }
                        ]}
                      >
                        {emptySlots === 0 ? 'Slot Penuh!' : `Sisa ${emptySlots} Slot!`}
                      </Text>
                    </View>
                    <View style={styles.pipsRow}>
                      {pips.map((filled, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.pip,
                            isFutsal ? styles.pipFutsal : styles.pipBadminton,
                            filled && styles.pipActive
                          ]}
                        />
                      ))}
                    </View>
                  </View>

                  {/* Perforation Divider with Notches */}
                  <View style={styles.perforationWrapper}>
                    <View style={styles.notchLeft} />
                    <View style={styles.dashedLine} />
                    <View style={styles.notchRight} />
                  </View>

                  {/* Foot: Cost & CTA */}
                  <View style={styles.ticketFoot}>
                    <View style={styles.costBox}>
                      <Text style={styles.costLabel}>EST. PATUNGAN</Text>
                      <View style={styles.costValueRow}>
                        <Text style={styles.costAmount}>{costDisplay}</Text>
                        {costDisplay !== 'Gratis' && (
                          <Text style={styles.costPerOrg}> / org</Text>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.btnDetail}
                      activeOpacity={0.8}
                      onPress={() =>
                        navigation.navigate('Lobby', {
                          sessionId: session.id,
                          sessionTitle: session.title
                        })
                      }
                    >
                      <Text style={styles.btnDetailText}>Detail Sesi ➔</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
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
    paddingHorizontal: THEME.spatial.screenPaddingHorizontal,
    paddingTop: 8,
    paddingBottom: 120
  },

  // Top App Bar
  topAppBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  greetingText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 16,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  karmaText: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    includeFontPadding: false,
    marginTop: 1
  },
  creditBadge: {
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.full
  },
  creditBadgeText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 11,
    color: THEME.colors.primary,
    includeFontPadding: false
  },

  // Live Database Indicator
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 2
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5
  },
  liveIndicatorText: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 10,
    color: THEME.colors.textSecondary
  },

  // Search & Filter Row
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14
  },
  searchBox: {
    flex: 1,
    height: 44,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 13,
    color: THEME.colors.text,
    includeFontPadding: false,
    paddingVertical: 0
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center'
  },
  filterBtnIcon: {
    fontSize: 16
  },

  // Category Chips
  categoryScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 14
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder
  },
  categoryChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary
  },
  categoryChipText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  categoryChipTextActive: {
    fontFamily: THEME.typography.fonts.bold,
    color: THEME.colors.textOnPrimary,
    includeFontPadding: false
  },

  // Schedule Switch
  scheduleSwitch: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    marginBottom: 12
  },
  scheduleTab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginRight: 8
  },
  scheduleTabActive: {
    borderBottomColor: THEME.colors.primary
  },
  scheduleTabText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 12,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  scheduleTabTextActive: {
    fontFamily: THEME.typography.fonts.bold,
    color: THEME.colors.primary,
    includeFontPadding: false
  },

  // Alert Banner
  alertBanner: {
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 10, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  alertBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  playNowBadge: {
    backgroundColor: THEME.colors.danger,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4
  },
  playNowBadgeText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 9,
    color: '#0A0B0E',
    includeFontPadding: false
  },
  alertTitle: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 12,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  alertActionText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.danger,
    includeFontPadding: false
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionHeaderTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    includeFontPadding: false
  },
  sectionHeaderMeta: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.primary,
    includeFontPadding: false
  },

  // Loading & Empty States
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  loadingText: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 12,
    color: THEME.colors.textSecondary
  },
  emptyContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    marginTop: 8
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12
  },
  emptyTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 16,
    color: THEME.colors.text,
    marginBottom: 6
  },
  emptySubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16
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
    color: THEME.colors.textOnPrimary
  },

  // Match Pass Ticket Cards
  ticketList: {
    gap: 16
  },
  matchPassCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    overflow: 'hidden'
  },
  stubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8
  },
  stubHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  activityPill: {
    backgroundColor: THEME.colors.cardElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  activityPillText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.accent,
    letterSpacing: 0.5,
    includeFontPadding: false
  },
  modePill: {
    backgroundColor: THEME.colors.primaryMuted,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6
  },
  modePillText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 9,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  modePillLocked: {
    backgroundColor: 'rgba(255, 159, 10, 0.15)'
  },
  modePillLockedText: {
    color: THEME.colors.warning
  },
  modePillCompleted: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)'
  },
  modePillCompletedText: {
    color: THEME.colors.success
  },
  hostText: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },

  // Main Ticket Info
  mainInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  kickoffBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    paddingRight: 8
  },
  kickoffEyebrow: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 9,
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8,
    includeFontPadding: false
  },
  kickoffTime: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 22,
    color: THEME.colors.text,
    marginVertical: 2,
    includeFontPadding: false
  },
  kickoffDay: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  verticalDivider: {
    width: 1,
    height: 48,
    backgroundColor: THEME.colors.border,
    marginRight: 12
  },
  detailsBox: {
    flex: 1,
    justifyContent: 'center'
  },
  matchTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 14,
    color: THEME.colors.text,
    lineHeight: 18,
    includeFontPadding: false
  },
  matchVenue: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 3,
    includeFontPadding: false
  },
  karmaBadgeBox: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6
  },
  karmaBadgeText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 9,
    color: THEME.colors.warning,
    includeFontPadding: false
  },

  // Quota Pips
  quotaSection: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10
  },
  quotaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  quotaTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    letterSpacing: 0.5,
    includeFontPadding: false
  },
  quotaRemaining: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.success,
    includeFontPadding: false
  },
  pipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  pip: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)'
  },
  pipFutsal: {
    height: 8,
    borderRadius: 2
  },
  pipBadminton: {
    height: 8,
    borderRadius: 2
  },
  pipActive: {
    backgroundColor: THEME.colors.primary
  },

  // Perforation Notch Divider
  perforationWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    height: 16
  },
  notchLeft: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: THEME.colors.background,
    marginLeft: -7
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderStyle: 'dashed',
    marginHorizontal: 6
  },
  notchRight: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: THEME.colors.background,
    marginRight: -7
  },

  // Foot
  ticketFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  costBox: {
    justifyContent: 'center'
  },
  costLabel: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 9,
    color: THEME.colors.textMuted,
    letterSpacing: 0.6,
    includeFontPadding: false
  },
  costValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2
  },
  costAmount: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 16,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  costPerOrg: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  btnDetail: {
    backgroundColor: THEME.colors.primary,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnDetailText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.textOnPrimary,
    includeFontPadding: false
  }
});
