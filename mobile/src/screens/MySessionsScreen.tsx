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
import Svg, { Path, Circle, Line, Polyline, Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../theme';
import { MainTabScreenProps } from '../navigation/types';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { ApiSession } from '../services/api';

type Props = MainTabScreenProps<'MySessions'>;
type TabSegment = 'active' | 'history';
type RoleFilter = 'all' | 'host' | 'joined';

interface MySessionItem extends ApiSession {
  isHost: boolean;
  participantCount: number;
}

interface KickoffInfo {
  time: string;
  dayLabel: string;
  shortDate: string;
  groupKey: 'today' | 'tomorrow' | 'upcoming';
  groupLabel: string;
}

function formatKickoff(isoDateStr?: string | null): KickoffInfo {
  if (!isoDateStr) {
    return {
      time: '19:00',
      dayLabel: 'Hari ini',
      shortDate: 'Hari ini',
      groupKey: 'today',
      groupLabel: 'Hari Ini'
    };
  }
  try {
    const d = new Date(isoDateStr);
    if (isNaN(d.getTime())) {
      return {
        time: '19:00',
        dayLabel: 'Hari ini',
        shortDate: 'Hari ini',
        groupKey: 'today',
        groupLabel: 'Hari Ini'
      };
    }

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

    const monthShort = d.toLocaleString('id-ID', { month: 'short' });
    const dateStr = `${d.getDate()} ${monthShort}`;

    if (isToday) {
      return {
        time,
        dayLabel: `Hari ini, ${dateStr}`,
        shortDate: 'Hari ini',
        groupKey: 'today',
        groupLabel: 'Hari Ini'
      };
    }
    if (isTomorrow) {
      return {
        time,
        dayLabel: `Besok, ${dateStr}`,
        shortDate: 'Besok',
        groupKey: 'tomorrow',
        groupLabel: 'Besok'
      };
    }

    const weekday = d.toLocaleString('id-ID', { weekday: 'short' });
    return {
      time,
      dayLabel: `${weekday}, ${dateStr}`,
      shortDate: dateStr,
      groupKey: 'upcoming',
      groupLabel: 'Mendatang'
    };
  } catch {
    return {
      time: '19:00',
      dayLabel: 'Hari ini',
      shortDate: 'Hari ini',
      groupKey: 'today',
      groupLabel: 'Hari Ini'
    };
  }
}

function getUrgencyLabel(isoDateStr?: string | null): string {
  if (!isoDateStr) return 'Terjadwal';
  try {
    const d = new Date(isoDateStr);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    if (diffMs < 0) return 'Sedang berlangsung';

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours < 1) return `Mulai ${Math.max(1, diffMins)}m lagi`;
    if (diffHours <= 3) return `Mulai ${diffHours}j lagi`;
    if (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    ) {
      return 'Main hari ini';
    }
    return 'Terjadwal';
  } catch {
    return 'Terjadwal';
  }
}

function getSportLabel(activityType: string = '', category: string = ''): string {
  const act = activityType.toLowerCase();
  if (act.includes('futsal')) return 'FUTSAL';
  if (act.includes('badminton')) return 'BADMINTON';
  if (act.includes('basket')) return 'BASKET';
  if (act.includes('mini_soccer')) return 'MINI SOCCER';
  if (act.includes('mlbb') || act.includes('mobile legend')) return 'MLBB';
  if (act.includes('valorant')) return 'VALORANT';
  if (category === 'esports') return 'ESPORTS';
  return (activityType || 'MABAR').toUpperCase();
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

function getSportTheme(activityType: string = ''): {
  hex: string;
  textHex: string;
  subtleBorder: string;
} {
  const act = activityType.toLowerCase();
  if (act.includes('badminton')) {
    return {
      hex: THEME.colors.success,
      textHex: THEME.colors.success,
      subtleBorder: 'rgba(0, 245, 155, 0.25)'
    };
  }
  if (act.includes('basket')) {
    return {
      hex: THEME.colors.warning,
      textHex: THEME.colors.warning,
      subtleBorder: 'rgba(255, 159, 10, 0.25)'
    };
  }
  if (act.includes('mlbb') || act.includes('valorant')) {
    return {
      hex: '#7B79FF',
      textHex: '#9391FF',
      subtleBorder: 'rgba(123, 121, 255, 0.28)'
    };
  }
  return {
    hex: THEME.colors.primary,
    textHex: THEME.colors.primary,
    subtleBorder: 'rgba(213, 255, 64, 0.24)'
  };
}

function formatShortPrice(totalCost: number | null | undefined, slots: number): string {
  if (!totalCost || totalCost <= 0) return 'Gratis';
  const perPerson = Math.round(totalCost / Math.max(slots, 1));
  if (perPerson >= 1000) {
    return `Rp ${Math.round(perPerson / 1000)}k`;
  }
  return `Rp ${perPerson}`;
}

// --- MONOCHROME VECTOR ICONS ---
function RefreshIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="23 4 23 10 17 10" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="1 20 1 14 7 14" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path
        d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MapPinIcon({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={10} r={3} stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

function ArrowUpRightIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={7} y1={17} x2={17} y2={7} stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="7 7 17 7 17 17" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronRightIcon({ color, size = 15 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="9 18 15 12 9 6" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LockIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={11} width={16} height={10} rx={2.5} stroke={color} strokeWidth={1.7} />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

function CalendarIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5} width={18} height={16} rx={3} stroke={color} strokeWidth={1.7} />
      <Line x1={16} y1={3} x2={16} y2={7} stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Line x1={8} y1={3} x2={8} y2={7} stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Line x1={3} y1={10} x2={21} y2={10} stroke={color} strokeWidth={1.7} />
    </Svg>
  );
}

function SkeletonLoader() {
  return (
    <View style={styles.skeletonWrap}>
      <View style={styles.skeletonHero}>
        <View style={styles.skeletonRowBetween}>
          <View style={[styles.skeletonLine, { width: 96, height: 12 }]} />
          <View style={[styles.skeletonLine, { width: 76, height: 12 }]} />
        </View>
        <View style={[styles.skeletonLine, { width: 120, height: 34, marginTop: 14 }]} />
        <View style={[styles.skeletonLine, { width: '75%', height: 18, marginTop: 8 }]} />
        <View style={[styles.skeletonLine, { width: '50%', height: 13, marginTop: 6 }]} />
        <View style={[styles.skeletonLine, { width: '100%', height: 40, marginTop: 16, borderRadius: 12 }]} />
      </View>

      <View style={styles.skeletonAgenda}>
        {[0, 1].map((idx) => (
          <View
            key={idx}
            style={[styles.skeletonAgendaRow, idx > 0 && styles.agendaRowDivider]}
          >
            <View style={[styles.skeletonLine, { width: 48, height: 32 }]} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={[styles.skeletonLine, { width: '40%', height: 11 }]} />
              <View style={[styles.skeletonLine, { width: '80%', height: 15 }]} />
              <View style={[styles.skeletonLine, { width: '55%', height: 12 }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function MySessionsScreen({ navigation }: Props) {
  const { user } = useAuthStore();

  const [activeSegment, setActiveSegment] = useState<TabSegment>('active');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [activeSessions, setActiveSessions] = useState<MySessionItem[]>([]);
  const [historySessions, setHistorySessions] = useState<MySessionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadMySessions = useCallback(async (isPullRefresh = false) => {
    if (isPullRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      if (!user?.id) {
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
      const historyList = mapped
        .filter((s) => ['COMPLETED', 'CANCELLED'].includes(s.status))
        .reverse();

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

  const filteredActive = useMemo(() => {
    if (roleFilter === 'host') return activeSessions.filter((s) => s.isHost);
    if (roleFilter === 'joined') return activeSessions.filter((s) => !s.isHost);
    return activeSessions;
  }, [activeSessions, roleFilter]);

  const nextMatch = filteredActive.length > 0 ? filteredActive[0] : null;
  const remainingActive = filteredActive.length > 1 ? filteredActive.slice(1) : [];

  const groupedRemaining = useMemo(() => {
    const groups: { key: string; label: string; items: MySessionItem[] }[] = [];
    const map = new Map<string, { key: string; label: string; items: MySessionItem[] }>();

    for (const s of remainingActive) {
      const k = formatKickoff(s.start_time);
      let entry = map.get(k.groupKey);
      if (!entry) {
        entry = { key: k.groupKey, label: k.groupLabel, items: [] };
        map.set(k.groupKey, entry);
        groups.push(entry);
      }
      entry.items.push(s);
    }
    return groups;
  }, [remainingActive]);

  const historyStats = useMemo(() => {
    const completed = historySessions.filter((s) => s.status === 'COMPLETED').length;
    const cancelled = historySessions.filter((s) => s.status === 'CANCELLED').length;
    return { total: historySessions.length, completed, cancelled };
  }, [historySessions]);

  const renderHeroCard = (session: MySessionItem) => {
    const kickoff = formatKickoff(session.start_time);
    const urgency = getUrgencyLabel(session.start_time);
    const sport = getSportLabel(session.activity_type, session.session_category);
    const format = getFormatLabel(session.activity_type, session.max_slots || 10);
    const st = getSportTheme(session.activity_type);
    const venueName = session.venues?.name || session.custom_location || 'Venue Mabar';
    const totalSlots = session.max_slots || 10;
    const filledSlots = session.participantCount;
    const priceStr = formatShortPrice(session.estimated_cost_total, totalSlots);

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => handleOpenLobby(session)}
        style={[styles.heroCard, { borderColor: st.subtleBorder }]}
      >
        <View style={styles.heroTopRail}>
          <Text style={[styles.heroSportMeta, { color: st.textHex }]}>
            {sport} · {format}
          </Text>
          <Text style={styles.heroStatusText}>
            {session.isHost ? 'Kamu Host' : 'Slot Terkonfirmasi'}
          </Text>
        </View>

        <View style={styles.heroMiddle}>
          <View style={styles.heroTimeLine}>
            <Text style={styles.heroKickoff}>{kickoff.time}</Text>
            <Text style={styles.heroWib}>WIB</Text>
            <Text style={styles.heroUrgencyInline}>· {urgency}</Text>
          </View>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {session.title}
          </Text>
          <View style={styles.venueInlineRow}>
            <MapPinIcon color={st.hex} size={12} />
            <Text style={styles.heroVenue} numberOfLines={1}>
              {venueName}
            </Text>
          </View>
        </View>

        <View style={styles.heroGrid}>
          <View style={styles.heroGridCol}>
            <Text style={styles.heroGridLabel}>TANGGAL</Text>
            <Text style={styles.heroGridValue}>{kickoff.shortDate}</Text>
          </View>
          <View style={styles.heroGridColMid}>
            <Text style={styles.heroGridLabel}>PEMAIN</Text>
            <Text style={styles.heroGridValue}>
              {filledSlots}/{totalSlots} slot
            </Text>
          </View>
          <View style={styles.heroGridColRight}>
            <Text style={styles.heroGridLabel}>PATUNGAN</Text>
            <Text style={[styles.heroGridValue, priceStr === 'Gratis' && { color: st.textHex }]}>
              {priceStr}
            </Text>
          </View>
        </View>

        <View style={styles.heroFooter}>
          <TouchableOpacity
            style={styles.mapsLinkBtn}
            activeOpacity={0.75}
            onPress={() => handleOpenMaps(session.venues?.maps_url, venueName)}
          >
            <MapPinIcon color={THEME.colors.textSecondary} size={13} />
            <Text style={styles.mapsLinkText}>Buka Maps</Text>
          </TouchableOpacity>

          <View style={[styles.heroArrowBtn, { backgroundColor: THEME.colors.primary }]}>
            <Text style={styles.heroArrowLabel}>Masuk Lobby</Text>
            <ArrowUpRightIcon color={THEME.colors.textOnPrimary} size={15} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderAgendaRow = (session: MySessionItem, isLast: boolean) => {
    const kickoff = formatKickoff(session.start_time);
    const sport = getSportLabel(session.activity_type, session.session_category);
    const format = getFormatLabel(session.activity_type, session.max_slots || 10);
    const st = getSportTheme(session.activity_type);
    const venueName = session.venues?.name || session.custom_location || 'Venue Mabar';
    const totalSlots = session.max_slots || 10;
    const filledSlots = session.participantCount;

    return (
      <TouchableOpacity
        key={session.id}
        activeOpacity={0.82}
        onPress={() => handleOpenLobby(session)}
        style={[styles.agendaRow, !isLast && styles.agendaRowDivider]}
      >
        {/* Left Time Column */}
        <View style={styles.agendaTimeCol}>
          <Text style={styles.agendaTimeText}>{kickoff.time}</Text>
          <View style={styles.agendaDateRow}>
            <View style={[styles.agendaDot, { backgroundColor: st.hex }]} />
            <Text style={styles.agendaDateText}>{kickoff.shortDate}</Text>
          </View>
        </View>

        {/* Vertical Hairline */}
        <View style={styles.agendaVerticalLine} />

        {/* Right Details */}
        <View style={styles.agendaInfoCol}>
          <View style={styles.agendaMetaTop}>
            <Text style={[styles.agendaSport, { color: st.textHex }]}>
              {sport} · {format}
            </Text>
            <Text style={styles.agendaRole}>
              {session.isHost ? 'Host' : 'Joined'} · {filledSlots}/{totalSlots}
            </Text>
          </View>

          <Text style={styles.agendaTitle} numberOfLines={1}>
            {session.title}
          </Text>

          <View style={styles.agendaBottomRow}>
            <View style={[styles.venueInlineRow, { flex: 1, marginTop: 0 }]}>
              <MapPinIcon color={THEME.colors.textMuted} size={11} />
              <Text style={styles.agendaVenue} numberOfLines={1}>
                {venueName}
              </Text>
            </View>

            <View style={styles.agendaActions}>
              <TouchableOpacity
                onPress={() => handleOpenMaps(session.venues?.maps_url, venueName)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Buka Maps"
              >
                <MapPinIcon color={THEME.colors.textSecondary} size={13} />
              </TouchableOpacity>
              <ChevronRightIcon color={THEME.colors.textMuted} size={15} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.topAppBar}>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Sesi Saya</Text>
          <Text style={styles.headerSubtitle}>Agenda main &amp; riwayat mabar</Text>
        </View>

        <TouchableOpacity
          style={styles.headerActionBtn}
          activeOpacity={0.8}
          onPress={() => loadMySessions(true)}
          accessibilityLabel="Refresh Data Sesi"
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={THEME.colors.primary} />
          ) : (
            <RefreshIcon color={THEME.colors.textSecondary} size={16} />
          )}
        </TouchableOpacity>
      </View>

      {/* Underline Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeSegment === 'active' && styles.tabItemActive]}
          activeOpacity={0.8}
          onPress={() => setActiveSegment('active')}
        >
          <Text style={[styles.tabLabel, activeSegment === 'active' && styles.tabLabelActive]}>
            Jadwal Aktif
          </Text>
          <Text style={[styles.tabCount, activeSegment === 'active' && styles.tabCountActive]}>
            {activeSessions.length}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeSegment === 'history' && styles.tabItemActive]}
          activeOpacity={0.8}
          onPress={() => setActiveSegment('history')}
        >
          <Text style={[styles.tabLabel, activeSegment === 'history' && styles.tabLabelActive]}>
            Riwayat
          </Text>
          <Text style={[styles.tabCount, activeSegment === 'history' && styles.tabCountActive]}>
            {historySessions.length}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
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
          <SkeletonLoader />
        ) : !user ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <LockIcon color={THEME.colors.primary} size={22} />
            </View>
            <Text style={styles.emptyTitle}>Masuk untuk Lihat Jadwal</Text>
            <Text style={styles.emptySubtitle}>
              Lacak sesi mabar yang kamu ikuti dan buka lobby pertandingan langsung dari sini.
            </Text>
            <TouchableOpacity
              style={styles.btnEmptyPrimary}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Auth')}
            >
              <Text style={styles.btnEmptyPrimaryText}>Masuk ke Akun</Text>
            </TouchableOpacity>
          </View>
        ) : activeSegment === 'active' ? (
          activeSessions.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconBox}>
                <CalendarIcon color={THEME.colors.primary} size={22} />
              </View>
              <Text style={styles.emptyTitle}>Belum Ada Jadwal Aktif</Text>
              <Text style={styles.emptySubtitle}>
                Kamu belum bergabung atau membuat sesi mabar. Cari sesi di Explore atau buat room baru.
              </Text>
              <View style={styles.emptyBtnStack}>
                <TouchableOpacity
                  style={styles.btnEmptyPrimary}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('Explore')}
                >
                  <Text style={styles.btnEmptyPrimaryText}>Cari di Explore</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnEmptySecondary}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('Create')}
                >
                  <Text style={styles.btnEmptySecondaryText}>Buat Sesi Baru</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View>
              {activeSessions.length > 1 ? (
                <View style={styles.filterRow}>
                  {(
                    [
                      { id: 'all', label: 'Semua' },
                      { id: 'host', label: 'Host' },
                      { id: 'joined', label: 'Ikut' }
                    ] as { id: RoleFilter; label: string }[]
                  ).map((f) => {
                    const active = roleFilter === f.id;
                    return (
                      <TouchableOpacity
                        key={f.id}
                        style={[styles.filterPill, active && styles.filterPillActive]}
                        activeOpacity={0.8}
                        onPress={() => setRoleFilter(f.id)}
                      >
                        <Text
                          style={[styles.filterPillText, active && styles.filterPillTextActive]}
                        >
                          {f.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}

              {filteredActive.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Kosong di Filter Ini</Text>
                  <Text style={styles.emptySubtitle}>
                    Tidak ada sesi aktif untuk filter yang dipilih.
                  </Text>
                  <TouchableOpacity
                    style={styles.btnEmptySecondary}
                    activeOpacity={0.85}
                    onPress={() => setRoleFilter('all')}
                  >
                    <Text style={styles.btnEmptySecondaryText}>Lihat Semua</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {nextMatch ? (
                    <View style={styles.sectionBlock}>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionHeading}>Main Terdekat</Text>
                      </View>
                      {renderHeroCard(nextMatch)}
                    </View>
                  ) : null}

                  {groupedRemaining.map((group) => (
                    <View key={group.key} style={styles.sectionBlock}>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionHeading}>{group.label}</Text>
                        <Text style={styles.sectionCount}>{group.items.length} jadwal</Text>
                      </View>
                      <View style={styles.agendaGroupCard}>
                        {group.items.map((item, idx) =>
                          renderAgendaRow(item, idx === group.items.length - 1)
                        )}
                      </View>
                    </View>
                  ))}
                </>
              )}
            </View>
          )
        ) : (
          /* TAB 2: RIWAYAT */
          <View>
            {historySessions.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconBox}>
                  <CalendarIcon color={THEME.colors.textSecondary} size={22} />
                </View>
                <Text style={styles.emptyTitle}>Belum Ada Riwayat</Text>
                <Text style={styles.emptySubtitle}>
                  Sesi yang sudah selesai atau dibatalkan akan muncul di sini.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.historySummaryRow}>
                  <Text style={styles.historySummaryText}>
                    {historyStats.total} sesi tercatat ·{' '}
                    <Text style={{ color: THEME.colors.success }}>{historyStats.completed} selesai</Text>
                    {historyStats.cancelled > 0 ? (
                      <Text style={{ color: '#FF6B63' }}> · {historyStats.cancelled} batal</Text>
                    ) : null}
                  </Text>
                </View>

                <View style={styles.agendaGroupCard}>
                  {historySessions.map((session, idx) => {
                    const kickoff = formatKickoff(session.start_time);
                    const venueName =
                      session.venues?.name || session.custom_location || 'Venue Mabar';
                    const isCancelled = session.status === 'CANCELLED';
                    const sport = getSportLabel(session.activity_type, session.session_category);
                    const st = getSportTheme(session.activity_type);
                    const isLast = idx === historySessions.length - 1;

                    return (
                      <TouchableOpacity
                        key={session.id}
                        style={[
                          styles.agendaRow,
                          !isLast && styles.agendaRowDivider
                        ]}
                        activeOpacity={0.82}
                        onPress={() => handleOpenLobby(session)}
                      >
                        <View style={styles.agendaTimeCol}>
                          <Text style={styles.historyDateText}>{kickoff.shortDate}</Text>
                          <View style={styles.agendaDateRow}>
                            <View
                              style={[
                                styles.agendaDot,
                                { backgroundColor: isCancelled ? '#FF6B63' : st.hex }
                              ]}
                            />
                            <Text style={styles.historyTimeText}>{kickoff.time}</Text>
                          </View>
                        </View>

                        <View style={styles.agendaVerticalLine} />

                        <View style={styles.agendaInfoCol}>
                          <View style={styles.agendaMetaTop}>
                            <Text style={[styles.agendaSport, { color: st.textHex }]}>
                              {sport}
                            </Text>
                            <View
                              style={[
                                styles.historyStatusPill,
                                isCancelled
                                  ? styles.historyStatusPillCancelled
                                  : styles.historyStatusPillCompleted
                              ]}
                            >
                              <Text
                                style={[
                                  styles.historyStatus,
                                  isCancelled
                                    ? { color: '#FF6B63' }
                                    : { color: THEME.colors.success }
                                ]}
                              >
                                {isCancelled ? 'DIBATALKAN' : 'SELESAI'}
                              </Text>
                            </View>
                          </View>

                          <Text
                            style={[
                              styles.agendaTitle,
                              isCancelled && styles.historyTitleCancelled
                            ]}
                            numberOfLines={1}
                          >
                            {session.title}
                          </Text>

                          <View style={styles.agendaBottomRow}>
                            <View style={[styles.venueInlineRow, { flex: 1, marginTop: 0 }]}>
                              <MapPinIcon color={THEME.colors.textSecondary} size={11} />
                              <Text style={styles.agendaVenue} numberOfLines={1}>
                                {venueName}
                              </Text>
                            </View>
                            <Text style={styles.historyRole}>
                              {session.isHost ? 'Host' : 'Pemain'}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
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
    paddingTop: 12,
    paddingBottom: 32
  },

  // Header
  topAppBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10
  },
  headerTitleBox: {
    flex: 1
  },
  headerTitle: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 22,
    color: THEME.colors.text,
    letterSpacing: -0.4,
    includeFontPadding: false
  },
  headerSubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
    includeFontPadding: false
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center'
  },

  // Underline Tabs
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 24
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  tabItemActive: {
    borderBottomColor: THEME.colors.primary
  },
  tabLabel: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 14,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  tabLabelActive: {
    fontFamily: THEME.typography.fonts.bold,
    color: THEME.colors.text
  },
  tabCount: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  tabCountActive: {
    color: THEME.colors.primary
  },

  // Filter Pills
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)'
  },
  filterPillActive: {
    backgroundColor: 'rgba(213, 255, 64, 0.12)',
    borderColor: 'rgba(213, 255, 64, 0.4)'
  },
  filterPillText: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  filterPillTextActive: {
    fontFamily: THEME.typography.fonts.bold,
    color: THEME.colors.primary
  },

  // Sections
  sectionBlock: {
    marginBottom: 22
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  sectionHeading: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 17,
    color: THEME.colors.text,
    letterSpacing: -0.3,
    includeFontPadding: false
  },
  sectionCount: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 12,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },

  // Hero Ticket Card
  heroCard: {
    backgroundColor: '#171A24',
    borderRadius: 20,
    borderWidth: 1,
    padding: 18
  },
  heroTopRail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10
  },
  heroSportMeta: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 11,
    letterSpacing: 1,
    includeFontPadding: false
  },
  heroStatusText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  heroMiddle: {
    marginBottom: 4
  },
  heroTimeLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5
  },
  heroKickoff: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 34,
    color: THEME.colors.text,
    letterSpacing: -1.2,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false
  },
  heroWib: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  heroUrgencyInline: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  heroTitle: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 17,
    lineHeight: 22,
    color: THEME.colors.text,
    marginTop: 4,
    includeFontPadding: false
  },
  venueInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5
  },
  heroVenue: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    includeFontPadding: false,
    flexShrink: 1
  },
  heroGrid: {
    flexDirection: 'row',
    paddingTop: 12,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)'
  },
  heroGridCol: {
    flex: 1
  },
  heroGridColMid: {
    flex: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 10
  },
  heroGridColRight: {
    flex: 1,
    paddingLeft: 10
  },
  heroGridLabel: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textMuted,
    letterSpacing: 0.6,
    includeFontPadding: false
  },
  heroGridValue: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 13,
    color: THEME.colors.text,
    marginTop: 3,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)'
  },
  mapsLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingRight: 8
  },
  mapsLinkText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 13,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  heroArrowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 99
  },
  heroArrowLabel: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13,
    color: THEME.colors.textOnPrimary,
    includeFontPadding: false
  },

  // Agenda List (unique to MySessions)
  agendaGroupCard: {
    backgroundColor: '#171A24',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden'
  },
  agendaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12
  },
  agendaRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)'
  },
  agendaTimeCol: {
    width: 62,
    alignItems: 'flex-start',
    gap: 3
  },
  agendaTimeText: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 16,
    color: THEME.colors.text,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false
  },
  agendaDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  agendaDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  agendaDateText: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 11,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  agendaVerticalLine: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.07)'
  },
  agendaInfoCol: {
    flex: 1,
    gap: 4
  },
  agendaMetaTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  agendaSport: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 10,
    letterSpacing: 0.7,
    includeFontPadding: false
  },
  agendaRole: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 11,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  agendaTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 14,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  agendaBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 1
  },
  agendaVenue: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    includeFontPadding: false,
    flexShrink: 1
  },
  agendaActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },

  // History
  historySummaryRow: {
    marginBottom: 12
  },
  historySummaryText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  historyDateText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  historyTimeText: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  historyStatusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6
  },
  historyStatusPillCompleted: {
    backgroundColor: 'rgba(0, 245, 155, 0.12)'
  },
  historyStatusPillCancelled: {
    backgroundColor: 'rgba(255, 59, 48, 0.14)'
  },
  historyStatus: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    letterSpacing: 0.5,
    includeFontPadding: false
  },
  historyTitleCancelled: {
    color: '#D6DAE3'
  },
  historyRole: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },

  // Empty States
  emptyCard: {
    backgroundColor: '#171A24',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
    marginTop: 8
  },
  emptyIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  emptyTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 16,
    color: THEME.colors.text,
    textAlign: 'center',
    includeFontPadding: false
  },
  emptySubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20
  },
  emptyBtnStack: {
    width: '100%',
    gap: 10
  },
  btnEmptyPrimary: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnEmptyPrimaryText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 14,
    color: THEME.colors.textOnPrimary,
    includeFontPadding: false
  },
  btnEmptySecondary: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnEmptySecondaryText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 13,
    color: THEME.colors.text,
    includeFontPadding: false
  },

  // Skeleton
  skeletonWrap: {
    gap: 16
  },
  skeletonHero: {
    backgroundColor: '#171A24',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 18
  },
  skeletonAgenda: {
    backgroundColor: '#171A24',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden'
  },
  skeletonAgendaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14
  },
  skeletonRowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  skeletonLine: {
    borderRadius: 6,
    backgroundColor: THEME.colors.cardElevated
  }
});
