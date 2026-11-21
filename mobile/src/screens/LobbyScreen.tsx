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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../theme';
import { RootStackScreenProps } from '../navigation/types';
import CustomAlertModal, { AlertType } from '../components/CustomAlertModal';
import RatingModal from '../components/RatingModal';
import PlayerCard from '../components/PlayerCard';
import { api, ApiSession } from '../services/api';
import type { ApiReviewTarget, SubmitReviewItem } from '../services/api';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';

type Props = RootStackScreenProps<'Lobby'>;

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

// Fallback default host jika sesi belum ada peserta
const DEFAULT_HOST_PLAYERS: Player[] = [];

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
  const insets = useSafeAreaInsets();
  const bottomPadding = 24;
  const routeSessionId = route?.params?.sessionId;
  const routeSessionTitle = route?.params?.sessionTitle;

  // Session state from database
  const [currentSession, setCurrentSession] = useState<ApiSession | null>(null);
  const [participants, setParticipants] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSplitting, setIsSplitting] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [isLeaving, setIsLeaving] = useState<boolean>(false);
  const [isCancellingSession, setIsCancellingSession] = useState<boolean>(false);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);

  // Wave 4: Rating & Sportivitas pasca-sesi
  const [isRatingVisible, setIsRatingVisible] = useState<boolean>(false);
  const [reviewTargets, setReviewTargets] = useState<ApiReviewTarget[]>([]);
  const [isLoadingTargets, setIsLoadingTargets] = useState<boolean>(false);
  const [isSubmittingReviews, setIsSubmittingReviews] = useState<boolean>(false);

  const [activeTeamTab, setActiveTeamTab] = useState<'all' | 'A' | 'B'>('all');

  // Custom Bento Alert & Action Sheet State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
    contextBadge?: string;
    primaryButtonText?: string;
    secondaryButtonText?: string;
    onPrimaryPress?: () => void;
    onSecondaryPress?: () => void;
    isLoading?: boolean;
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
    primaryButtonText = 'Mengerti',
    contextBadge?: string
  ) => {
    setAlertConfig({
      visible: true,
      type,
      title,
      message,
      contextBadge,
      primaryButtonText,
      onPrimaryPress: closeAlert
    });
  };

  const showConfirm = (params: {
    type?: AlertType;
    title: string;
    message: string;
    contextBadge?: string;
    primaryButtonText: string;
    secondaryButtonText?: string;
    onConfirm: () => void | Promise<void>;
  }) => {
    setAlertConfig({
      visible: true,
      type: params.type || 'warning',
      title: params.title,
      message: params.message,
      contextBadge: params.contextBadge,
      primaryButtonText: params.primaryButtonText,
      secondaryButtonText: params.secondaryButtonText || 'Batal',
      onPrimaryPress: params.onConfirm,
      onSecondaryPress: closeAlert
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

        // Jika tidak ada sesi sama sekali di DB
        if (!targetId) {
          setIsLiveConnected(false);
          setParticipants([]);
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
          setParticipants([]);
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
            'id, session_id, user_id, slot_number, assigned_team, attendance_status, profiles:user_id(id, full_name, credit_score)'
          )
          .eq('session_id', targetId)
          .neq('attendance_status', 'CANCELLED')
          .order('slot_number', { ascending: true });

        if (!partErr && partData && partData.length > 0) {
          const mappedPlayers: Player[] = partData.map((p: any) => {
            const resolvedName = p.profiles?.full_name || `Pemain #${p.slot_number}`;
            const isHost = p.user_id === sessionData.host_id;
            const karma = p.profiles?.credit_score ?? 100;
            const points = 1200;
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
              isGuest: false
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

  const isHostUser = useMemo(() => {
    if (!user || !currentSession) return false;
    return currentSession.host_id === user.id;
  }, [currentSession, user]);

  const isSessionCancelled = currentSession?.status === 'CANCELLED';

  const myParticipant = useMemo(() => {
    if (!user) return undefined;
    return participants.find((p) => p.userId === user.id);
  }, [participants, user]);

  // Dynamic values
  const totalSlots = currentSession?.max_slots || 10;
  const venueTotalCost = currentSession?.estimated_cost_total || 300000;
  const currentCostPerPlayer = Math.round(venueTotalCost / Math.max(participants.length, 1));
  const fullTargetCostPerPlayer = Math.round(venueTotalCost / totalSlots);

  const filteredParticipants = useMemo(() => {
    if (activeTeamTab === 'all') return participants;
    return participants.filter((p) => p.team === activeTeamTab);
  }, [participants, activeTeamTab]);

  const emptySlotNumbers = useMemo(() => {
    const filled = new Set(participants.map((p) => p.slot));
    return Array.from({ length: totalSlots }, (_, i) => i + 1).filter(
      (s) => !filled.has(s)
    );
  }, [participants, totalSlots]);

  const nextAvailableSlot = emptySlotNumbers.length > 0 ? emptySlotNumbers[0] : null;

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
          `Selisih skill seimbang: ${diff}%. Pembagian tim telah diperbarui.`
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

  // 3b. Action: Leave / Cancel Slot (Atomic Supabase Leave API)
  const handleLeaveSlot = () => {
    if (!hasJoined) return;

    if (isHostUser) {
      showAlert(
        'warning',
        'Host Tidak Dapat Keluar',
        'Sebagai Host, Anda tidak dapat membatalkan slot begitu saja. Anda dapat Membatalkan Sesi jika berhalangan hadir.'
      );
      return;
    }

    const slotLabel = myParticipant?.slot ? `Slot #${myParticipant.slot}` : 'Slot Anda';

    showConfirm({
      type: 'warning',
      title: 'Batalkan Keikutsertaan?',
      message: `${slotLabel} akan dilepas kembali ke publik. Susunan tim dan alokasi slot akan di-reset.`,
      contextBadge: `⚠️ ${slotLabel} Akan Dikosongkan`,
      primaryButtonText: 'Ya, Batalkan Slot',
      secondaryButtonText: 'Tetap Ikut di Sesi Ini',
      onConfirm: async () => {
        closeAlert();
        if (!user) return;

        if (!currentSession?.id) {
          // Local fallback
          setParticipants(participants.filter((p) => p.userId !== user.id));
          showAlert('success', 'Slot Dibatalkan', 'Anda telah keluar dari sesi mabar ini.');
          return;
        }

        setIsLeaving(true);
        try {
          const res = await api.leaveSession(currentSession.id, user.id);
          showAlert(
            'success',
            'Slot Berhasil Dibatalkan',
            `Slot #${res.released_slot} telah dilepas kembali.`
          );
          await loadSessionAndRoster(false);
        } catch (err: any) {
          showAlert('error', 'Gagal Membatalkan Slot', err.message || 'Tidak dapat membatalkan slot.');
        } finally {
          setIsLeaving(false);
        }
      }
    });
  };

  // 3c. Action: Cancel Session (Host Only)
  const handleCancelSession = () => {
    if (!isHostUser) {
      showAlert('warning', 'Akses Ditolak', 'Hanya Host yang berhak membatalkan sesi mabar.');
      return;
    }

    showConfirm({
      type: 'error',
      title: 'Batalkan Seluruh Sesi Match?',
      message: 'Sesi mabar ini akan dibatalkan untuk semua peserta terdaftar. Match akan dinonaktifkan secara permanen.',
      contextBadge: '🚨 Perhatian: Pembatalan Permanen',
      primaryButtonText: 'Ya, Batalkan Sesi',
      secondaryButtonText: 'Kembali, Jangan Batalkan',
      onConfirm: async () => {
        closeAlert();
        if (!user || !currentSession?.id) return;

        setIsCancellingSession(true);
        try {
          await api.updateSessionStatus(currentSession.id, user.id, 'CANCELLED');
          showAlert(
            'success',
            'Sesi Berhasil Dibatalkan',
            'Sesi mabar telah dibatalkan dan jadwal dinonaktifkan.'
          );
          await loadSessionAndRoster(false);
        } catch (err: any) {
          showAlert('error', 'Gagal Membatalkan Sesi', err.message || 'Terjadi kesalahan server.');
        } finally {
          setIsCancellingSession(false);
        }
      }
    });
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

  // 5. Wave 4: Rating & Sportivitas pasca-sesi
  const canReview = useMemo(() => {
    return currentSession?.status === 'COMPLETED' && !!user?.id && hasJoined;
  }, [currentSession?.status, user?.id, hasJoined]);

  const handleOpenRating = async () => {
    if (!currentSession?.id || !user?.id) return;
    setIsRatingVisible(true);
    setIsLoadingTargets(true);
    try {
      const targets = await api.getReviewTargets(currentSession.id, user.id);
      setReviewTargets(targets);
    } catch (err: any) {
      setReviewTargets([]);
      showAlert(
        'error',
        'Gagal Memuat Peserta',
        err.message || 'Daftar peserta yang bisa dinilai belum tersedia.'
      );
    } finally {
      setIsLoadingTargets(false);
    }
  };

  const handleSubmitReviews = async (reviews: SubmitReviewItem[]) => {
    if (!currentSession?.id || !user?.id) return;
    setIsSubmittingReviews(true);
    try {
      const result = await api.submitReviews(currentSession.id, user.id, reviews);
      setIsRatingVisible(false);
      setReviewTargets([]);
      const rated = result?.submitted_count ?? reviews.length;
      showAlert(
        'success',
        'Penilaian Terkirim 🛡️',
        `${rated} teman berhasil dinilai. Credit Score mereka sudah diperbarui otomatis.`
      );
    } catch (err: any) {
      showAlert('error', 'Gagal Mengirim Penilaian', err.message || 'Coba lagi sebentar lagi.');
    } finally {
      setIsSubmittingReviews(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: bottomPadding }]}
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
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('MainTabs', { screen: 'Explore' });
              }
            }}
          >
            <Text style={styles.backBtnIcon}>‹</Text>
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
              <Text style={styles.openMapsText}>📍 Cari Lokasi</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dynamic Split-Bill Box (Figma 127:104) */}
        <View style={styles.splitBillCard}>
          <View style={styles.splitBillHeader}>
            <View style={styles.splitBillInfoBox}>
              <Text style={styles.splitBillLabel}>Estimasi Patungan / orang </Text>
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
            <Text style={styles.atomicLockBadge}>🔒 Anti-Overbooking</Text>
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
            <Text style={styles.loadingText}>Load data, please wait...</Text>
          </View>
        )}

        {/* Player Roster Grid & Slots */}
        {!isLoading && (
          <View style={styles.rosterSection}>
            {/* 1. Grid Player Cards (2 Kolom) */}
            {filteredParticipants.length > 0 ? (
              <View style={styles.playerCardGrid}>
                {filteredParticipants.map((player) => (
                  <View key={player.slot} style={styles.playerCardGridItem}>
                    <PlayerCard
                      slot={player.slot}
                      name={player.name}
                      role={player.role}
                      ovr={player.ovr}
                      creditScore={player.karma}
                      team={player.team}
                      isHost={player.isHost}
                      isCurrentUser={player.userId === user?.id}
                      onPress={() =>
                        showAlert(
                          'info',
                          `${player.name} (${player.team === 'A' ? 'Tim A' : 'Tim B'})`,
                          `Role: ${player.role}\nOVR: ${player.ovr} · Credit Score: ${player.karma}/100\nStatus: ${
                            player.isHost ? 'Host / Penyelenggara Match' : 'Pemain Terverifikasi'
                          }`
                        )
                      }
                    />
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyTeamStateCard}>
                <Text style={styles.emptyTeamStateIcon}>
                  {activeTeamTab === 'A' ? '🔵' : '🔴'}
                </Text>
                <Text style={styles.emptyTeamStateTitle}>
                  Belum Ada Pemain di {activeTeamTab === 'A' ? 'Tim A' : 'Tim B'}
                </Text>
                <Text style={styles.emptyTeamStateSubtitle}>
                  Jalankan Balanced Team Splitter untuk membagi tim secara seimbang atau undang teman.
                </Text>
              </View>
            )}

            {/* 2. Slot Kosong & Action Area */}
            {activeTeamTab === 'all' && emptySlotNumbers.length > 0 && (
              <View style={styles.emptySlotSection}>
                {!hasJoined ? (
                  <TouchableOpacity
                    style={styles.nextSlotActionCard}
                    activeOpacity={0.8}
                    onPress={handleJoinSlot}
                    disabled={isJoining}
                  >
                    <View style={styles.nextSlotIconCircle}>
                      <Text style={styles.nextSlotIconText}>➕</Text>
                    </View>
                    <View style={styles.nextSlotTextCol}>
                      <Text style={styles.nextSlotTitle}>
                        Kunci Slot #{nextAvailableSlot} Sekarang
                      </Text>
                      <Text style={styles.nextSlotSubtitle}>
                        Tersisa {emptySlotNumbers.length} slot kosong dari total {totalSlots} pemain
                      </Text>
                    </View>
                    <View style={styles.nextSlotBtnPill}>
                      {isJoining ? (
                        <ActivityIndicator size="small" color={THEME.colors.textOnPrimary} />
                      ) : (
                        <Text style={styles.nextSlotBtnText}>Gabung</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.inviteSlotActionCard}
                    activeOpacity={0.8}
                    onPress={handleShareInvite}
                  >
                    <View style={styles.inviteSlotIconCircle}>
                      <Text style={styles.inviteSlotIconText}>🔗</Text>
                    </View>
                    <View style={styles.nextSlotTextCol}>
                      <Text style={styles.inviteSlotTitle}>
                        Ajak Rekan untuk Slot #{nextAvailableSlot}
                      </Text>
                      <Text style={styles.nextSlotSubtitle}>
                        Tersisa {emptySlotNumbers.length} slot lagi sebelum match penuh
                      </Text>
                    </View>
                    <View style={styles.inviteSlotBtnPill}>
                      <Text style={styles.inviteSlotBtnText}>Undang</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            )}
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
               Jalankan Balanced Team Splitter (Biru vs Merah)
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
          {isSessionCancelled ? (
            <View style={styles.cancelledMatchBanner}>
              <Text style={styles.cancelledMatchTitle}>⚠️ Sesi Mabar Ini Telah Dibatalkan</Text>
              <Text style={styles.cancelledMatchSubtext}>
                Host telah membatalkan kegiatan match ini. Seluruh slot dan jadwal dinonaktifkan.
              </Text>
            </View>
          ) : canReview ? (
            <TouchableOpacity
              style={styles.ratingCtaBtn}
              activeOpacity={0.8}
              onPress={handleOpenRating}
            >
              <Text style={styles.ratingCtaText}>Beri Rating &amp; Sportivitas ⭐</Text>
            </TouchableOpacity>
          ) : hasJoined ? (
            <View style={styles.joinedBanner}>
              <View style={styles.joinedBannerHeader}>
                <View style={styles.joinedStatusBadge}>
                  <Text style={styles.joinedBannerText}>
                    ✓ Terdaftar di Slot #{myParticipant?.slot || '1'} {isHostUser ? '(Host)' : ''}
                  </Text>
                </View>
                {!isHostUser ? (
                  <TouchableOpacity
                    style={[styles.leaveSlotBtn, isLeaving && styles.btnDisabled]}
                    activeOpacity={0.7}
                    onPress={handleLeaveSlot}
                    disabled={isLeaving}
                  >
                    {isLeaving ? (
                      <ActivityIndicator size="small" color="#FF6B6B" />
                    ) : (
                      <Text style={styles.leaveSlotBtnText}>✕ Batalkan Slot</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.cancelSessionBtn, isCancellingSession && styles.btnDisabled]}
                    activeOpacity={0.7}
                    onPress={handleCancelSession}
                    disabled={isCancellingSession}
                  >
                    {isCancellingSession ? (
                      <ActivityIndicator size="small" color="#FF6B6B" />
                    ) : (
                      <Text style={styles.cancelSessionBtnText}>✕ Batalkan Sesi</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.joinedSubtext}>
                {isHostUser
                  ? 'Anda adalah Host sesi ini. Kelola kesiapan pemain dan pembagian tim.'
                  : 'Tiba di lapangan 15 menit sebelum kickoff. Jika berhalangan, batalkan slot agar pemain lain bisa masuk.'}
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
                   Kunci 1 Slot Sekarang! (Rp {fullTargetCostPerPlayer.toLocaleString('id-ID')})
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Wave 4: Rating & Sportivitas Modal */}
      <RatingModal
        visible={isRatingVisible}
        sessionTitle={currentSession?.title}
        targets={reviewTargets}
        loading={isLoadingTargets}
        submitting={isSubmittingReviews}
        onClose={() => setIsRatingVisible(false)}
        onSubmit={handleSubmitReviews}
      />

      {/* Modern Bento Action Sheet & Confirmation Modal */}
      <CustomAlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        contextBadge={alertConfig.contextBadge}
        primaryButtonText={alertConfig.primaryButtonText}
        secondaryButtonText={alertConfig.secondaryButtonText}
        onPrimaryPress={alertConfig.onPrimaryPress || closeAlert}
        onSecondaryPress={alertConfig.onSecondaryPress || closeAlert}
        onClose={closeAlert}
        isLoading={isLeaving || isCancellingSession}
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
    fontSize: 30,
    marginBottom: 2,
    flex: 1,
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

  // Roster Grid Section (Bento Player Cards)
  rosterSection: {
    marginBottom: 16
  },
  playerCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4
  },
  playerCardGridItem: {
    width: '50%',
    padding: 4
  },

  // Empty State untuk filter Tim yang belum ada pemain
  emptyTeamStateCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderStyle: 'dashed',
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  emptyTeamStateIcon: {
    fontSize: 24,
    marginBottom: 8
  },
  emptyTeamStateTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13,
    color: THEME.colors.text,
    textAlign: 'center',
    includeFontPadding: false
  },
  emptyTeamStateSubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 12,
    lineHeight: 16,
    includeFontPadding: false
  },

  // Slot Kosong & Action Section
  emptySlotSection: {
    marginTop: 6,
    gap: 8
  },
  nextSlotActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(213, 255, 64, 0.04)',
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: THEME.colors.primary,
    borderStyle: 'dashed',
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  nextSlotIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(213, 255, 64, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  nextSlotIconText: {
    fontSize: 14
  },
  nextSlotTextCol: {
    flex: 1
  },
  nextSlotTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  nextSlotSubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 2,
    includeFontPadding: false
  },
  nextSlotBtnPill: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  nextSlotBtnText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 11,
    color: THEME.colors.textOnPrimary,
    includeFontPadding: false
  },

  inviteSlotActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(94, 92, 230, 0.06)',
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: THEME.colors.accent,
    borderStyle: 'dashed',
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  inviteSlotIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(94, 92, 230, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  inviteSlotIconText: {
    fontSize: 14
  },
  inviteSlotTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  inviteSlotBtnPill: {
    backgroundColor: THEME.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  inviteSlotBtnText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
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
    borderColor: 'rgba(34, 197, 94, 0.35)',
    borderRadius: 12,
    padding: 12
  },
  joinedBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  joinedStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  joinedBannerText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13,
    color: THEME.colors.success,
    includeFontPadding: false
  },
  leaveSlotBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8
  },
  leaveSlotBtnText: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 11,
    color: '#FF6B6B',
    includeFontPadding: false
  },
  cancelSessionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.6)',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8
  },
  cancelSessionBtnText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 11,
    color: '#FF6B6B',
    includeFontPadding: false
  },
  cancelledMatchBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center'
  },
  cancelledMatchTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13,
    color: '#FF6B6B',
    includeFontPadding: false
  },
  cancelledMatchSubtext: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
    includeFontPadding: false
  },
  joinedSubtext: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
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
    fontSize: 14,
    fontWeight: '900',
    color: THEME.colors.textOnPrimary,
    letterSpacing: 0.5,
    includeFontPadding: false
  },
  ratingCtaBtn: {
    backgroundColor: THEME.colors.accent,
    height: THEME.components.buttonPrimary.height,
    borderRadius: THEME.components.buttonPrimary.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.accentBorder
  },
  ratingCtaText: {
    ...THEME.typography.button,
    color: THEME.colors.text
  }
});
