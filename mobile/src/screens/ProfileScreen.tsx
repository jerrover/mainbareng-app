import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { THEME } from '../theme';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';
import CustomAlertModal, { AlertType } from '../components/CustomAlertModal';
import RadarChart, { RadarDataPoint, getPointGrade } from '../components/RadarChart';
import { api, ApiOvrProfile } from '../services/api';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

interface UserProfileData {
  fullName: string;
  email: string;
  creditScore: number;
  totalSessions: number;
  showUpRate: string;
}

interface ActivityItem {
  type: string;
  role: string;
  level: string;
  rating: string;
  accentColor: string;
  matches: number;
}

export default function ProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const bottomPadding = 24;
  const { session, user, signOut } = useAuthStore();
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [ovrProfile, setOvrProfile] = useState<ApiOvrProfile | null>(null);

  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
    primaryButtonText?: string;
    onPrimaryPress?: () => void;
    secondaryButtonText?: string;
    onSecondaryPress?: () => void;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: ''
  });

  const showAlert = (
    title: string,
    message: string,
    type: AlertType = 'info',
    onPrimaryPress?: () => void,
    primaryButtonText = 'Mengerti',
    secondaryButtonText?: string,
    onSecondaryPress?: () => void
  ) => {
    setModalConfig({
      visible: true,
      type,
      title,
      message,
      primaryButtonText,
      onPrimaryPress: () => {
        setModalConfig((prev) => ({ ...prev, visible: false }));
        if (onPrimaryPress) onPrimaryPress();
      },
      secondaryButtonText,
      onSecondaryPress: secondaryButtonText
        ? () => {
            setModalConfig((prev) => ({ ...prev, visible: false }));
            if (onSecondaryPress) onSecondaryPress();
          }
        : undefined
    });
  };

  useEffect(() => {
    if (!user) {
      setProfileData(null);
      setActivities([]);
      return;
    }

    const loadProfile = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, email, credit_score, total_sessions_completed, show_up_rate')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.warn('[ProfileScreen] Fetch profile error:', error.message);
        }

        const resolvedName =
          data?.full_name ||
          user.user_metadata?.full_name ||
          user.email?.split('@')[0] ||
          'Jeremy Marvel';

        setProfileData({
          fullName: resolvedName,
          email: data?.email || user.email || '',
          creditScore: data?.credit_score ?? 100,
          totalSessions: data?.total_sessions_completed ?? 12,
          showUpRate: `${data?.show_up_rate ?? 100}%`
        });

        // Fetch user activities or use calibrated defaults matching SCR-16
        const { data: actData } = await supabase
          .from('user_activity_profiles')
          .select('activity_type, preferred_role, skill_rating_level, skill_rating_points')
          .eq('user_id', user.id);

        if (actData && actData.length > 0) {
          setActivities(
            actData.map((act) => {
              const pts = act.skill_rating_points ?? 1200;
              const convertedRating = (pts / 20).toFixed(1);
              return {
                type: act.activity_type.toUpperCase(),
                level: act.skill_rating_level || 'Intermediate',
                role: act.preferred_role || 'Pemain',
                rating: `Rating ${convertedRating}`,
                accentColor: THEME.colors.primary,
                matches: 8
              };
            })
          );
        } else {
          setActivities([]);
        }

        // Fetch OVR profile from backend API
        try {
          const ovrRes = await api.getMyOvr();
          if (ovrRes) {
            setOvrProfile(ovrRes);
          } else {
            // Calibrated fallback
            const completed = data?.total_sessions_completed ?? 0;
            const exp = Math.min(100, Math.round(30 + Math.sqrt(completed) * 15.65));
            setOvrProfile({
              ovr: 75,
              grade: 'B',
              is_calibrated: completed >= 3,
              matches_played: completed,
              total_reviews: 0,
              radar: [
                { key: 'teamwork', label: 'TMW', name: 'Teamwork', value: 75 },
                { key: 'fair_play', label: 'FRP', name: 'Fair Play', value: 80 },
                { key: 'reliability', label: 'REL', name: 'Reliability', value: data?.credit_score ?? 100 },
                { key: 'experience', label: 'EXP', name: 'Experience', value: exp },
                { key: 'skill_fit', label: 'SKL', name: 'Skill Fit', value: 75 }
              ]
            });
          }
        } catch (ovrErr) {
          console.warn('[ProfileScreen] Fetch OVR error:', ovrErr);
        }
      } catch (err) {
        console.warn('[ProfileScreen] Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleSignOut = () => {
    showAlert(
      'Konfirmasi Keluar',
      'Apakah Anda yakin ingin keluar dari akun?',
      'warning',
      async () => {
        await signOut();
        const root = navigation.getParent<any>();
        if (root) root.navigate('Auth');
      },
      'Keluar Akun',
      'Batal'
    );
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getGradeColor = (grade?: string) => {
    switch (grade) {
      case 'S':
        return THEME.colors.primary;
      case 'A':
        return '#38BDF8';
      case 'B':
        return '#A3E635';
      case 'C':
        return THEME.colors.warning;
      case 'D':
        return THEME.colors.danger;
      default:
        return THEME.colors.primary;
    }
  };

  const getPillarDescription = (key: string, value: number) => {
    switch (key) {
      case 'teamwork':
        return `Skor Kerjasama Tim (${value}/100): Mengukur kekompakan, unselfish play, dan koordinasi dengan rekan setim di lapangan.`;
      case 'fair_play':
        return `Skor Sportivitas (${value}/100): Dihitung dari akumulasi review sportivitas sesama pemain di lapangan.`;
      case 'reliability':
        return `Skor Keandalan (${value}/100): Terikat langsung dengan Credit Score kamu, menjamin kamu tidak pernah ghosting slot.`;
      case 'experience':
        return `Skor Jam Terbang (${value}/100): Mengukur konsistensi dan jumlah sesi pertandingan yang berhasil kamu selesaikan.`;
      case 'skill_fit':
        return `Kecocokan Skill (${value}/100): Evaluasi kesesuaian tingkat kemahiran teknis agar tim tetap seimbang.`;
      default:
        return `Skor atribut: ${value}/100`;
    }
  };

  // Guest Mode View
  if (!session || !user) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
          <View style={styles.topNav}>
            <Text style={styles.navTitle}>Profil & Reputasi</Text>
          </View>

          <View style={styles.guestCard}>
            <View style={[styles.avatarCircle, { borderColor: THEME.colors.cardBorder }]}>
              <Text style={[styles.avatarText, { color: THEME.colors.textMuted }]}>?</Text>
            </View>
            <Text style={styles.profileName}>Mode Tamu</Text>
            <Text style={styles.guestSubtitle}>
              Masuk untuk melihat profil, rekam jejak kehadiran, dan reputasi Credit Score kamu.
            </Text>

            <TouchableOpacity
              style={styles.btnLoginPrimary}
              onPress={() => { const root = navigation.getParent<any>(); if (root) root.navigate('Auth'); else (navigation as any).navigate('Auth'); }}
            >
              <Text style={styles.btnLoginPrimaryText}>Masuk / Daftar Akun</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const name = profileData?.fullName || user.user_metadata?.full_name || 'Jeremy Marvel';
  const creditScore = profileData?.creditScore ?? 100;
  const totalSessions = profileData?.totalSessions ?? 12;
  const showUpRate = profileData?.showUpRate ?? '100%';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
      {/* Top Nav Bar (SCR-16) */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.navCircleBtn}
          onPress={() => navigation.navigate('Explore')}
        >
          <Text style={styles.navBackIcon}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.navTitle}>Profil & Reputasi</Text>

        <TouchableOpacity
          style={styles.navCircleBtn}
          onPress={() => showAlert('Pengaturan', 'Menu preferensi dan notifikasi akun segera hadir di rilis berikutnya.', 'info')}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Header Card */}
      <View style={styles.profileHeaderCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{getInitials(name)}</Text>
        </View>

        <View style={styles.profileInfoBox}>
          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.memberSince}>Member sejak September 2025</Text>
          <View style={styles.matchStatsRow}>
            <Text style={styles.matchCount}>{totalSessions} Match Selesai</Text>
            <Text style={styles.statDot}>·</Text>
            <Text style={styles.showUpText}>{showUpRate} Show-up Rate</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.ovrBadge,
            { borderColor: getGradeColor(ovrProfile?.grade) }
          ]}
          onPress={() =>
            showAlert(
              `Status OVR: ${ovrProfile?.ovr ?? 75} (${ovrProfile?.grade ?? 'B'})`,
              `Overall Rating dihitung dari 5 pilar: Teamwork, Fair Play, Reliability, Experience, dan Skill Fit.${
                ovrProfile?.is_calibrated
                  ? ' Profil Anda telah terkalibrasi penuh.'
                  : ' Profil dalam fase kalibrasi (butuh min. 3 pertandingan).'
              }`,
              'info'
            )
          }
        >
          <Text
            style={[
              styles.ovrNumber,
              { color: getGradeColor(ovrProfile?.grade) }
            ]}
          >
            {ovrProfile?.ovr ?? 74}
          </Text>
          <Text style={styles.ovrLabel}>OVR · {ovrProfile?.grade ?? 'B'}</Text>
        </TouchableOpacity>
      </View>

      {/* Section: OVR Radar Profiling */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>PROFIL ATLET & RADAR STATS</Text>
        <Text style={styles.sectionSubtitle}>
          {ovrProfile?.is_calibrated ? 'Terkalibrasi Penuh' : 'Fase Kalibrasi (3 Match)'}
        </Text>
      </View>

      <View style={styles.radarCard}>
        <View style={styles.radarHeaderRow}>
          <View style={styles.radarBadgeRow}>
            <View
              style={[
                styles.tierTag,
                { borderColor: getGradeColor(ovrProfile?.grade) }
              ]}
            >
              <Text
                style={[
                  styles.tierTagText,
                  { color: getGradeColor(ovrProfile?.grade) }
                ]}
              >
                TIER {ovrProfile?.grade ?? 'B'}
              </Text>
            </View>
            <Text style={styles.radarHeaderOvr}>
              {ovrProfile?.ovr ?? 74}{' '}
              <Text style={styles.radarHeaderOvrUnit}>OVR</Text>
            </Text>
          </View>

          <View style={styles.calibrationTag}>
            <Text style={styles.calibrationTagText}>
              {ovrProfile?.is_calibrated ? '✓ Terverifikasi' : '⚡ Kalibrasi'}
            </Text>
          </View>
        </View>

        {ovrProfile?.radar ? (
          <RadarChart
            data={ovrProfile.radar}
            size={280}
            accentColor={getGradeColor(ovrProfile?.grade)}
            onPressPoint={(pt) =>
              showAlert(
                `${pt.name} (${pt.label}): ${pt.value} / 100`,
                getPillarDescription(pt.key, pt.value),
                'info'
              )
            }
          />
        ) : (
          <ActivityIndicator color={THEME.colors.primary} style={{ marginVertical: 32 }} />
        )}

        {/* Match Performance Snapshot (Ala Esports / Reference Image) */}
        <View style={styles.radarStatsGrid}>
          <View style={styles.radarStatCol}>
            <Text style={styles.radarStatValue}>{totalSessions}</Text>
            <Text style={styles.radarStatLabel}>Sesi Main</Text>
          </View>
          <View style={styles.radarStatDivider} />
          <View style={styles.radarStatCol}>
            <Text style={styles.radarStatValue}>{showUpRate}</Text>
            <Text style={styles.radarStatLabel}>Kehadiran</Text>
          </View>
          <View style={styles.radarStatDivider} />
          <View style={styles.radarStatCol}>
            <Text style={[styles.radarStatValue, { color: THEME.colors.primary }]}>{creditScore}</Text>
            <Text style={styles.radarStatLabel}>Credit Score</Text>
          </View>
          <View style={styles.radarStatDivider} />
          <View style={styles.radarStatCol}>
            <Text style={styles.radarStatValue}>{totalSessions * 2}h</Text>
            <Text style={styles.radarStatLabel}>Jam Terbang</Text>
          </View>
        </View>

        <View style={styles.radarPillsGrid}>
          {ovrProfile?.radar.map((r) => {
            const pointGrade = getPointGrade(r.value);
            return (
              <TouchableOpacity
                key={r.key}
                style={[
                  styles.radarPillItem,
                  { borderColor: `${pointGrade.color}40` }
                ]}
                onPress={() =>
                  showAlert(
                    `${r.name} (${r.label}): ${r.value} / 100`,
                    getPillarDescription(r.key, r.value),
                    'info'
                  )
                }
              >
                <View style={styles.radarPillGradeBadge}>
                  <Text style={[styles.radarPillGradeText, { color: pointGrade.color }]}>
                    {pointGrade.grade}
                  </Text>
                </View>
                <Text style={styles.radarPillLabel}>{r.label}</Text>
                <Text
                  style={[
                    styles.radarPillValue,
                    { color: pointGrade.color }
                  ]}
                >
                  {r.value}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Credit Score Gauge Card */}
      <View style={styles.creditScoreCard}>
        <View style={styles.creditHeaderRow}>
          <Text style={styles.creditLabel}>CREDIT SCORE</Text>
          <View style={styles.primaBadge}>
            <Text style={styles.primaBadgeText}>PRIMA / BEBAS COOLDOWN</Text>
          </View>
        </View>

        <Text style={styles.creditValue}>{creditScore} / 100</Text>
        <Text style={styles.creditSubtitle}>
          Rekam jejak kehadiran sempurna, 0 laporan ghosting.
        </Text>

        <View style={styles.cardDivider} />

        <View style={styles.creditFooterRow}>
          <Text style={styles.creditRule}>Aturan: Skor &lt; 70 terkena cooldown 24 jam</Text>
          <TouchableOpacity
            onPress={() => showAlert('Riwayat Credit Score', 'Riwayat audit kehadiran Anda sempurna (100 / 100) tanpa laporan ghosting.', 'success')}
          >
            <Text style={styles.creditHistoryLink}>Riwayat Skor →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Section: Skill Ratings */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>SKILL RATINGS</Text>
        <Text style={styles.sectionSubtitle}>Diperbarui via Peer Review</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={THEME.colors.primary} style={{ marginVertical: 16 }} />
      ) : activities.length === 0 ? (
        <View style={styles.emptySkillBox}>
          <Text style={styles.emptySkillIcon}>🎯</Text>
          <Text style={styles.emptySkillTitle}>Belum Ada Rekam Skill Rating</Text>
          <Text style={styles.emptySkillSubtitle}>
            Ikuti sesi mabar dan selesaikan pertandingan untuk mendapatkan rating dan feedback dari pemain lain.
          </Text>
        </View>
      ) : (
        <View style={styles.skillList}>
          {activities.map((act) => (
            <View key={act.type} style={styles.skillCard}>
              <View style={styles.skillInfo}>
                <Text style={styles.skillTitle}>
                  {act.type} · {act.level}
                </Text>
                <Text style={styles.skillDetail}>
                  Preferred: {act.role} · {act.matches} Match
                </Text>
              </View>

              <View style={[styles.ratingTag, { borderColor: act.accentColor }]}>
                <Text style={[styles.ratingText, { color: act.accentColor }]}>
                  {act.rating}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Section: Reputasi Komunitas */}
      <View style={[styles.sectionHeaderRow, { marginTop: 18 }]}>
        <Text style={styles.sectionTitle}>REPUTASI KOMUNITAS</Text>
        <Text style={styles.sectionSubtitle}>Feedback Teman Mabar</Text>
      </View>

      <View style={styles.endorsementsRow}>
        <View style={[styles.endorsementChip, { borderColor: THEME.colors.success }]}>
          <Text style={[styles.endorsementText, { color: THEME.colors.success }]}>
            ✓ 100% On-Time
          </Text>
        </View>

        <View style={[styles.endorsementChip, { borderColor: THEME.colors.primary }]}>
          <Text style={[styles.endorsementText, { color: THEME.colors.primary }]}>
            ★ Sportif & Ramah
          </Text>
        </View>

        <View style={[styles.endorsementChip, { borderColor: THEME.colors.accent }]}>
          <Text style={[styles.endorsementText, { color: THEME.colors.accent }]}>
            ⚡ Sesuai Level
          </Text>
        </View>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.btnLogout} onPress={handleSignOut}>
        <Text style={styles.btnLogoutText}>Keluar Akun</Text>
      </TouchableOpacity>
      <CustomAlertModal
        visible={modalConfig.visible}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        primaryButtonText={modalConfig.primaryButtonText}
        onPrimaryPress={
          modalConfig.onPrimaryPress ||
          (() => setModalConfig((prev) => ({ ...prev, visible: false })))
        }
        secondaryButtonText={modalConfig.secondaryButtonText}
        onSecondaryPress={modalConfig.onSecondaryPress}
        onClose={() => setModalConfig((prev) => ({ ...prev, visible: false }))}
        />
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
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120
  },
  topNav: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  navCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center'
  },
  navBackIcon: {
    fontSize: 22,
    color: THEME.colors.text,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
    marginTop: -2
  },
  settingsIcon: {
    fontSize: 16,
    color: THEME.colors.textSecondary,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center'
  },
  navTitle: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 16,
    color: THEME.colors.text,
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
  profileHeaderCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 18,
    color: THEME.colors.primary,
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
  profileInfoBox: {
    flex: 1,
    gap: 2
  },
  profileName: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 16,
    color: THEME.colors.text,
    includeFontPadding: false,
    lineHeight: 22
  },
  memberSince: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    includeFontPadding: false,
    lineHeight: 16
  },
  matchStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2
  },
  matchCount: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.accent,
    includeFontPadding: false
  },
  statDot: {
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  showUpText: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  ovrBadge: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: THEME.colors.card,
    borderWidth: 1.5,
    borderColor: THEME.colors.accent,
    alignItems: 'center',
    justifyContent: 'center'
  },
  ovrNumber: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 16,
    color: THEME.colors.accent,
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 18
  },
  ovrLabel: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 8,
    color: THEME.colors.textSecondary,
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 10
  },
  creditScoreCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.primary,
    padding: 14,
    gap: 8,
    marginBottom: 16
  },
  creditHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  creditLabel: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    letterSpacing: 0.5,
    includeFontPadding: false
  },
  primaBadge: {
    backgroundColor: THEME.colors.primaryMuted,
    borderWidth: 1,
    borderColor: THEME.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaBadgeText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 9,
    color: THEME.colors.primary,
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
  creditValue: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 28,
    color: THEME.colors.primary,
    includeFontPadding: false,
    lineHeight: 34
  },
  creditSubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    includeFontPadding: false,
    lineHeight: 16
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(31, 44, 71, 0.8)',
    marginVertical: 4
  },
  creditFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  creditRule: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  creditHistoryLink: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 10,
    color: THEME.colors.accent,
    includeFontPadding: false
  },
  radarCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    padding: 14,
    marginBottom: 16
  },
  radarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  radarBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  tierTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'rgba(213, 255, 64, 0.08)'
  },
  tierTagText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    letterSpacing: 0.5,
    includeFontPadding: false
  },
  radarHeaderOvr: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 20,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  radarHeaderOvrUnit: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textMuted
  },
  calibrationTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder
  },
  calibrationTagText: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  radarStatsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.cardElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginVertical: 10
  },
  radarStatCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2
  },
  radarStatValue: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  radarStatLabel: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 9,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  radarStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: THEME.colors.cardBorder
  },
  radarPillsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 2
  },
  radarPillItem: {
    flex: 1,
    backgroundColor: THEME.colors.cardElevated,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 6,
    alignItems: 'center',
    gap: 2
  },
  radarPillGradeBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  radarPillGradeText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 8.5,
    includeFontPadding: false
  },
  radarPillLabel: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 9,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  radarPillValue: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    includeFontPadding: false
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  sectionTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    letterSpacing: 0.5,
    includeFontPadding: false
  },
  sectionSubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  skillList: {
    gap: 8,
    marginBottom: 10
  },
  emptySkillBox: {
    backgroundColor: THEME.colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  emptySkillIcon: {
    fontSize: 24,
    marginBottom: 6
  },
  emptySkillTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.text,
    includeFontPadding: false,
    marginBottom: 4
  },
  emptySkillSubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 15,
    includeFontPadding: false
  },
  skillCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  skillInfo: {
    gap: 2
  },
  skillTitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  skillDetail: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  ratingTag: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: THEME.colors.card,
    justifyContent: 'center',
    alignItems: 'center'
  },
  ratingText: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 11,
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
  endorsementsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20
  },
  endorsementChip: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: THEME.colors.card,
    justifyContent: 'center',
    alignItems: 'center'
  },
  endorsementText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11,
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
  guestCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    marginTop: 20
  },
  guestSubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
    includeFontPadding: false
  },
  btnLoginPrimary: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnLoginPrimaryText: {
    fontFamily: THEME.typography.fonts.bold,
    color: THEME.colors.textOnPrimary,
    fontSize: 13,
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
  btnLogout: {
    backgroundColor: THEME.colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.danger,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8
  },
  btnLogoutText: {
    fontFamily: THEME.typography.fonts.bold,
    color: THEME.colors.danger,
    fontSize: 13,
    includeFontPadding: false,
    textAlignVertical: 'center'
  }
});