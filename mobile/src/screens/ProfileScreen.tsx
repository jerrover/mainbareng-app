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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { THEME } from '../theme';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';
import CustomAlertModal, { AlertType } from '../components/CustomAlertModal';

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
  const { session, user, signOut } = useAuthStore();
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);

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
          setActivities([
            {
              type: 'Futsal 5v5',
              level: 'Intermediate',
              role: 'Flank / Winger',
              rating: 'Rating 68.5',
              accentColor: THEME.colors.accent,
              matches: 12
            },
            {
              type: 'Badminton',
              level: 'Beginner',
              role: 'Casual Ganda',
              rating: 'Rating 42.0',
              accentColor: THEME.colors.warning,
              matches: 4
            },
            {
              type: 'Mobile Legends',
              level: 'Mythic Honor',
              role: 'Roamer / Mage',
              rating: 'Rating 82.0',
              accentColor: THEME.colors.primary,
              matches: 36
            },
            {
              type: 'Valorant',
              level: 'Diamond 2',
              role: 'Controller',
              rating: 'Rating 75.0',
              accentColor: THEME.colors.danger,
              matches: 20
            }
          ]);
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

  // Guest Mode View
  if (!session || !user) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
    );
  }

  const name = profileData?.fullName || user.user_metadata?.full_name || 'Jeremy Marvel';
  const creditScore = profileData?.creditScore ?? 100;
  const totalSessions = profileData?.totalSessions ?? 12;
  const showUpRate = profileData?.showUpRate ?? '100%';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
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
          <Text style={styles.memberSince}>Member sejak September 2025 · IF670</Text>
          <View style={styles.matchStatsRow}>
            <Text style={styles.matchCount}>{totalSessions} Match Selesai</Text>
            <Text style={styles.statDot}>·</Text>
            <Text style={styles.showUpText}>{showUpRate} Show-up Rate</Text>
          </View>
        </View>

        <View style={styles.ovrBadge}>
          <Text style={styles.ovrNumber}>74</Text>
          <Text style={styles.ovrLabel}>OVR</Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40
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