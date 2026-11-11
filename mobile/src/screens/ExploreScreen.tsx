import React, { useState, useEffect, useCallback } from 'react';
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
import { useAuthStore } from '../store/authStore';
import { QuotaPips, StatusBadge } from '../components';

type Props = BottomTabScreenProps<MainTabParamList, 'Explore'>;

function getActivityIcon(activityType: string = ''): string {
  const act = activityType.toLowerCase();
  if (act.includes('futsal') || act.includes('soccer') || act.includes('sepak')) return '⚽';
  if (act.includes('badminton') || act.includes('bulutangkis')) return '🏸';
  if (act.includes('basket')) return '🏀';
  if (act.includes('mlbb') || act.includes('game') || act.includes('esport')) return '🎮';
  return '⚡';
}

function formatKickoff(isoDateStr: string): { time: string; dayLabel: string } {
  try {
    const d = new Date(isoDateStr);
    if (isNaN(d.getTime())) return { time: '--:--', dayLabel: 'TBD' };

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
    return { time: '--:--', dayLabel: 'TBD' };
  }
}

function formatCost(totalCost: number, maxSlots: number): { amount: string; isFree: boolean } {
  if (!totalCost || totalCost <= 0) {
    return { amount: 'Gratis', isFree: true };
  }
  const perPerson = Math.round(totalCost / Math.max(1, maxSlots));
  return { amount: `Rp ${perPerson.toLocaleString('id-ID')}`, isFree: false };
}

export default function ExploreScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [scheduleTab, setScheduleTab] = useState<'now' | 'scheduled'>('scheduled');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'Semua', label: 'Semua' },
    { id: 'Futsal', label: '⚽ Futsal' },
    { id: 'Badminton', label: '🏸 Badminton' },
    { id: 'Basket', label: '🏀 Basket' },
    { id: 'MLBB', label: '🎮 MLBB' }
  ];

  const loadSessions = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await api.getSessions();
      setSessions(data);
    } catch (err: any) {
      console.warn('[ExploreScreen] Error fetching sessions:', err.message);
      setError(err.message || 'Gagal memuat sesi mabar');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Derived user details
  const userName =
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split('@')[0] : 'Sobat Mabar');
  const userInitials = userName
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'JM';
  const userKarma = user?.user_metadata?.credit_score ?? 100;

  // Counts for tabs
  const playNowCount = sessions.filter((s) => s.session_mode === 'play_now').length;
  const scheduledCount = sessions.filter((s) => s.session_mode !== 'play_now').length;

  // Filtering
  const filteredSessions = sessions.filter((s) => {
    const act = (s.activity_type || '').toLowerCase();
    const cat = (s.session_category || '').toLowerCase();

    const matchesCat =
      selectedCategory === 'Semua' ||
      (selectedCategory === 'Futsal' && act.includes('futsal')) ||
      (selectedCategory === 'Badminton' && act.includes('badminton')) ||
      (selectedCategory === 'Basket' && act.includes('basket')) ||
      (selectedCategory === 'MLBB' && (act.includes('mlbb') || cat.includes('esport')));

    const titleStr = (s.title || '').toLowerCase();
    const venueStr = (s.venues?.name || s.custom_location || '').toLowerCase();
    const hostStr = (s.profiles?.full_name || '').toLowerCase();
    const queryStr = searchQuery.toLowerCase();

    const matchesSearch =
      !searchQuery ||
      titleStr.includes(queryStr) ||
      venueStr.includes(queryStr) ||
      hostStr.includes(queryStr);

    const matchesSchedule =
      scheduleTab === 'now' ? s.session_mode === 'play_now' : s.session_mode !== 'play_now';

    return matchesCat && matchesSearch && matchesSchedule;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadSessions(true)}
            tintColor={THEME.colors.primary}
            colors={[THEME.colors.primary]}
          />
        }
      >
        {/* Top App Bar (Figma 31:20) */}
        <View style={styles.topAppBar}>
          <View style={styles.userInfo}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{userInitials}</Text>
            </View>
            <View>
              <Text style={styles.greetingText}>Halo, {userName}</Text>
              <Text style={styles.karmaText}>
                🛡️ Karma: {userKarma} ({userKarma >= 80 ? 'Prima' : 'Standar'})
              </Text>
            </View>
          </View>
          <View style={styles.creditBadge}>
            <Text style={styles.creditBadgeText}>⚡ {userKarma} Prima</Text>
          </View>
        </View>

        {/* Search & Filter Bar (Figma 31:33) */}
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
            onPress={() => loadSessions(true)}
            accessibilityLabel="Refresh Data"
          >
            <Text style={styles.filterBtnIcon}>🔄</Text>
          </TouchableOpacity>
        </View>

        {/* Category Chips (Figma 31:50) */}
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

        {/* Schedule Tab Switch (Figma 31:59) */}
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
        {playNowCount > 0 ? (
          <View style={styles.alertBanner}>
            <View style={styles.alertBannerLeft}>
              <View style={styles.playNowBadge}>
                <Text style={styles.playNowBadgeText}>PLAY NOW</Text>
              </View>
              <Text style={styles.alertTitle}>
                {playNowCount} sesi darurat butuh pemain!
              </Text>
            </View>
            <TouchableOpacity onPress={() => setScheduleTab('now')}>
              <Text style={styles.alertActionText}>Lihat →</Text>
            </TouchableOpacity>
          </View>
        ) : scheduleTab === 'now' ? (
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerText}>
              ⚡ Belum ada sesi darurat saat ini. Buat sesi baru untuk ajak mabar instan!
            </Text>
          </View>
        ) : null}

        {/* Section Header (Figma 31:71) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderTitle}>
            {scheduleTab === 'now' ? 'SESI DARURAT PLAY NOW' : 'SESI TERDEKAT DISEKITARMU'}
          </Text>
          <Text style={styles.sectionHeaderMeta}>
            {loading ? 'Memuat...' : `${filteredSessions.length} sesi aktif`}
          </Text>
        </View>

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
            <Text style={styles.loadingText}>Mengambil jadwal mabar terkini...</Text>
          </View>
        )}

        {/* Error State */}
        {!loading && error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorTitle}>Koneksi API Terkendala</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => loadSessions(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.retryBtnText}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty State */}
        {!loading && !error && filteredSessions.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🏟️</Text>
            <Text style={styles.emptyTitle}>Belum Ada Sesi Mabar</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `Tidak ditemukan sesi dengan kata kunci "${searchQuery}"`
                : scheduleTab === 'now'
                ? 'Tidak ada sesi Play Now saat ini. Coba buka tab Terjadwal.'
                : 'Belum ada sesi di kategori ini. Jadilah host pertama!'}
            </Text>
            <TouchableOpacity
              style={styles.createBtnEmpty}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Create')}
            >
              <Text style={styles.createBtnEmptyText}>+ Buka Sesi Baru</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Match Pass Bento Ticket Cards (Figma 31:74) */}
        {!loading && !error && (
          <View style={styles.ticketList}>
            {filteredSessions.map((session) => {
              const kickoff = formatKickoff(session.start_time);
              const cost = formatCost(session.estimated_cost_total, session.max_slots);
              const venueName = session.venues?.name || session.custom_location || 'Lokasi menyusul';
              const hostName = session.profiles?.full_name || 'Host';
              const hostKarma = session.profiles?.credit_score ?? session.min_credit_score;
              const isFutsal = session.activity_type.toLowerCase().includes('futsal');
              const icon = getActivityIcon(session.activity_type);

              // Host counts as 1 filled slot by default
              const filledSlots = 1;
              const emptySlots = Math.max(0, session.max_slots - filledSlots);

              return (
                <View key={session.id} style={styles.matchPassCard}>
                  {/* Stub Header */}
                  <View style={styles.stubHeader}>
                    <View style={styles.stubHeaderLeft}>
                      <View style={styles.activityPill}>
                        <Text style={styles.activityPillText}>
                          {icon} {session.activity_type.toUpperCase()}
                        </Text>
                      </View>
                      <StatusBadge
                        label={session.status === 'OPEN' ? 'OPEN SLOT' : session.status}
                        variant={session.status === 'OPEN' ? 'credit' : 'neutral'}
                        size="sm"
                      />
                    </View>
                    <Text style={styles.hostText}>
                      Host: {hostName} ({hostKarma})
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
                          🛡️ Min Karma: {session.min_credit_score}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Quota Progress Pips via Langui Fusion Bento Component */}
                  <View style={styles.quotaSection}>
                    <View style={styles.quotaHeader}>
                      <Text style={styles.quotaTitle}>
                        KUOTA: {filledSlots}/{session.max_slots} TERISI
                      </Text>
                      <Text style={styles.quotaRemaining}>
                        Sisa {emptySlots} Slot!
                      </Text>
                    </View>
                    <QuotaPips
                      filled={filledSlots}
                      total={session.max_slots}
                      variant={isFutsal ? 'futsal' : 'badminton'}
                      showCount={false}
                    />
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
                        <Text style={styles.costAmount}>{cost.amount}</Text>
                        {!cost.isFree && <Text style={styles.costPerOrg}> / org</Text>}
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
    paddingBottom: 120 // Space for floating capsule nav
  },

  // Top App Bar (Figma 31:20)
  topAppBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
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

  // Search & Filter Row (Figma 31:33)
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

  // Category Chips (Figma 31:50)
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

  // Schedule Switch (Figma 31:59)
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

  // Alert Banner (Figma 35:482)
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
  infoBanner: {
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16
  },
  infoBannerText: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },

  // Section Header (Figma 31:71)
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

  // Match Pass Ticket Cards (Figma 31:74)
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
    gap: 8
  },
  activityPill: {
    backgroundColor: THEME.colors.cardElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  activityPillText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.accent,
    letterSpacing: 0.5,
    includeFontPadding: false
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
  },

  // States
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 10,
    includeFontPadding: false
  },
  errorContainer: {
    backgroundColor: 'rgba(235, 87, 87, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(235, 87, 87, 0.3)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginVertical: 16
  },
  errorEmoji: {
    fontSize: 28,
    marginBottom: 8
  },
  errorTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 14,
    color: THEME.colors.danger,
    includeFontPadding: false
  },
  errorSubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
    includeFontPadding: false
  },
  retryBtn: {
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  retryBtnText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 12,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  emptyContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 10
  },
  emptyTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 15,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  emptySubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18,
    includeFontPadding: false
  },
  createBtnEmpty: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10
  },
  createBtnEmptyText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13,
    color: THEME.colors.textOnPrimary,
    includeFontPadding: false
  }
});
