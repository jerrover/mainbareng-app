import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { THEME } from '../theme';

export default function ProfileScreen({ navigation }) {
  const profile = {
    name: 'Jeremy Marvel',
    role: 'Product Lead / Striker',
    karmaScore: 98,
    totalSessions: 14,
    showUpRate: '100%',
    activities: [
      { type: 'Futsal', role: 'Pivot / Striker', skillRating: 1450, matches: 8 },
      { type: 'Badminton', role: 'Ganda Men', skillRating: 1320, matches: 4 },
      { type: 'MLBB', role: 'Midlane (Mage)', skillRating: 1580, matches: 12 }
    ]
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Card Header */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>JM</Text>
        </View>
        <Text style={styles.profileName}>{profile.name}</Text>
        <Text style={styles.profileRole}>{profile.role}</Text>

        <View style={styles.badgeRow}>
          <View style={styles.karmaBadge}>
            <Text style={styles.karmaNumber}>{profile.karmaScore}</Text>
            <Text style={styles.karmaLabel}>Karma Score</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{profile.totalSessions}</Text>
            <Text style={styles.statLabel}>Sesi Selesai</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{profile.showUpRate}</Text>
            <Text style={styles.statLabel}>Hadir On-Time</Text>
          </View>
        </View>
      </View>

      {/* Activity Profiles */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SUB-PROFIL & SKILL RATING</Text>
        <View style={styles.activityList}>
          {profile.activities.map((act) => (
            <View key={act.type} style={styles.activityCard}>
              <View style={styles.actTop}>
                <Text style={styles.actType}>{act.type}</Text>
                <Text style={styles.actRating}>SR {act.skillRating}</Text>
              </View>
              <Text style={styles.actRole}>{act.role} · {act.matches} Match</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Action Buttons */}
      <TouchableOpacity
        style={styles.btnLogout}
        onPress={() => navigation.navigate('Auth')}
      >
        <Text style={styles.btnLogoutText}>Keluar Akun</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background
  },
  content: {
    padding: 20
  },
  profileCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    marginBottom: 20
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textOnPrimary
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text
  },
  profileRole: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    marginBottom: 16
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)'
  },
  karmaBadge: {
    flex: 1,
    backgroundColor: THEME.colors.primaryMuted,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.primary
  },
  karmaNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.primary
  },
  karmaLabel: {
    fontSize: 11,
    color: THEME.colors.primaryLight,
    fontWeight: '600',
    marginTop: 2
  },
  statBox: {
    flex: 1,
    backgroundColor: THEME.colors.cardElevated,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text
  },
  statLabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2
  },
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 12
  },
  activityList: {
    gap: 10
  },
  activityCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder
  },
  actTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  actType: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.text
  },
  actRating: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary
  },
  actRole: {
    fontSize: 12,
    color: THEME.colors.textSecondary
  },
  btnLogout: {
    backgroundColor: THEME.colors.cardElevated,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.danger
  },
  btnLogoutText: {
    color: THEME.colors.danger,
    fontSize: 14,
    fontWeight: '700'
  }
});
