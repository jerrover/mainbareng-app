import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { THEME } from '../theme';
import { MainTabParamList } from '../navigation/types';

type Props = BottomTabScreenProps<MainTabParamList, 'Explore'>;

interface SessionItem {
  id: string;
  title: string;
  activity: string;
  activityIcon: string;
  venue: string;
  time: string;
  dayLabel: string;
  totalSlots: number;
  filledSlots: number;
  minKarma: number;
  costPerSlot: string;
  hostName: string;
  hostKarma: number;
  isUrgent?: boolean;
}

export default function ExploreScreen({ navigation }: Props) {
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [scheduleTab, setScheduleTab] = useState<'now' | 'scheduled'>('now');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'Semua', label: 'Semua' },
    { id: 'Futsal', label: '⚽ Futsal' },
    { id: 'Badminton', label: '🏸 Badminton' },
    { id: 'Basket', label: '🏀 Basket' },
    { id: 'MLBB', label: '🎮 MLBB' }
  ];

  const sessions: SessionItem[] = [
    {
      id: 'ses-1',
      title: 'Futsal Malam Santai 5v5 Serpong',
      activity: 'FUTSAL 5v5',
      activityIcon: '⚽',
      venue: 'Tifosi Sport Center · Vinyl',
      time: '19:00',
      dayLabel: 'Hari Ini',
      totalSlots: 10,
      filledSlots: 8,
      minKarma: 70,
      costPerSlot: 'Rp 30.000',
      hostName: 'Jeremy',
      hostKarma: 98,
      isUrgent: true
    },
    {
      id: 'ses-2',
      title: 'Badminton Ganda Men Intermediate',
      activity: 'BADMINTON GANDA',
      activityIcon: '🏸',
      venue: 'Champion Court Gading Serpong',
      time: '20:30',
      dayLabel: 'Hari Ini',
      totalSlots: 4,
      filledSlots: 3,
      minKarma: 80,
      costPerSlot: 'Rp 25.000',
      hostName: 'Ben_Mobile',
      hostKarma: 92,
      isUrgent: true
    },
    {
      id: 'ses-3',
      title: 'MLBB Mythic Push Party Full Squad',
      activity: 'ESPORTS 5-MAN',
      activityIcon: '🎮',
      venue: 'Discord Voice Channel 01',
      time: '21:00',
      dayLabel: 'Hari Ini',
      totalSlots: 5,
      filledSlots: 4,
      minKarma: 85,
      costPerSlot: 'Gratis',
      hostName: 'Hyun_Striker',
      hostKarma: 88,
      isUrgent: true
    },
    {
      id: 'ses-4',
      title: 'Futsal Akhir Pekan Friendly Match',
      activity: 'FUTSAL 5v5',
      activityIcon: '⚽',
      venue: 'Tifosi Sport Center · Rumput',
      time: '08:00',
      dayLabel: 'Sabtu Besok',
      totalSlots: 10,
      filledSlots: 6,
      minKarma: 75,
      costPerSlot: 'Rp 35.000',
      hostName: 'Jerikho',
      hostKarma: 90,
      isUrgent: false
    }
  ];

  // Filtering
  const filteredSessions = sessions.filter((s) => {
    const matchesCat =
      selectedCategory === 'Semua' ||
      s.activity.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.venue.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSchedule =
      scheduleTab === 'now' ? s.isUrgent : !s.isUrgent;
    return matchesCat && matchesSearch && matchesSchedule;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Top App Bar (Figma 31:20) */}
        <View style={styles.topAppBar}>
          <View style={styles.userInfo}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>JM</Text>
            </View>
            <View>
              <Text style={styles.greetingText}>Halo, Jeremy</Text>
              <Text style={styles.karmaText}>🛡️ Karma: 98 (Prima)</Text>
            </View>
          </View>
          <View style={styles.creditBadge}>
            <Text style={styles.creditBadgeText}>⚡ 100 Prima</Text>
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
            accessibilityLabel="Filter Pencarian"
          >
            <Text style={styles.filterBtnIcon}>⚙️</Text>
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
              Play Now (3)
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
              Terjadwal (12)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Play Now Alert Banner (Figma 35:482) */}
        {scheduleTab === 'now' && (
          <View style={styles.alertBanner}>
            <View style={styles.alertBannerLeft}>
              <View style={styles.playNowBadge}>
                <Text style={styles.playNowBadgeText}>PLAY NOW</Text>
              </View>
              <Text style={styles.alertTitle}>3 sesi darurat butuh pemain!</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Lobby', {})}>
              <Text style={styles.alertActionText}>Lihat →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Section Header (Figma 31:71) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderTitle}>SESI TERDEKAT DISEKITARMU</Text>
          <Text style={styles.sectionHeaderMeta}>📍 Radius 5 km</Text>
        </View>

        {/* Match Pass Bento Ticket Cards (Figma 31:74) */}
        <View style={styles.ticketList}>
          {filteredSessions.map((session) => {
            const emptySlots = session.totalSlots - session.filledSlots;
            const pips = Array.from({ length: session.totalSlots }, (_, i) => i < session.filledSlots);
            const isFutsal = session.totalSlots === 10;

            return (
              <View key={session.id} style={styles.matchPassCard}>
                {/* Stub Header */}
                <View style={styles.stubHeader}>
                  <View style={styles.stubHeaderLeft}>
                    <View style={styles.activityPill}>
                      <Text style={styles.activityPillText}>
                        {session.activity}
                      </Text>
                    </View>
                    <View style={styles.modePill}>
                      <Text style={styles.modePillText}>CONFIRMED SLOT</Text>
                    </View>
                  </View>
                  <Text style={styles.hostText}>
                    Host: {session.hostName} ({session.hostKarma})
                  </Text>
                </View>

                {/* Main Ticket Info Row */}
                <View style={styles.mainInfoRow}>
                  {/* Left: Kickoff Box */}
                  <View style={styles.kickoffBox}>
                    <Text style={styles.kickoffEyebrow}>KICKOFF</Text>
                    <Text style={styles.kickoffTime}>{session.time}</Text>
                    <Text style={styles.kickoffDay}>{session.dayLabel}</Text>
                  </View>

                  {/* Vertical Divider */}
                  <View style={styles.verticalDivider} />

                  {/* Right: Title & Meta */}
                  <View style={styles.detailsBox}>
                    <Text style={styles.matchTitle} numberOfLines={2}>
                      {session.title}
                    </Text>
                    <Text style={styles.matchVenue} numberOfLines={1}>
                      {session.venue}
                    </Text>
                    <View style={styles.karmaBadgeBox}>
                      <Text style={styles.karmaBadgeText}>
                        🛡️ Min Karma: {session.minKarma}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Quota Progress Pips */}
                <View style={styles.quotaSection}>
                  <View style={styles.quotaHeader}>
                    <Text style={styles.quotaTitle}>
                      KUOTA: {session.filledSlots}/{session.totalSlots} TERISI
                    </Text>
                    <Text style={styles.quotaRemaining}>
                      Sisa {emptySlots} Slot!
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
                      <Text style={styles.costAmount}>{session.costPerSlot}</Text>
                      {session.costPerSlot !== 'Gratis' && (
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
    paddingBottom: 96 // Space for floating capsule nav
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
