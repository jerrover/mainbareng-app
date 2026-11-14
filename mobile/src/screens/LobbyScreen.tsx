import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Share,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { THEME } from '../theme';
import { MainTabParamList } from '../navigation/types';
import CustomAlertModal, { AlertType } from '../components/CustomAlertModal';
import { api, ApiSession } from '../services/api';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';

type Props = BottomTabScreenProps<MainTabParamList, 'Lobby'>;

interface Player {
  id?: string;
  userId?: string;
  slot: number;
  name: string;
  role: string;
  ovr: number;
  karma: number;
  team: 'A' | 'B';
  isHost?: boolean;
  isGuest?: boolean;
}

// Fallback initial roster jika sesi belum ada peserta
const FALLBACK_PLAYERS: Player[] = [
  { slot: 1, name: 'Jeremy Marvel', role: 'Pivot / Striker', ovr: 88, karma: 98, team: 'A', isHost: true },
  { slot: 2, name: 'Ben_Mobile', role: 'Flank Kanan', ovr: 84, karma: 92, team: 'A' },
  { slot: 3, name: 'Hyun_Striker', role: 'Anchor', ovr: 86, karma: 88, team: 'B' },
  { slot: 4, name: 'Yua_Design', role: 'Flank Kiri', ovr: 82, karma: 95, team: 'B' },
  { slot: 5, name: 'Jerikho_Backend', role: 'Kiper Utama', ovr: 89, karma: 90, team: 'A' },
  { slot: 6, name: 'Budi_W', role: 'Anchor', ovr: 79, karma: 82, team: 'B' },
  { slot: 7, name: 'Andi_K', role: 'Pivot', ovr: 83, karma: 85, team: 'A' },
  { slot: 8, name: 'Rian_F', role: 'Kiper', ovr: 80, karma: 78, team: 'B' }
];

function formatKickoffTime(isoDateStr?: string | null): { kickoffStr: string; remainingStr: string } {
  if (!isoDateStr) return { kickoffStr: 'Hari Ini, 19:30 WIB', remainingStr: '⏱️ Menunggu Jadwal' };
  try {
    const d = new Date(isoDateStr);
    if (isNaN(d.getTime())) return { kickoffStr: 'Hari Ini, 19:30 WIB', remainingStr: '⏱️ Segera' };

    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const dateNum = d.getDate();
    const month = d.toLocaleString('id-ID', { month: 'short' });

    const now = new Date();
    const diffMs = d.getTime() - now.getTime();

    let remainingStr = '⏱️ Terjadwal';
    if (diffMs > 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      if (diffHours > 24) {
        const days = Math.floor(diffHours / 24);
        remainingStr = `⏱️ ${days} Hari Lagi`;
      } else {
        remainingStr = `⏱️ ${diffHours}j ${diffMins}m Lagi`;
      }
    } else {
      remainingStr = '⏱️ Sedang Berjalan';
    }

    return {
      kickoffStr: `${dateNum} ${month}, ${hours}:${minutes} WIB`,
      remainingStr
    };
  } catch {
    return { kickoffStr: 'Hari Ini, 19:30 WIB', remainingStr: '⏱️ Segera' };
  }
}

export default function LobbyScreen({ route, navigation }: Props) {
  const { user } = useAuthStore();
  const routeSessionId = route?.params?.sessionId;
  const routeSessionTitle = route?.params?.sessionTitle;

  // Session state from database
  const [currentSession, setCurrentSession] = useState<ApiSession | null>(null);
  const [participants, setParticipants] = useState<Player[]>(FALLBACK_PLAYERS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSplitting, setIsSplitting] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);

  const [activeTeamTab, setActiveTeamTab] = useState<'all' | 'A' | 'B'>('all');

  // Custom Alert Modal State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
    primaryButtonText?: string;
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
    primaryButtonText = 'Mengerti'
  ) => {
    setAlertConfig({
      visible: true,
      type,
      title,
      message,
      primaryButtonText
    });
  };

  const closeAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  // 1. Fetch Session & Participants from Supabase
  const loadSessionAndRoster = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        let targetId = routeSessionId;

        // Jika tidak ada sessionId dari route (user buka tab "Sesi Saya"), cari sesi aktif user
        if (!targetId && user?.id) {
          const { data: myPart } = await supabase
            .from('session_participants')
            .select('session_id')
            .eq('user_id', user.id)
            .neq('attendance_status', 'CANCELLED')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (myPart?.session_id) {
            targetId = myPart.session_id;
          }
        }

        // Jika masih belum ada, cari sesi aktif terakhir di database
        if (!targetId) {
          const { data: latestSession } = await supabase
            .from('sessions')
            .select('id')
            .in('status', ['OPEN', 'LOCKED'])
            .order('start_time', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (latestSession?.id) {
            targetId = latestSession.id;
          }
        }

        // Jika tidak ada sesi sama sekali di DB, gunakan fallback
        if (!targetId) {
          setIsLiveConnected(false);
          setParticipants(FALLBACK_PLAYERS);
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }

        // Ambil detail sesi dari Supabase
        const { data: sessionData, error: sessErr } = await supabase
          .from('sessions')
          .select('*, profiles:host_id(full_name, credit_score), venues(*)')
          .eq('id', targetId)
          .maybeSingle();

        if (sessErr || !sessionData) {
          console.warn('[LobbyScreen] Error fetching session:', sessErr?.message);
          setIsLiveConnected(false);
          setParticipants(FALLBACK_PLAYERS);
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }

        setCurrentSession(sessionData as ApiSession);
        setIsLiveConnected(true);

        // Ambil data peserta aktif dari tabel session_participants
        const { data: partData, error: partErr } = await supabase
          .from('session_participants')
          .select(
            'id, session_id, user_id, is_guest, guest_name, lock_as_duo, slot_number, assigned_team, skill_rating_points, attendance_status, profiles:user_id(id, full_name, credit_score)'
          )
          .eq('session_id', targetId)
          .neq('attendance_status', 'CANCELLED')
          .order('slot_number', { ascending: true });

        if (!partErr && partData && partData.length > 0) {
          const mappedPlayers: Player[] = partData.map((p: any) => {
            const isGuest = Boolean(p.is_guest);
            const resolvedName = isGuest
              ? `${p.guest_name || 'Tamu'} (Guest)`
              : p.profiles?.full_name || `Pemain #${p.slot_number}`;
            const isHost = p.user_id === sessionData.host_id;
            const karma = p.profiles?.credit_score ?? 100;
            const points = p.skill_rating_points ?? 1200;
            const ovr = Math.min(99, Math.max(60, Math.round(points / 15)));

            // Team A atau Team B
            const rawTeam = p.assigned_team || '';
            const team: 'A' | 'B' =
              rawTeam.toUpperCase().includes('B') || rawTeam === 'Team B' ? 'B' : 'A';

            return {
              id: p.id,
              userId: p.user_id,
              slot: p.slot_number || 1,
              name: resolvedName,
              role: isHost ? 'Host / Kapten' : 'Flex Player',
              ovr,
              karma,
              team,
              isHost,
              isGuest
            };
          });

          setParticipants(mappedPlayers);
        } else {
          // Jika belum ada peserta di tabel session_participants, buat 1 slot untuk host
          const hostName = sessionData.profiles?.full_name || 'Host Mabar';
          const hostKarma = sessionData.profiles?.credit_score ?? 100;
          setParticipants([
            {
              slot: 1,
              userId: sessionData.host_id,
              name: hostName,
              role: 'Host / Kapten',
              ovr: 88,
              karma: hostKarma,
              team: 'A',
              isHost: true
            }
          ]);
        }
      } catch (err) {
        console.warn('[LobbyScreen] Error loading lobby data:', err);
        setIsLiveConnected(false);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [routeSessionId, user?.id]
  );

  useEffect(() => {
    loadSessionAndRoster();
  }, [loadSessionAndRoster]);

  // Real-time listener: dengarkan perubahan peserta & status sesi di Supabase
  useEffect(() => {
    const sessionId = currentSession?.id || routeSessionId;
    if (!sessionId) return;

    const channel = supabase
      .channel(`lobby-room-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_participants',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          loadSessionAndRoster(false);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`
        },
        () => {
          loadSessionAndRoster(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSession?.id, routeSessionId, loadSessionAndRoster]);

  // Periksa apakah user yang sedang login sudah terdaftar di lobi ini
  const hasJoined = useMemo(() => {
    if (!user) return false;
    return participants.some((p) => p.userId === user.id);
  }, [participants, user]);

  // Dynamic values
  const totalSlots = currentSession?.max_slots || 10;
  const venueTotalCost = currentSession?.estimated_cost_total || 300000;
  const currentCostPerPlayer = Math.round(venueTotalCost / Math.max(participants.length, 1));
  const fullTargetCostPerPlayer = Math.round(venueTotalCost / totalSlots);

  const kickoffInfo = formatKickoffTime(currentSession?.start_time);
  const venueTitle =
    currentSession?.venues?.name ||
    currentSession?.custom_location ||
    'GOR Bulungan Arena · Court 1 Vinyl';
  const mapsUrl = currentSession?.venues?.maps_url || null;

  // 2. Action: Trigger Balanced Team Splitter (Real API Hit)
  const handleRunBalancer = async () => {
    if (!currentSession?.id) {
      showAlert(
        'info',
        'AI Team Balancer (Simulasi) ⚖️',
        'Algoritma telah menyeimbangkan komposisi Tim A dan Tim B berdasarkan skill rating dan credit score.'
      );
      return;
    }

    if (participants.length < 2) {
      showAlert(
        'warning',
        'Peserta Belum Cukup',
        'Minimal 2 peserta aktif dibutuhkan untuk membagi Tim A dan Tim B secara seimbang.'
      );
      return;
    }

    setIsSplitting(true);
    try {
      const splitResult = await api.splitTeams(currentSession.id);
      const teamA = splitResult.team_a;
      const teamB = splitResult.team_b;
      const diff = splitResult.skill_difference_percent ?? 0;

      showAlert(
        'success',
        'AI Team Balancer Selesai! ⚖️',
        `Tim A (${teamA?.members?.length || 0} pemain, Avg OVR: ${teamA?.average_skill || 1200})\n` +
          `Tim B (${teamB?.members?.length || 0} pemain, Avg OVR: ${teamB?.average_skill || 1200})\n\n` +
          `Selisih skill seimbang: ${diff}%. Data telah disimpan ke database.`
      );

      // Re-fetch data terbaru dari database
      await loadSessionAndRoster(false);
    } catch (err: any) {
      console.warn('[LobbyScreen] Error splitting teams:', err);
      showAlert(
        'error',
        'Gagal Membagi Tim',
        err.message || 'Terjadi kesalahan saat membagi tim di server.'
      );
    } finally {
      setIsSplitting(false);
    }
  };

  // 3. Action: Join Slot (Atomic Supabase Join API)
  const handleJoinSlot = async () => {
    if (hasJoined) {
      showAlert('info', 'Sudah Terdaftar', 'Anda sudah mengunci slot di sesi mabar ini.');
      return;
    }

    if (participants.length >= totalSlots) {
      showAlert('warning', 'Lobi Penuh', `Kapasitas maksimal ${totalSlots}/${totalSlots} telah terpenuhi.`);
      return;
    }

    if (!user) {
      showAlert('warning', 'Login Diperlukan', 'Silakan login terlebih dahulu untuk bergabung ke sesi ini.');
      return;
    }

    if (!currentSession?.id) {
      // Local fallback
      const nextSlot = participants.length + 1;
      const assignedTeam: 'A' | 'B' = nextSlot % 2 === 1 ? 'A' : 'B';
      const newPlayer: Player = {
        slot: nextSlot,
        userId: user.id,
        name: user.user_metadata?.full_name || 'Anda (Saya)',
        role: 'Flex Player',
        ovr: 85,
        karma: 100,
        team: assignedTeam
      };
      setParticipants([...participants, newPlayer]);
      showAlert('success', 'Slot Berhasil Dikunci!', `Selamat! Slot #${nextSlot} (${assignedTeam === 'A' ? 'Tim A' : 'Tim B'}) terkunci.`);
      return;
    }

    setIsJoining(true);
    try {
      const res = await api.joinSession(currentSession.id, user.id);
      showAlert(
        'success',
        'Slot Berhasil Dikunci! 🔒',
        `Selamat! Slot #${res.slot_number} berhasil dikunci secara atomik dengan row-level lock di Supabase.`
      );
      await loadSessionAndRoster(false);
    } catch (err: any) {
      showAlert('error', 'Gagal Bergabung', err.message || 'Tidak dapat bergabung ke sesi ini.');
    } finally {
      setIsJoining(false);
    }
  };

  // 4. Action: Bagikan Tautan Undangan
  const handleShareInvite = async () => {
    const sessionName = currentSession?.title || routeSessionTitle || 'Sesi Mabar';
    const roomCode = currentSession?.id ? currentSession.id.slice(0, 8).toUpperCase() : 'MABAR-01';
    const shareMessage = `Ayo gabung mabar ${sessionName}!\nKode Room: #${roomCode}\nLokasi: ${venueTitle}\nKickoff: ${kickoffInfo.kickoffStr}\nBuka aplikasi Mabar sekarang!`;

    try {
      await Share.share({
        message: shareMessage,
        title: `Undangan Mabar: ${sessionName}`
      });
    } catch {
      showAlert(
        'info',
        'Tautan Disalin 🔗',
        'Teks undangan match mabar telah disiapkan. Kirimkan ke grup WhatsApp atau Discord temanmu.'
      );
    }
  };

  const handleOpenMaps = () => {
    if (mapsUrl) {
      Linking.openURL(mapsUrl).catch(() => {
        showAlert('info', 'Lokasi Maps', `Membuka peta Google Maps ke ${venueTitle}.`);
      });
    } else {
      showAlert('info', 'Lokasi Maps', `Membuka peta Google Maps ke ${venueTitle}.`);
    }
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
            onRefresh={() => loadSessionAndRoster(true)}
            tintColor={THEME.colors.primary}
            colors={[THEME.colors.primary]}
          />
        }
      >
        {/* Top Bar (Figma SCR-11 35:1002) */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Explore')}
          >
            <Text style={styles.backBtnIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.topBarCenter}>
            <Text style={styles.topBarTitle} numberOfLines={1}>
              {currentSession?.title || routeSessionTitle || 'Match Lobby Sesi Mabar'}
            </Text>
            <Text style={styles.topBarSubtitle}>
              Kode Room: #{currentSession?.id ? currentSession.id.slice(0, 8).toUpperCase() : 'FTS-089'} 📋
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              currentSession?.status === 'LOCKED' && styles.statusPillLocked
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                currentSession?.status === 'LOCKED' && styles.statusPillLockedText
              ]}
            >
              {currentSession?.status || 'OPEN'} · {participants.length}/{totalSlots}
            </Text>
          </View>
        </View>

        {/* Live Database Indicator */}
        <View style={styles.liveIndicatorRow}>
          <View
            style={[
              styles.liveDot,
              { backgroundColor: isLiveConnected ? THEME.colors.success : THEME.colors.warning }
            ]}
          />
          <Text style={styles.liveIndicatorText}>
            {isLiveConnected
              ? 'Terhubung Database Supabase & Realtime CDC'
              : 'Mode Simulasi (Data Fallback)'}
          </Text>
        </View>

        {/* Kickoff & Venue Card (Figma 127:96) */}
        <View style={styles.kickoffVenueCard}>
          <View style={styles.kickoffHeaderRow}>
            <Text style={styles.kickoffTimeText}>KICKOFF: {kickoffInfo.kickoffStr}</Text>
            <View style={styles.timeRemainingPill}>
              <Text style={styles.timeRemainingText}>{kickoffInfo.remainingStr}</Text>
            </View>
          </View>
          <View style={styles.venueLocationRow}>
            <Text style={styles.venueLocationText} numberOfLines={1}>
              📍 {venueTitle}
            </Text>
            <TouchableOpacity onPress={handleOpenMaps}>
              <Text style={styles.openMapsText}>Buka Maps →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dynamic Split-Bill Box (Figma 127:104) */}
        <View style={styles.splitBillCard}>
          <View style={styles.splitBillHeader}>
            <View style={styles.splitBillInfoBox}>
              <Text style={styles.splitBillLabel}>ESTIMASI PATUNGAN DINAMIS</Text>
              <Text style={styles.splitBillCondition} numberOfLines={1}>
                {venueTotalCost > 0
                  ? `Biaya sewa: Rp ${venueTotalCost.toLocaleString('id-ID')} · Saat ini: Rp ${currentCostPerPlayer.toLocaleString('id-ID')}/org`
                  : 'Sesi Bebas Biaya Sewa (Gratis)'}
              </Text>
            </View>
            <View style={styles.splitBillAmountBox}>
              <Text style={styles.splitBillAmount}>
                {venueTotalCost > 0
                  ? `Rp ${fullTargetCostPerPlayer.toLocaleString('id-ID')}`
                  : 'Gratis'}
              </Text>
              <Text style={styles.splitBillConditionBadge}>
                Target Kuota {totalSlots}
              </Text>
            </View>
          </View>
        </View>

        {/* Roster & Slot Matrix Header */}
        <View style={styles.rosterHeader}>
          <View style={styles.rosterTitleBox}>
            <Text style={styles.rosterTitle}>
              ROSTER PEMAIN ({participants.length}/{totalSlots})
            </Text>
            <Text style={styles.atomicLockBadge}>🔒 Atomic Slot Lock</Text>
          </View>

          {/* Team Filter Tabs */}
          <View style={styles.teamTabRow}>
            <TouchableOpacity
              style={[styles.teamTab, activeTeamTab === 'all' && styles.teamTabActive]}
              onPress={() => setActiveTeamTab('all')}
            >
              <Text
                style={[
                  styles.teamTabText,
                  activeTeamTab === 'all' && styles.teamTabTextActive
                ]}
              >
                Semua ({participants.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.teamTab,
                styles.teamTabBlue,
                activeTeamTab === 'A' && styles.teamTabActiveBlue
              ]}
              onPress={() => setActiveTeamTab('A')}
            >
              <Text
                style={[
                  styles.teamTabText,
                  activeTeamTab === 'A' && styles.teamTabTextActive
                ]}
              >
                🔵 Tim A ({participants.filter((p) => p.team === 'A').length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.teamTab,
                styles.teamTabRed,
                activeTeamTab === 'B' && styles.teamTabActiveRed
              ]}
              onPress={() => setActiveTeamTab('B')}
            >
              <Text
                style={[
                  styles.teamTabText,
                  activeTeamTab === 'B' && styles.teamTabTextActive
                ]}
              >
                🔴 Tim B ({participants.filter((p) => p.team === 'B').length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Loading Indicator */}
        {isLoading && !isRefreshing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
            <Text style={styles.loadingText}>Memuat roster pemain dari Supabase...</Text>
          </View>
        )}

        {/* Player Slot List */}
        {!isLoading && (
          <View style={styles.rosterList}>
            {Array.from({ length: totalSlots }, (_, i) => i + 1).map((slotNum) => {
              const player = participants.find((p) => p.slot === slotNum);

              // Filter by team if selected
              if (activeTeamTab !== 'all' && player && player.team !== activeTeamTab) {
                return null;
              }

              if (player) {
                const initials = player.name.slice(0, 2).toUpperCase();
                const isTeamA = player.team === 'A';

                return (
                  <View
                    key={slotNum}
                    style={[
                      styles.playerCardFilled,
                      isTeamA ? styles.borderTeamA : styles.borderTeamB
                    ]}
                  >
                    <View style={styles.playerSlotBadge}>
                      <Text style={styles.playerSlotText}>#{slotNum}</Text>
                    </View>

                    <View
                      style={[
                        styles.playerAvatar,
                        isTeamA ? styles.avatarTeamA : styles.avatarTeamB
                      ]}
                    >
                      <Text
                        style={[
                          styles.playerAvatarText,
                          isTeamA ? styles.avatarTextTeamA : styles.avatarTextTeamB
                        ]}
                      >
                        {initials}
                      </Text>
                    </View>

                    <View style={styles.playerDetails}>
                      <View style={styles.playerNameRow}>
                        <Text style={styles.playerName} numberOfLines={1}>
                          {player.name}
                        </Text>
                        {player.isHost && (
                          <View style={styles.hostBadge}>
                            <Text style={styles.hostBadgeText}>HOST</Text>
                          </View>
                        )}
                        <View
                          style={[
                            styles.teamTag,
                            isTeamA ? styles.teamTagA : styles.teamTagB
                          ]}
                        >
                          <Text
                            style={[
                              styles.teamTagText,
                              isTeamA ? styles.teamTagTextA : styles.teamTagTextB
                            ]}
                          >
                            {isTeamA ? 'TIM A' : 'TIM B'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.playerRole}>{player.role}</Text>
                    </View>

                    <View style={styles.playerStats}>
                      <View style={styles.ovrBadge}>
                        <Text style={styles.ovrText}>OVR {player.ovr}</Text>
                      </View>
                      <Text style={styles.karmaText}>🛡️ {player.karma}</Text>
                    </View>
                  </View>
                );
              }

              // Empty Slot
              return (
                <View key={slotNum} style={styles.playerCardEmpty}>
                  <View style={styles.emptySlotBadge}>
                    <Text style={styles.emptySlotText}>#{slotNum}</Text>
                  </View>
                  <View style={styles.emptyAvatar}>
                    <Text style={styles.emptyAvatarText}>?</Text>
                  </View>
                  <View style={styles.playerDetails}>
                    <Text style={styles.emptySlotTitle}>Slot Kosong #{slotNum}</Text>
                    <Text style={styles.emptySlotSubtitle}>Menunggu pemain bergabung...</Text>
                  </View>
                  <View style={styles.readyBadge}>
                    <Text style={styles.readyBadgeText}>Siap Diisi ⚡</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* AI Team Balancer Button (Trigger Bagi Tim) */}
        <TouchableOpacity
          style={[styles.balancerBtn, isSplitting && styles.btnDisabled]}
          activeOpacity={0.8}
          onPress={handleRunBalancer}
          disabled={isSplitting}
        >
          {isSplitting ? (
            <ActivityIndicator size="small" color={THEME.colors.primary} />
          ) : (
            <Text style={styles.balancerBtnText}>
              ⚖️ Jalankan Balanced Team Splitter (Biru vs Merah)
            </Text>
          )}
        </TouchableOpacity>

        {/* Share Invite Button */}
        <TouchableOpacity
          style={styles.shareBtn}
          activeOpacity={0.8}
          onPress={handleShareInvite}
        >
          <Text style={styles.shareBtnText}>
            🔗 Bagikan Tautan Undangan Match
          </Text>
        </TouchableOpacity>

        {/* Sticky Join Action Footer */}
        <View style={styles.footerActionBox}>
          {hasJoined ? (
            <View style={styles.joinedBanner}>
              <Text style={styles.joinedBannerText}>
                ✓ Anda Terdaftar di Sesi Ini
              </Text>
              <Text style={styles.joinedSubtext}>
                Tiba di lapangan 15 menit sebelum kickoff untuk persiapan mabar.
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.btnJoinPrimary, isJoining && styles.btnDisabled]}
              activeOpacity={0.8}
              onPress={handleJoinSlot}
              disabled={isJoining}
            >
              {isJoining ? (
                <ActivityIndicator size="small" color={THEME.colors.textOnPrimary} />
              ) : (
                <Text style={styles.btnJoinPrimaryText}>
                  ⚡ KUNCI 1 SLOT SEKARANG (Rp {fullTargetCostPerPlayer.toLocaleString('id-ID')})
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Custom Alert Modal */}
      <CustomAlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        primaryButtonText={alertConfig.primaryButtonText}
        onPrimaryPress={closeAlert}
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

  // Top Bar (Figma SCR-11)
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center'
  },
  backBtnIcon: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 16,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  topBarCenter: {
    flex: 1,
    marginHorizontal: 10
  },
  topBarTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 15,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  topBarSubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    includeFontPadding: false
  },
  statusPill: {
    backgroundColor: 'rgba(0, 245, 155, 0.12)',
    borderWidth: 1,
    borderColor: THEME.colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.radius.full
  },
  statusPillLocked: {
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
    borderColor: THEME.colors.warning
  },
  statusPillText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.success,
    letterSpacing: 0.5,
    includeFontPadding: false
  },
  statusPillLockedText: {
    color: THEME.colors.warning
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

  // Kickoff & Venue Card (Figma 127:96)
  kickoffVenueCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10
  },
  kickoffHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  kickoffTimeText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  timeRemainingPill: {
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.radius.full
  },
  timeRemainingText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.warning,
    includeFontPadding: false
  },
  venueLocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  venueLocationText: {
    flex: 1,
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    includeFontPadding: false,
    marginRight: 8
  },
  openMapsText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 11,
    color: THEME.colors.primary,
    includeFontPadding: false
  },

  // Dynamic Split-Bill Box (Figma 127:104)
  splitBillCard: {
    backgroundColor: THEME.colors.cardElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(213, 255, 64, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16
  },
  splitBillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  splitBillInfoBox: {
    flex: 1,
    marginRight: 8
  },
  splitBillLabel: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    letterSpacing: 0.6,
    includeFontPadding: false
  },
  splitBillCondition: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.text,
    marginTop: 2,
    includeFontPadding: false
  },
  splitBillAmountBox: {
    alignItems: 'flex-end',
    flexShrink: 0
  },
  splitBillAmount: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 16,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  splitBillConditionBadge: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 9,
    color: THEME.colors.success,
    includeFontPadding: false
  },

  // Roster Header
  rosterHeader: {
    marginBottom: 12
  },
  rosterTitleBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  rosterTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8,
    includeFontPadding: false
  },
  atomicLockBadge: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 10,
    color: THEME.colors.accent,
    includeFontPadding: false
  },
  teamTabRow: {
    flexDirection: 'row',
    gap: 8
  },
  teamTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder
  },
  teamTabBlue: {
    borderColor: 'rgba(56, 189, 248, 0.3)'
  },
  teamTabRed: {
    borderColor: 'rgba(244, 63, 94, 0.3)'
  },
  teamTabActive: {
    backgroundColor: THEME.colors.primaryMuted,
    borderColor: THEME.colors.primary
  },
  teamTabActiveBlue: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderColor: '#38BDF8'
  },
  teamTabActiveRed: {
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    borderColor: '#F43F5E'
  },
  teamTabText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  teamTabTextActive: {
    fontFamily: THEME.typography.fonts.bold,
    color: THEME.colors.text,
    includeFontPadding: false
  },

  // Loading
  loadingContainer: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 10
  },
  loadingText: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 12,
    color: THEME.colors.textSecondary
  },

  // Roster List
  rosterList: {
    gap: 8,
    marginBottom: 16
  },
  playerCardFilled: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    padding: 10
  },
  borderTeamA: {
    borderLeftWidth: 3,
    borderLeftColor: '#38BDF8'
  },
  borderTeamB: {
    borderLeftWidth: 3,
    borderLeftColor: '#F43F5E'
  },
  playerSlotBadge: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center'
  },
  playerSlotText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  playerAvatar: {
    width: 32,
    height: 32,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  avatarTeamA: {
    borderColor: '#38BDF8'
  },
  avatarTeamB: {
    borderColor: '#F43F5E'
  },
  playerAvatarText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 11,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  avatarTextTeamA: {
    color: '#38BDF8'
  },
  avatarTextTeamB: {
    color: '#F43F5E'
  },
  playerDetails: {
    flex: 1
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  playerName: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  hostBadge: {
    backgroundColor: 'rgba(213, 255, 64, 0.15)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3
  },
  hostBadgeText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 8,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  teamTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3
  },
  teamTagA: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)'
  },
  teamTagB: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)'
  },
  teamTagText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 8,
    includeFontPadding: false
  },
  teamTagTextA: {
    color: '#38BDF8'
  },
  teamTagTextB: {
    color: '#F43F5E'
  },
  playerRole: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    includeFontPadding: false
  },
  playerStats: {
    alignItems: 'flex-end',
    gap: 2
  },
  ovrBadge: {
    backgroundColor: THEME.colors.cardElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  ovrText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  karmaText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 10,
    color: THEME.colors.success,
    includeFontPadding: false
  },

  // Empty Slot Card
  playerCardEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 20, 26, 0.4)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(192, 194, 184, 0.12)',
    borderStyle: 'dashed',
    padding: 10
  },
  emptySlotBadge: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptySlotText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  emptyAvatar: {
    width: 32,
    height: 32,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  emptyAvatarText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  emptySlotTitle: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 12,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  emptySlotSubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 2,
    includeFontPadding: false
  },
  readyBadge: {
    backgroundColor: 'rgba(0, 245, 155, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  readyBadgeText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.success,
    includeFontPadding: false
  },

  // Action Buttons
  balancerBtn: {
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.primary,
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  balancerBtnText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  shareBtn: {
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  shareBtnText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  btnDisabled: {
    opacity: 0.6
  },

  // Footer Action Box
  footerActionBox: {
    marginTop: 8
  },
  joinedBanner: {
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.success,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center'
  },
  joinedBannerText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13,
    color: THEME.colors.success,
    includeFontPadding: false
  },
  joinedSubtext: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    includeFontPadding: false
  },
  btnJoinPrimary: {
    backgroundColor: THEME.colors.primary,
    height: THEME.components.buttonPrimary.height,
    borderRadius: THEME.components.buttonPrimary.borderRadius,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnJoinPrimaryText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13,
    color: THEME.colors.textOnPrimary,
    letterSpacing: 0.5,
    includeFontPadding: false
  }
});
