import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../theme';
import { MainTabScreenProps } from '../navigation/types';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { ApiSession } from '../services/api';

type Props = MainTabScreenProps<'MySessions'>;
type TabSegment = 'active' | 'history';

interface MySessionItem extends ApiSession {
  isHost: boolean;
  participantCount: number;
}

function formatKickoff(isoDateStr?: string | null): { time: string; dayLabel: string; isToday: boolean } {
  if (!isoDateStr) return { time: '19:00', dayLabel: 'Hari Ini', isToday: true };
  try {
    const d = new Date(isoDateStr);
    if (isNaN(d.getTime())) return { time: '19:00', dayLabel: 'Hari Ini', isToday: true };

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
    if (isToday) dayLabel = `Hari ini, ${d.getDate()} ${d.toLocaleString('id-ID', { month: 'short' })}`;
    else if (isTomorrow) dayLabel = `Besok, ${d.getDate()} ${d.toLocaleString('id-ID', { month: 'short' })}`;

    return { time, dayLabel, isToday };
  } catch {
    return { time: '19:00', dayLabel: 'Hari Ini', isToday: true };
  }
}

function getUrgencyBadge(isoDateStr?: string | null): { label: string; isUrgent: boolean } {
  if (!isoDateStr) return { label: 'TERJADWAL', isUrgent: false };
  try {
    const d = new Date(isoDateStr);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();

    if (diffMs < 0) {
      return { label: 'BERLANGSUNG', isUrgent: true };
    }
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours < 1) {
      return { label: `MULAI ${Math.max(1, diffMins)} MENIT LAGI`, isUrgent: true };
    } else if (diffHours <= 3) {
      return { label: `MULAI ${diffHours} JAM LAGI`, isUrgent: true };
    } else if (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    ) {
      return { label: 'HARI INI', isUrgent: true };
    } else {
      return { label: 'TERJADWAL', isUrgent: false };
    }
  } catch {
    return { label: 'TERJADWAL', isUrgent: false };
  }
}

function getSportTag(activityType?: string, category?: string): string {
  const act = (activityType || '').toLowerCase();
  if (act.includes('futsal')) return '⚽ FUTSAL 5v5';
  if (act.includes('badminton')) return '🏸 BADMINTON GANDA';
  if (act.includes('basket')) return '🏀 BASKET 3v3';
  if (act.includes('mlbb') || act.includes('mobile legend')) return '🎮 MLBB RANKED';
  if (act.includes('valorant')) return '🎯 VALORANT 5v5';
  if (category === 'esports') return '🎮 ESPORTS';
  return `⚽ ${(activityType || 'MABAR').toUpperCase()}`;
}

export default function MySessionsScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const bottomPadding = 24;

  const [activeSegment, setActiveSegment] = useState<TabSegment>('active');
  const [activeSessions, setActiveSessions] = useState<MySessionItem[]>([]);
  const [historySessions, setHistorySessions] = useState<MySessionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadMySessions = useCallback(async (isPullRefresh = false) => {
    if (isPullRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      if (!user?.id) {
        // Tamu / Belum login: kosongkan
        setActiveSessions([]);
        setHistorySessions([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      // 1. Ambil session_id yang diikuti oleh user
      const { data: participations, error: partErr } = await supabase
        .from('session_participants')
        .select('session_id')
        .eq('user_id', user.id)
        .neq('attendance_status', 'CANCELLED');

      if (partErr) {
        console.warn('[MySessionsScreen] Error querying participations:', partErr.message);
      }

      const joinedSessionIds: string[] = (participations || []).map((p: any) => p.session_id);

      // 2. Ambil sesi di mana user adalah host ATAU peserta
      let query = supabase
        .from('sessions')
        .select('*, venues(*), profiles:host_id(full_name, credit_score, avatar_url)');

      if (joinedSessionIds.length > 0) {
        query = query.or(`host_id.eq.${user.id},id.in.(${joinedSessionIds.join(',')})`);
      } else {
        query = query.eq('host_id', user.id);
      }

      const { data: rawSessions, error: sessErr } = await query.order('start_time', {
        ascending: true
      });

      if (sessErr || !rawSessions) {
        console.warn('[MySessionsScreen] Error fetching sessions:', sessErr?.message);
        setActiveSessions([]);
        setHistorySessions([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      // 3. Ambil slot peserta untuk setiap sesi
      const allSessionIds = rawSessions.map((s: any) => s.id);
      let participantCounts: Record<string, number> = {};

      if (allSessionIds.length > 0) {
        const { data: countData } = await supabase
          .from('session_participants')
          .select('session_id')
          .in('session_id', allSessionIds)
          .neq('attendance_status', 'CANCELLED');

        if (countData) {
          participantCounts = countData.reduce<Record<string, number>>((acc, row: any) => {
            acc[row.session_id] = (acc[row.session_id] || 0) + 1;
            return acc;
          }, {});
        }
      }

      // 4. Transform dan petakan sesi
      const mapped: MySessionItem[] = rawSessions.map((s: any) => {
        const count = participantCounts[s.id] ?? 1;
        return {
          ...s,
          isHost: s.host_id === user.id,
          participantCount: Math.max(1, count)
        };
      });

      const activeList = mapped.filter((s) => ['OPEN', 'LOCKED', 'IN_PROGRESS'].includes(s.status));
      const historyList = mapped.filter((s) => ['COMPLETED', 'CANCELLED'].includes(s.status));

      setActiveSessions(activeList);
      setHistorySessions(historyList);
    } catch (err: any) {
      console.warn('[MySessionsScreen] Error in loadMySessions:', err?.message || err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadMySessions();

    // Real-time channel untuk auto update ketika sesi berubah
    const channel = supabase
      .channel('my-sessions-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_participants' },
        () => {
          loadMySessions();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions' },
        () => {
          loadMySessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadMySessions]);

  const handleOpenMaps = (mapsUrl?: string | null, venueName?: string) => {
    if (mapsUrl) {
      Linking.openURL(mapsUrl);
    } else {
      const q = encodeURIComponent(venueName || 'Lapangan Olahraga Tangerang');
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
    }
  };

  const handleOpenLobby = (session: MySessionItem) => {
    navigation.navigate('Lobby', {
      sessionId: session.id,
      sessionTitle: session.title
    });
  };

  // Render Quota Pips (10 segments)
  const renderPips = (filled: number, total: number) => {
    const pipsTotal = Math.min(10, Math.max(4, total));
    const ratio = total > 0 ? filled / total : 0;
    const filledPipsCount = Math.min(pipsTotal, Math.round(ratio * pipsTotal));

    const pips = [];
    for (let i = 0; i < pipsTotal; i++) {
      const isFilled = i < filledPipsCount;
      pips.push(
        <View
          key={i}
          style={[
            styles.pipSegment,
            isFilled ? styles.pipSegmentFilled : styles.pipSegmentEmpty
          ]}
        />
      );
    }
    return <View style={styles.pipsRow}>{pips}</View>;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top App Bar (Figma SCR-17 175:32) */}
      <View style={styles.topAppBar}>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Sesi Saya</Text>
          <Text style={styles.headerSubtitle}>Jadwal & riwayat sesi</Text>
        </View>

        <TouchableOpacity
          style={styles.headerActionBtn}
          activeOpacity={0.8}
          onPress={() => loadMySessions(true)}
          accessibilityLabel="Refresh Data Sesi"
        >
          <Text style={styles.headerActionIcon}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Segmented Control: Sesi Aktif vs Riwayat Selesai (Figma 175:39) */}
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[
            styles.segmentTab,
            activeSegment === 'active' && styles.segmentTabActive
          ]}
          activeOpacity={0.85}
          onPress={() => setActiveSegment('active')}
        >
          <Text
            style={[
              styles.segmentText,
              activeSegment === 'active' && styles.segmentTextActive
            ]}
          >
            Sesi Aktif
          </Text>
          <View
            style={[
              styles.segmentBadge,
              activeSegment === 'active'
                ? styles.segmentBadgeActive
                : styles.segmentBadgeInactive
            ]}
          >
            <Text
              style={[
                styles.segmentBadgeText,
                activeSegment === 'active'
                  ? styles.segmentBadgeTextActive
                  : styles.segmentBadgeTextInactive
              ]}
            >
              {activeSessions.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentTab,
            activeSegment === 'history' && styles.segmentTabActive
          ]}
          activeOpacity={0.85}
          onPress={() => setActiveSegment('history')}
        >
          <Text
            style={[
              styles.segmentText,
              activeSegment === 'history' && styles.segmentTextActive
            ]}
          >
            Riwayat Selesai
          </Text>
          <View
            style={[
              styles.segmentBadge,
              activeSegment === 'history'
                ? styles.segmentBadgeActive
                : styles.segmentBadgeInactive
            ]}
          >
            <Text
              style={[
                styles.segmentBadgeText,
                activeSegment === 'history'
                  ? styles.segmentBadgeTextActive
                  : styles.segmentBadgeTextInactive
              ]}
            >
              {historySessions.length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadMySessions(true)}
            tintColor={THEME.colors.primary}
            colors={[THEME.colors.primary]}
          />
        }
      >
        {isLoading && !isRefreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
            <Text style={styles.loadingText}>Memuat jadwal mabar kamu...</Text>
          </View>
        ) : !user ? (
          /* Unauthenticated State */
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🔒</Text>
            <Text style={styles.emptyTitle}>Masuk untuk Melihat Jadwal Mabar</Text>
            <Text style={styles.emptySubtitle}>
              Masuk ke akunmu untuk melacak sesi mabar yang kamu ikuti, melihat tiket konfirmasi, dan mengatur pembagian tim.
            </Text>
            <TouchableOpacity
              style={styles.btnCta}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Auth')}
            >
              <Text style={styles.btnCtaText}>Masuk ke Akun ➔</Text>
            </TouchableOpacity>
          </View>
        ) : activeSegment === 'active' ? (
          /* TAB 1: SESI AKTIF */
          activeSessions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🎫</Text>
              <Text style={styles.emptyTitle}>Belum Ada Jadwal Mabar Aktif</Text>
              <Text style={styles.emptySubtitle}>
                Kamu belum bergabung atau membuat sesi mabar. Cari sesi mabar seru di sekitarmu atau buat sesi baru!
              </Text>
              <View style={styles.emptyBtnRow}>
                <TouchableOpacity
                  style={styles.btnCta}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('Explore')}
                >
                  <Text style={styles.btnCtaText}>Cari Sesi di Explore ➔</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnCtaSecondary}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('Create')}
                >
                  <Text style={styles.btnCtaSecondaryText}>+ Buat Sesi Baru</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {activeSessions.map((session) => {
                const kickoff = formatKickoff(session.start_time);
                const urgency = getUrgencyBadge(session.start_time);
                const venueName = session.venues?.name || session.custom_location || 'Venue Rekanan Mabar';
                const totalSlots = session.max_slots || 10;
                const filledSlots = session.participantCount;
                const remainingSlots = Math.max(0, totalSlots - filledSlots);

                // Estimasi Patungan
                const totalCost = session.estimated_cost_total || 0;
                const costPerPlayer = totalCost > 0 ? Math.round(totalCost / totalSlots) : 0;
                const costLabel = costPerPlayer > 0 ? `Rp ${costPerPlayer.toLocaleString('id-ID')}` : 'Gratis';

                return (
                  <View key={session.id} style={styles.ticketCard}>
                    {/* Top Urgency & Confirmation Badges (Figma 175:49) */}
                    <View style={styles.cardHeaderRow}>
                      <View
                        style={[
                          styles.urgencyBadge,
                          urgency.isUrgent
                            ? styles.urgencyBadgeUrgent
                            : styles.urgencyBadgeNormal
                        ]}
                      >
                        <Text
                          style={[
                            styles.urgencyBadgeText,
                            urgency.isUrgent
                              ? styles.urgencyBadgeTextUrgent
                              : styles.urgencyBadgeTextNormal
                          ]}
                        >
                          {urgency.label}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.roleBadge,
                          session.isHost ? styles.roleBadgeHost : styles.roleBadgeSlot
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleBadgeText,
                            session.isHost
                              ? styles.roleBadgeTextHost
                              : styles.roleBadgeTextSlot
                          ]}
                        >
                          {session.isHost ? '👑 HOST KAPTEEN' : 'CONFIRMED SLOT ✓'}
                        </Text>
                      </View>
                    </View>

                    {/* Venue / Activity Box (Figma 175:54) */}
                    <View style={styles.venueThumbnailBox}>
                      <View style={styles.venueBoxTopRow}>
                        <View style={styles.sportBadge}>
                          <Text style={styles.sportBadgeText}>
                            {getSportTag(session.activity_type, session.session_category)}
                          </Text>
                        </View>
                        <Text style={styles.venueDateText}>{kickoff.dayLabel}</Text>
                      </View>

                      <View style={styles.venueBoxBottomRow}>
                        <Text style={styles.venueTitleText} numberOfLines={1}>
                          {venueName}
                        </Text>
                        <Text style={styles.kickoffTimeText}>{kickoff.time} WIB</Text>
                      </View>
                    </View>

                    {/* Session Title & Slots Progress Pips (Figma 175:62) */}
                    <View style={styles.pipsSection}>
                      <View style={styles.pipsHeaderRow}>
                        <Text style={styles.sessionTitleText} numberOfLines={1}>
                          {session.title}
                        </Text>
                        <Text style={styles.pipsCountText}>
                          {filledSlots} / {totalSlots} Terisi ({remainingSlots > 0 ? `Sisa ${remainingSlots}` : 'Penuh'})
                        </Text>
                      </View>
                      {renderPips(filledSlots, totalSlots)}
                    </View>

                    {/* Action Row: Patungan & Buttons (Figma 175:77) */}
                    <View style={styles.actionRow}>
                      <View style={styles.patunganBox}>
                        <Text style={styles.patunganLabel}>PATUNGAN FIX</Text>
                        <Text style={styles.patunganAmount}>{costLabel}</Text>
                      </View>

                      <View style={styles.actionBtnGroup}>
                        <TouchableOpacity
                          style={styles.btnMaps}
                          activeOpacity={0.8}
                          onPress={() => handleOpenMaps(session.venues?.maps_url, venueName)}
                        >
                          <Text style={styles.btnMapsText}>📍 Maps</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.btnLobby}
                          activeOpacity={0.85}
                          onPress={() => handleOpenLobby(session)}
                        >
                          <Text style={styles.btnLobbyText}>💬 Buka Lobby</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )
        ) : (
          /* TAB 2: RIWAYAT SELESAI */
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={styles.historySectionTitle}>Riwayat Pertandingan Selesai</Text>
              <Text style={styles.historyShowupBadge}>100% Show-up ✓</Text>
            </View>

            {historySessions.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🏆</Text>
                <Text style={styles.emptyTitle}>Belum Ada Riwayat Selesai</Text>
                <Text style={styles.emptySubtitle}>
                  Pertandingan yang telah selesai beserta rekam jejak kehadiran dan penilaian tim akan tercatat di sini.
                </Text>
              </View>
            ) : (
              <View style={styles.historyList}>
                {historySessions.map((session) => {
                  const kickoff = formatKickoff(session.start_time);
                  const venueName = session.venues?.name || session.custom_location || 'Venue Rekanan';

                  return (
                    <TouchableOpacity
                      key={session.id}
                      style={styles.historyItemCard}
                      activeOpacity={0.8}
                      onPress={() => handleOpenLobby(session)}
                    >
                      <View style={styles.historyItemLeft}>
                        <Text style={styles.historyItemTitle} numberOfLines={1}>
                          {getSportTag(session.activity_type, session.session_category)} · {session.title}
                        </Text>
                        <Text style={styles.historyItemSubtitle} numberOfLines={1}>
                          📍 {venueName} · {kickoff.dayLabel}
                        </Text>
                      </View>

                      <View style={styles.historyItemRight}>
                        <Text style={styles.historyOutcomeText}>
                          {session.status === 'COMPLETED' ? 'Selesai' : 'Dibatalkan'}
                        </Text>
                        <View style={styles.completedBadge}>
                          <Text style={styles.completedBadgeText}>SELESAI ✓</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
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
    flex: 1
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8
  },

  // Top App Bar
  topAppBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  headerTitleBox: {
    flex: 1
  },
  headerTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 20,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  headerSubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    includeFontPadding: false
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerActionIcon: {
    fontSize: 16
  },

  // Segmented Control
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 12
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8
  },
  segmentTabActive: {
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: 'rgba(213, 255, 64, 0.45)'
  },
  segmentText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  segmentTextActive: {
    fontFamily: THEME.typography.fonts.bold,
    color: THEME.colors.primary
  },
  segmentBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
    minWidth: 22,
    alignItems: 'center',
    justifyContent: 'center'
  },
  segmentBadgeActive: {
    backgroundColor: THEME.colors.primary
  },
  segmentBadgeInactive: {
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: 'rgba(192, 194, 184, 0.25)'
  },
  segmentBadgeText: {
    fontSize: 10,
    includeFontPadding: false
  },
  segmentBadgeTextActive: {
    fontFamily: THEME.typography.fonts.bold,
    color: THEME.colors.background
  },
  segmentBadgeTextInactive: {
    fontFamily: THEME.typography.fonts.semiBold,
    color: THEME.colors.textSecondary
  },

  // Loading & Empty State
  loadingBox: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  loadingText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 12,
    color: THEME.colors.textSecondary
  },
  emptyCard: {
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12
  },
  emptyTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 15,
    color: THEME.colors.text,
    textAlign: 'center',
    marginBottom: 6,
    includeFontPadding: false
  },
  emptySubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    includeFontPadding: false
  },
  emptyBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    justifyContent: 'center'
  },
  btnCta: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnCtaText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.background,
    includeFontPadding: false
  },
  btnCtaSecondary: {
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnCtaSecondaryText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 12,
    color: THEME.colors.text,
    includeFontPadding: false
  },

  // Active Sessions List
  listContainer: {
    gap: 14
  },
  ticketCard: {
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: 'rgba(213, 255, 64, 0.35)',
    borderRadius: 14,
    padding: 14,
    gap: 10
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  urgencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  urgencyBadgeUrgent: {
    backgroundColor: '#FF9F0A'
  },
  urgencyBadgeNormal: {
    backgroundColor: 'rgba(213, 255, 64, 0.15)'
  },
  urgencyBadgeText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    includeFontPadding: false
  },
  urgencyBadgeTextUrgent: {
    color: '#0A0B0E'
  },
  urgencyBadgeTextNormal: {
    color: THEME.colors.primary
  },

  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  roleBadgeHost: {
    backgroundColor: THEME.colors.primary
  },
  roleBadgeSlot: {
    backgroundColor: '#00F59B'
  },
  roleBadgeText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: '#0A0B0E',
    includeFontPadding: false
  },
  roleBadgeTextHost: {
    color: '#0A0B0E'
  },
  roleBadgeTextSlot: {
    color: '#0A0B0E'
  },

  // Venue Thumbnail Box
  venueThumbnailBox: {
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6
  },
  venueBoxTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  sportBadge: {
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.textSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  sportBadgeText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 9,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  venueDateText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  venueBoxBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  venueTitleText: {
    flex: 1,
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  kickoffTimeText: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 15,
    color: THEME.colors.primary,
    flexShrink: 0,
    includeFontPadding: false
  },

  // Pips & Quota Section
  pipsSection: {
    gap: 6
  },
  pipsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  sessionTitleText: {
    flex: 1,
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.text,
    includeFontPadding: false,
    marginRight: 8
  },
  pipsCountText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 11,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  pipsRow: {
    flexDirection: 'row',
    gap: 4,
    height: 8,
    alignItems: 'center'
  },
  pipSegment: {
    flex: 1,
    height: 8,
    borderRadius: 4
  },
  pipSegmentFilled: {
    backgroundColor: THEME.colors.primary
  },
  pipSegmentEmpty: {
    backgroundColor: THEME.colors.cardElevated
  },

  // Action Row
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4
  },
  patunganBox: {
    gap: 1
  },
  patunganLabel: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 9,
    color: THEME.colors.textSecondary,
    letterSpacing: 0.5,
    includeFontPadding: false
  },
  patunganAmount: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 16,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  actionBtnGroup: {
    flexDirection: 'row',
    gap: 8
  },
  btnMaps: {
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: 'rgba(192, 194, 184, 0.25)',
    borderRadius: 10,
    height: 42,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnMapsText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  btnLobby: {
    backgroundColor: THEME.colors.primary,
    borderRadius: 10,
    height: 42,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnLobbyText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.background,
    includeFontPadding: false
  },

  // History Tab Section
  historySection: {
    gap: 10
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4
  },
  historySectionTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  historyShowupBadge: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 11,
    color: '#00F59B',
    includeFontPadding: false
  },
  historyList: {
    gap: 8
  },
  historyItemCard: {
    backgroundColor: THEME.colors.cardElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  historyItemLeft: {
    flex: 1,
    gap: 2,
    marginRight: 10
  },
  historyItemTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  historyItemSubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  historyItemRight: {
    alignItems: 'flex-end',
    gap: 2
  },
  historyOutcomeText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 11,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  completedBadge: {
    backgroundColor: '#00F59B',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  completedBadgeText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 9,
    color: '#0A0B0E',
    includeFontPadding: false
  }
});
