import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { THEME } from '../theme';
import { MainTabParamList } from '../navigation/types';
import CustomAlertModal, { AlertType } from '../components/CustomAlertModal';

type Props = BottomTabScreenProps<MainTabParamList, 'Lobby'>;

interface Player {
  slot: number;
  name: string;
  role: string;
  ovr: number;
  karma: number;
  team: 'A' | 'B';
  isHost?: boolean;
}

export default function LobbyScreen({ route, navigation }: Props) {
  const sessionTitle =
    route?.params?.sessionTitle || 'Futsal Malam Santai 5v5 Serpong';
  const totalSlots = 10;
  const venueTotalCost = 300000;

  // Mock initial roster (8 of 10 filled)
  const [participants, setParticipants] = useState<Player[]>([
    { slot: 1, name: 'Jeremy', role: 'Pivot / Striker', ovr: 88, karma: 98, team: 'A', isHost: true },
    { slot: 2, name: 'Ben_Mobile', role: 'Flank Kanan', ovr: 84, karma: 92, team: 'A' },
    { slot: 3, name: 'Hyun_Striker', role: 'Anchor', ovr: 86, karma: 88, team: 'B' },
    { slot: 4, name: 'Yua_Design', role: 'Flank Kiri', ovr: 82, karma: 95, team: 'B' },
    { slot: 5, name: 'Jerikho_Backend', role: 'Kiper Utama', ovr: 89, karma: 90, team: 'A' },
    { slot: 6, name: 'Budi_W', role: 'Anchor', ovr: 79, karma: 82, team: 'B' },
    { slot: 7, name: 'Andi_K', role: 'Pivot', ovr: 83, karma: 85, team: 'A' },
    { slot: 8, name: 'Rian_F', role: 'Kiper', ovr: 80, karma: 78, team: 'B' }
  ]);

  const [hasJoined, setHasJoined] = useState(false);
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

  // Dynamic cost calculation
  const currentCostPerPlayer = Math.round(venueTotalCost / Math.max(participants.length, 1));
  const fullTargetCostPerPlayer = Math.round(venueTotalCost / totalSlots);

  const handleJoinSlot = () => {
    if (hasJoined) {
      showAlert('info', 'Sudah Terdaftar', 'Anda sudah mengunci slot di sesi mabar ini.');
      return;
    }
    if (participants.length >= totalSlots) {
      showAlert('warning', 'Lobi Penuh', 'Kapasitas maksimal 10/10 telah terpenuhi.');
      return;
    }

    const nextSlot = participants.length + 1;
    const assignedTeam: 'A' | 'B' = nextSlot % 2 === 1 ? 'A' : 'B';

    const newPlayer: Player = {
      slot: nextSlot,
      name: 'Anda (Saya)',
      role: 'Flex Player',
      ovr: 85,
      karma: 100,
      team: assignedTeam
    };

    setParticipants([...participants, newPlayer]);
    setHasJoined(true);
    showAlert(
      'success',
      'Slot Berhasil Dikunci!',
      `Selamat! Slot #${nextSlot} (${assignedTeam === 'A' ? 'Tim A' : 'Tim B'}) terkunci secara atomik dengan deposit Rp ${fullTargetCostPerPlayer.toLocaleString('id-ID')}.`
    );
  };

  const handleRunBalancer = () => {
    showAlert(
      'info',
      'AI Team Balancer Aktif ⚖️',
      'Algoritma matchmaking telah membagi komposisi Tim A (Avg OVR 85.8) dan Tim B (Avg OVR 85.2) secara seimbang berdasarkan skill rating dan riwayat sportifitas.'
    );
  };

  const handleShareInvite = () => {
    showAlert(
      'info',
      'Tautan Disalin 🔗',
      'Link undangan lobi mabar telah disalin ke clipboard. Kirim ke grup WhatsApp atau Discord temanmu.'
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
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
              Match Lobby Futsal
            </Text>
            <Text style={styles.topBarSubtitle}>Kode Room: #FTS-089 📋</Text>
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>
              OPEN · {participants.length}/{totalSlots}
            </Text>
          </View>
        </View>

        {/* Kickoff & Venue Card (Figma 127:96) */}
        <View style={styles.kickoffVenueCard}>
          <View style={styles.kickoffHeaderRow}>
            <Text style={styles.kickoffTimeText}>KICKOFF: Hari Ini, 19:30 WIB</Text>
            <View style={styles.timeRemainingPill}>
              <Text style={styles.timeRemainingText}>⏱️ 01j 45m Lagi</Text>
            </View>
          </View>
          <View style={styles.venueLocationRow}>
            <Text style={styles.venueLocationText}>📍 GOR Bulungan Arena · Court 1 Vinyl</Text>
            <TouchableOpacity onPress={() => showAlert('info', 'Maps', 'Membuka Google Maps ke GOR Bulungan Arena.')}>
              <Text style={styles.openMapsText}>Buka Maps →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dynamic Split-Bill Box (Figma 127:104) */}
        <View style={styles.splitBillCard}>
          <View style={styles.splitBillHeader}>
            <View>
              <Text style={styles.splitBillLabel}>ESTIMASI PATUNGAN DINAMIS</Text>
              <Text style={styles.splitBillCondition}>
                Rp 30.000 (kuota 10) · Rp 37.500 (jika 8 org)
              </Text>
            </View>
            <View style={styles.splitBillAmountBox}>
              <Text style={styles.splitBillAmount}>
                Rp {fullTargetCostPerPlayer.toLocaleString('id-ID')}
              </Text>
              <Text style={styles.splitBillConditionBadge}>Kondisi 10/10</Text>
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
                Semua
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.teamTab, activeTeamTab === 'A' && styles.teamTabActive]}
              onPress={() => setActiveTeamTab('A')}
            >
              <Text
                style={[
                  styles.teamTabText,
                  activeTeamTab === 'A' && styles.teamTabTextActive
                ]}
              >
                Tim A ({participants.filter((p) => p.team === 'A').length}/5)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.teamTab, activeTeamTab === 'B' && styles.teamTabActive]}
              onPress={() => setActiveTeamTab('B')}
            >
              <Text
                style={[
                  styles.teamTabText,
                  activeTeamTab === 'B' && styles.teamTabTextActive
                ]}
              >
                Tim B ({participants.filter((p) => p.team === 'B').length}/5)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Player Slot List (10 Slots) */}
        <View style={styles.rosterList}>
          {Array.from({ length: totalSlots }, (_, i) => i + 1).map((slotNum) => {
            const player = participants.find((p) => p.slot === slotNum);

            // Filter by team if selected
            if (activeTeamTab !== 'all' && player && player.team !== activeTeamTab) {
              return null;
            }

            if (player) {
              const initials = player.name.slice(0, 2).toUpperCase();
              return (
                <View key={slotNum} style={styles.playerCardFilled}>
                  <View style={styles.playerSlotBadge}>
                    <Text style={styles.playerSlotText}>#{slotNum}</Text>
                  </View>

                  <View style={styles.playerAvatar}>
                    <Text style={styles.playerAvatarText}>{initials}</Text>
                  </View>

                  <View style={styles.playerDetails}>
                    <View style={styles.playerNameRow}>
                      <Text style={styles.playerName}>{player.name}</Text>
                      {player.isHost && (
                        <View style={styles.hostBadge}>
                          <Text style={styles.hostBadgeText}>HOST</Text>
                        </View>
                      )}
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

        {/* AI Team Balancer Button */}
        <TouchableOpacity
          style={styles.balancerBtn}
          activeOpacity={0.8}
          onPress={handleRunBalancer}
        >
          <Text style={styles.balancerBtnText}>
            ⚖️ Jalankan Balanced Team Splitter (AI)
          </Text>
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
                ✓ Anda Terdaftar di Slot #{participants.length}
              </Text>
              <Text style={styles.joinedSubtext}>
                Tiba di lapangan 15 menit sebelum kickoff untuk check-in QR.
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.btnJoinPrimary}
              activeOpacity={0.8}
              onPress={handleJoinSlot}
            >
              <Text style={styles.btnJoinPrimaryText}>
                ⚡ KUNCI 1 SLOT SEKARANG (Rp {fullTargetCostPerPlayer.toLocaleString('id-ID')})
              </Text>
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
    marginBottom: 16
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
    marginHorizontal: 12
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
  statusPillText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.success,
    letterSpacing: 0.5,
    includeFontPadding: false
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
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
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
    alignItems: 'flex-end'
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
  teamTabActive: {
    backgroundColor: THEME.colors.primaryMuted,
    borderColor: THEME.colors.primary
  },
  teamTabText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  teamTabTextActive: {
    fontFamily: THEME.typography.fonts.bold,
    color: THEME.colors.primary,
    includeFontPadding: false
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
  playerAvatarText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 11,
    color: THEME.colors.primary,
    includeFontPadding: false
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
    borderColor: THEME.colors.cardBorder,
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
