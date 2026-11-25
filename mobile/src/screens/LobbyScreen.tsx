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
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { THEME } from '../theme';
import { RootStackScreenProps } from '../navigation/types';
import CustomAlertModal, { AlertType } from '../components/CustomAlertModal';
import RatingModal from '../components/RatingModal';
import PlayerCard from '../components/PlayerCard';
import LobbyHeroHeader from '../components/LobbyHeroHeader';
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

  // 2. Action: Trigger Balanced Team Splitter (Host-Only API Hit)
  const handleRunBalancer = async () => {
    if (!isHostUser) {
      showAlert(
        'warning',
        'Khusus Host',
        'Hanya Host penyelenggara sesi yang berhak menjalankan pembagian tim.'
      );
      return;
    }

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

  // 3a. Action: Prompt Confirmation Modal saat tap card slot kosong
  const handlePromptJoinSlot = () => {
    if (isSessionCancelled) {
      showAlert('warning', 'Sesi Dibatalkan', 'Sesi mabar ini sudah dibatalkan oleh Host.');
      return;
    }

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

    const slotLabel = nextAvailableSlot ? `Slot #${nextAvailableSlot}` : '1 Slot';
    const matchTitle = currentSession?.title || routeSessionTitle || 'Sesi Mabar';
    const costLabel =
      venueTotalCost > 0
        ? `⚡ Est. Patungan Rp ${fullTargetCostPerPlayer.toLocaleString('id-ID')} / org`
        : '⚡ Sesi Bebas Biaya (Gratis)';

    showConfirm({
      type: 'info',
      title: 'Gabung ke Sesi Ini?',
      message: `Anda akan mengunci ${slotLabel} pada match "${matchTitle}".`,
      contextBadge: costLabel,
      primaryButtonText: `Ya, Gabung (${slotLabel})`,
      secondaryButtonText: 'Nanti Dulu',
      onConfirm: async () => {
        closeAlert();
        await handleJoinSlot();
      }
    });
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
        {/* Editorial Match Hero Header (Top Bar + Unified Match Card) */}
        <LobbyHeroHeader
          title={currentSession?.title || routeSessionTitle || 'Match Lobby Sesi Mabar'}
          roomCode={currentSession?.id ? currentSession.id.slice(0, 8).toUpperCase() : 'FTS-089'}
          status={currentSession?.status || 'OPEN'}
          activityType={currentSession?.activity_type}
          kickoffStr={kickoffInfo.kickoffStr}
          remainingStr={kickoffInfo.remainingStr}
          venueTitle={venueTitle}
          minCreditScore={currentSession?.min_credit_score ?? 70}
          fullTargetCostPerPlayer={fullTargetCostPerPlayer}
          venueTotalCost={venueTotalCost}
          filledSlots={participants.length}
          totalSlots={totalSlots}
          onBack={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('MainTabs', { screen: 'Explore' });
            }
          }}
          onShare={handleShareInvite}
          onOpenMaps={handleOpenMaps}
        />

        {/* Editorial Roster Header & Underline Filter Tabs */}
        <View style={styles.rosterHeader}>
          <View style={styles.rosterTitleBox}>
            <Text style={styles.rosterTitle}>Daftar Pemain</Text>
            <Text style={styles.rosterCountMeta}>
              {participants.length}/{totalSlots} terisi
            </Text>
          </View>

          {/* Underline Filter Tabs */}
          <View style={styles.teamTabRow}>
            <TouchableOpacity
              style={styles.teamTab}
              activeOpacity={0.75}
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
              {activeTeamTab === 'all' && (
                <View style={[styles.teamTabIndicator, { backgroundColor: THEME.colors.primary }]} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.teamTab}
              activeOpacity={0.75}
              onPress={() => setActiveTeamTab('A')}
            >
              <Text
                style={[
                  styles.teamTabText,
                  activeTeamTab === 'A' && { ...styles.teamTabTextActive, color: '#38BDF8' }
                ]}
              >
                Tim A ({participants.filter((p) => p.team === 'A').length})
              </Text>
              {activeTeamTab === 'A' && (
                <View style={[styles.teamTabIndicator, { backgroundColor: '#38BDF8' }]} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.teamTab}
              activeOpacity={0.75}
              onPress={() => setActiveTeamTab('B')}
            >
              <Text
                style={[
                  styles.teamTabText,
                  activeTeamTab === 'B' && { ...styles.teamTabTextActive, color: '#F43F5E' }
                ]}
              >
                Tim B ({participants.filter((p) => p.team === 'B').length})
              </Text>
              {activeTeamTab === 'B' && (
                <View style={[styles.teamTabIndicator, { backgroundColor: '#F43F5E' }]} />
              )}
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
            {/* 1. Grid Player Cards + Card Slot Kosong (2 Kolom Simetris) */}
            {filteredParticipants.length > 0 || (activeTeamTab === 'all' && emptySlotNumbers.length > 0 && !isSessionCancelled) ? (
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

                {/* Card Slot Kosong Interaktif di dalam Grid 2-Kolom */}
                {activeTeamTab === 'all' && emptySlotNumbers.length > 0 && !isSessionCancelled && (
                  <>
                    <View style={styles.playerCardGridItem}>
                      <TouchableOpacity
                        style={[
                          styles.emptySlotCard,
                          !hasJoined ? styles.emptySlotCardJoin : styles.emptySlotCardInvite
                        ]}
                        activeOpacity={0.75}
                        onPress={!hasJoined ? handlePromptJoinSlot : handleShareInvite}
                        disabled={isJoining}
                      >
                        <View
                          style={[
                            styles.emptySlotPlusCircle,
                            !hasJoined ? styles.emptySlotPlusCircleJoin : styles.emptySlotPlusCircleInvite
                          ]}
                        >
                          {isJoining ? (
                            <ActivityIndicator size="small" color={THEME.colors.primary} />
                          ) : (
                            <Text
                              style={[
                                styles.emptySlotPlusText,
                                !hasJoined ? styles.emptySlotPlusTextJoin : styles.emptySlotPlusTextInvite
                              ]}
                            >
                              {!hasJoined ? '+' : '🔗'}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.emptySlotCardTitle}>Kosong</Text>
                        <Text style={styles.emptySlotCardSubtitle}>
                          {!hasJoined ? `Gabung Slot #${nextAvailableSlot}` : `Undang ke Slot #${nextAvailableSlot}`}
                        </Text>
                        {emptySlotNumbers.length > 1 && (
                          <Text
                            style={[
                              styles.emptySlotCardHint,
                              !hasJoined ? styles.emptySlotCardHintJoin : styles.emptySlotCardHintInvite
                            ]}
                          >
                            Sisa {emptySlotNumbers.length} slot
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Penyeimbang baris ke-2 bila jumlah pemain genap & sisa >= 2 */}
                    {filteredParticipants.length % 2 === 0 && emptySlotNumbers.length >= 2 && (
                      <View style={styles.playerCardGridItem}>
                        <TouchableOpacity
                          style={[styles.emptySlotCard, styles.emptySlotCardInvite]}
                          activeOpacity={0.75}
                          onPress={handleShareInvite}
                        >
                          <View style={[styles.emptySlotPlusCircle, styles.emptySlotPlusCircleInvite]}>
                            <Text style={[styles.emptySlotPlusText, styles.emptySlotPlusTextInvite]}>
                              🔗
                            </Text>
                          </View>
                          <Text style={styles.emptySlotCardTitle}>
                            +{emptySlotNumbers.length - 1} Slot Lagi
                          </Text>
                          <Text style={styles.emptySlotCardSubtitle}>Ajak rekan mabar</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}
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
          </View>
        )}

        {/* AI Team Balancer Button (Khusus Host & Sesi Aktif) */}
        {isHostUser && !isSessionCancelled && currentSession?.status !== 'COMPLETED' && (
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
                ⚖️ Jalankan Balanced Team Splitter
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Share Invite Button */}
        <TouchableOpacity
          style={styles.shareBtn}
          activeOpacity={0.8}
          onPress={handleShareInvite}
        >
          <Text style={styles.shareBtnText}>Bagikan Undangan Match</Text>
        </TouchableOpacity>

        {/* Action Footer (Tampil saat Sesi Batal / Siap Review / Sudah Bergabung) */}
        {(isSessionCancelled || canReview || hasJoined) && (
          <View style={styles.footerActionBox}>
            {isSessionCancelled ? (
              <View style={styles.cancelledMatchBanner}>
                <View style={styles.cancelledIconBox}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Circle cx="12" cy="12" r="10" stroke="#FF6B6B" strokeWidth={1.9} />
                    <Line x1="15" y1="9" x2="9" y2="15" stroke="#FF6B6B" strokeWidth={1.9} strokeLinecap="round" />
                    <Line x1="9" y1="9" x2="15" y2="15" stroke="#FF6B6B" strokeWidth={1.9} strokeLinecap="round" />
                  </Svg>
                </View>
                <View style={styles.cancelledTextCol}>
                  <Text style={styles.cancelledMatchTitle}>Sesi Mabar Dibatalkan</Text>
                  <Text style={styles.cancelledMatchSubtext}>
                    Host telah membatalkan match ini. Seluruh slot dinonaktifkan.
                  </Text>
                </View>
              </View>
            ) : canReview ? (
              <TouchableOpacity
                style={styles.ratingCtaBtn}
                activeOpacity={0.8}
                onPress={handleOpenRating}
              >
                <Text style={styles.ratingCtaText}>Beri Rating &amp; Sportivitas ⭐</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.joinedBanner}>
                {/* Top Row: Mint Check Badge + Slot Status + Team Tag */}
                <View style={styles.joinedBannerHeader}>
                  <View style={styles.joinedCheckBadge}>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M20 6L9 17l-5-5"
                        stroke={THEME.colors.success}
                        strokeWidth={2.4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  </View>

                  <View style={styles.joinedTextCol}>
                    <Text style={styles.joinedBannerText}>
                      Slot #{myParticipant?.slot || '1'} Terkonfirmasi
                      {isHostUser ? ' · Host' : ''}
                    </Text>
                    <Text style={styles.joinedSubtext}>
                      {isHostUser
                        ? 'Kelola kesiapan pemain & pembagian tim'
                        : 'Check-in 15 mnt sebelum kickoff'}
                    </Text>
                  </View>

                  {myParticipant?.team && (
                    <View
                      style={[
                        styles.joinedTeamTag,
                        {
                          borderColor:
                            myParticipant.team === 'A'
                              ? 'rgba(56, 189, 248, 0.35)'
                              : 'rgba(244, 63, 94, 0.35)',
                          backgroundColor:
                            myParticipant.team === 'A'
                              ? 'rgba(56, 189, 248, 0.10)'
                              : 'rgba(244, 63, 94, 0.10)'
                        }
                      ]}
                    >
                      <Text
                        style={[
                          styles.joinedTeamTagText,
                          { color: myParticipant.team === 'A' ? '#38BDF8' : '#F43F5E' }
                        ]}
                      >
                        Tim {myParticipant.team}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Bottom Action Strip (Clean Full-Width Destructive Button) */}
                <View style={styles.joinedDivider} />

                {!isHostUser ? (
                  <TouchableOpacity
                    style={[styles.leaveSlotBtn, isLeaving && styles.btnDisabled]}
                    activeOpacity={0.75}
                    onPress={handleLeaveSlot}
                    disabled={isLeaving}
                  >
                    {isLeaving ? (
                      <ActivityIndicator size="small" color="#FF6B6B" />
                    ) : (
                      <>
                        <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                          <Path
                            d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                            stroke="#FF6B6B"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <Path
                            d="M16 17l5-5-5-5"
                            stroke="#FF6B6B"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <Line
                            x1="21"
                            y1="12"
                            x2="9"
                            y2="12"
                            stroke="#FF6B6B"
                            strokeWidth={2}
                            strokeLinecap="round"
                          />
                        </Svg>
                        <Text style={styles.leaveSlotBtnText}>Batalkan Keikutsertaan</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.cancelSessionBtn, isCancellingSession && styles.btnDisabled]}
                    activeOpacity={0.75}
                    onPress={handleCancelSession}
                    disabled={isCancellingSession}
                  >
                    {isCancellingSession ? (
                      <ActivityIndicator size="small" color="#FF6B6B" />
                    ) : (
                      <>
                        <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                          <Circle cx="12" cy="12" r="10" stroke="#FF6B6B" strokeWidth={2} />
                          <Line x1="15" y1="9" x2="9" y2="15" stroke="#FF6B6B" strokeWidth={2} strokeLinecap="round" />
                          <Line x1="9" y1="9" x2="15" y2="15" stroke="#FF6B6B" strokeWidth={2} strokeLinecap="round" />
                        </Svg>
                        <Text style={styles.cancelSessionBtnText}>Batalkan Seluruh Sesi</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
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
  // Roster Header & Editorial Underline Tabs
  rosterHeader: {
    marginBottom: 12
  },
  rosterTitleBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10
  },
  rosterTitle: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 16,
    color: THEME.colors.text,
    letterSpacing: -0.2,
    includeFontPadding: false
  },
  rosterCountMeta: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false
  },
  teamTabRow: {
    flexDirection: 'row',
    gap: 22,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)'
  },
  teamTab: {
    paddingBottom: 9,
    position: 'relative'
  },
  teamTabText: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 13,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  teamTabTextActive: {
    fontFamily: THEME.typography.fonts.bold,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  teamTabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 2
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

  // Empty Slot Card (Grid 2-Kolom Simetris)
  emptySlotCard: {
    flex: 1,
    minHeight: 132,
    borderRadius: 16,
    borderWidth: 1.2,
    borderStyle: 'dashed',
    padding: 13,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptySlotCardJoin: {
    backgroundColor: 'rgba(213, 255, 64, 0.03)',
    borderColor: 'rgba(213, 255, 64, 0.35)'
  },
  emptySlotCardInvite: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.16)'
  },
  emptySlotPlusCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  emptySlotPlusCircleJoin: {
    backgroundColor: 'rgba(213, 255, 64, 0.10)',
    borderColor: 'rgba(213, 255, 64, 0.45)'
  },
  emptySlotPlusCircleInvite: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.25)'
  },
  emptySlotPlusText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 16,
    includeFontPadding: false
  },
  emptySlotPlusTextJoin: {
    color: THEME.colors.primary
  },
  emptySlotPlusTextInvite: {
    color: THEME.colors.textSecondary,
    fontSize: 13
  },
  emptySlotCardTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12.5,
    color: THEME.colors.text,
    textAlign: 'center',
    includeFontPadding: false
  },
  emptySlotCardSubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10.5,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
    includeFontPadding: false
  },
  emptySlotCardHint: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 9.5,
    marginTop: 5,
    includeFontPadding: false
  },
  emptySlotCardHintJoin: {
    color: THEME.colors.primary
  },
  emptySlotCardHintInvite: {
    color: THEME.colors.textSecondary
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

  // Footer Action Box (Editorial Participation Pass)
  footerActionBox: {
    marginTop: 4
  },
  joinedBanner: {
    backgroundColor: '#141720',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderTopColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 18,
    padding: 15
  },
  joinedBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  joinedCheckBadge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 245, 155, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 155, 0.30)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  joinedTextCol: {
    flex: 1
  },
  joinedBannerText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13.5,
    color: '#FFFFFF',
    includeFontPadding: false
  },
  joinedSubtext: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
    includeFontPadding: false
  },
  joinedTeamTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1
  },
  joinedTeamTagText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10.5,
    includeFontPadding: false
  },
  joinedDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    marginVertical: 12
  },
  leaveSlotBtn: {
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.25)',
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  leaveSlotBtnText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 12,
    color: '#FF6B6B',
    includeFontPadding: false
  },
  cancelSessionBtn: {
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.35)',
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  cancelSessionBtnText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: '#FF6B6B',
    includeFontPadding: false
  },
  cancelledMatchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#141720',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.30)',
    borderRadius: 18,
    padding: 15
  },
  cancelledIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.30)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelledTextCol: {
    flex: 1
  },
  cancelledMatchTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13.5,
    color: '#FF6B6B',
    includeFontPadding: false
  },
  cancelledMatchSubtext: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
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
