import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { THEME } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card (Figma 95:6) */}
        <View style={styles.heroCard}>
          <View style={styles.tagBadge}>
            <Text style={styles.tagBadgeText}>MABAR APP ECOSYSTEM</Text>
          </View>

          <Text style={styles.heroTitle}>MAIN BARENG YUKK!</Text>

          <Text style={styles.heroSubtitle}>
            Temukan teman main futsal, badminton, basket, MLBB, dan Valorant tanpa ribet!
          </Text>

          {/* Sports Chips Row (Figma 95:14) */}
          <View style={styles.sportsRow}>
            <View style={styles.sportChip}>
              <Text style={styles.sportChipText}>⚽ Futsal</Text>
            </View>
            <View style={styles.sportChip}>
              <Text style={styles.sportChipText}>🏸 Badminton</Text>
            </View>
            <View style={styles.sportChip}>
              <Text style={styles.sportChipText}>🎮 MLBB</Text>
            </View>
            <View style={styles.sportChip}>
              <Text style={styles.sportChipText}>🎯 Valorant</Text>
            </View>
          </View>
        </View>

        {/* Carousel Indicators / Pips (Figma 95:23) */}
        <View style={styles.pipsRow}>
          <View style={[styles.pip, styles.pipActive]} />
          <View style={styles.pip} />
          <View style={styles.pip} />
        </View>

        {/* Value Prop Section Header (Figma 95:27) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Main Tanpa Khawatir Ghosting</Text>
          <Text style={styles.sectionSubtitle}>
            Ekosistem matchmaking dengan reputasi transparan dan tim seimbang.
          </Text>
        </View>

        {/* 3 Benefit Cards (Figma 95:30, 95:36, 95:42) */}
        <View style={styles.benefitCard}>
          <View style={[styles.benefitIconBox, styles.iconShieldBg]}>
            <Text style={styles.benefitIcon}>🛡️</Text>
          </View>
          <View style={styles.benefitTextBox}>
            <Text style={styles.benefitTitle}>Credit Score Anti-Ghosting</Text>
            <Text style={styles.benefitDesc}>
              Sanksi penalti -20 poin & cooldown jika absen sepihak.
            </Text>
          </View>
        </View>

        <View style={styles.benefitCard}>
          <View style={[styles.benefitIconBox, styles.iconBoltBg]}>
            <Text style={styles.benefitIcon}>⚡</Text>
          </View>
          <View style={styles.benefitTextBox}>
            <Text style={styles.benefitTitle}>AI-Powered Team Balancer</Text>
            <Text style={styles.benefitDesc}>
              Bagi dua tim otomatis secara adil berbasis skill & role.
            </Text>
          </View>
        </View>

        <View style={styles.benefitCard}>
          <View style={[styles.benefitIconBox, styles.iconMoneyBg]}>
            <Text style={styles.benefitIcon}>💸</Text>
          </View>
          <View style={styles.benefitTextBox}>
            <Text style={styles.benefitTitle}>Kalkulator Patungan Transparan</Text>
            <Text style={styles.benefitDesc}>
              Hitung otomatis iuran sewa lapangan per orang tanpa nombok.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Pinned Bottom Action (Figma 95:48) */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.btnPrimary}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Auth', { initialMode: 'signup' })}
        >
          <Text style={styles.btnPrimaryText}>Mulai Sekarang →</Text>
        </TouchableOpacity>

        <View style={styles.footerLinkRow}>
          <Text style={styles.footerLinkText}>Sudah punya akun? </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Auth', { initialMode: 'signin' })}
          >
            <Text style={styles.footerLinkAction}>Masuk di sini</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.homeBar} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 24
  },
  heroCard: {
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: 'rgba(213, 255, 64, 0.35)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 16
  },
  tagBadge: {
    backgroundColor: 'rgba(213, 255, 64, 0.15)',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 10
  },
  tagBadgeText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.primary,
    includeFontPadding: false,
    letterSpacing: 0.5
  },
  heroTitle: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 24,
    color: THEME.colors.text,
    includeFontPadding: false,
    lineHeight: 30,
    marginBottom: 8
  },
  heroSubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: '#C0C2B8',
    includeFontPadding: false,
    lineHeight: 18,
    marginBottom: 12
  },
  sportsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  sportChip: {
    backgroundColor: '#1A1D24',
    borderWidth: 1,
    borderColor: 'rgba(192, 194, 184, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  sportChipText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 10,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  pipsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18
  },
  pip: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6B7280'
  },
  pipActive: {
    width: 24,
    backgroundColor: THEME.colors.primary
  },
  sectionHeader: {
    marginHorizontal: 16,
    marginBottom: 14
  },
  sectionTitle: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 17,
    color: THEME.colors.text,
    includeFontPadding: false,
    marginBottom: 4
  },
  sectionSubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: '#C0C2B8',
    includeFontPadding: false,
    lineHeight: 17
  },
  benefitCard: {
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: 'rgba(192, 194, 184, 0.16)',
    borderRadius: 14,
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 16,
    marginBottom: 12
  },
  benefitIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  iconShieldBg: {
    backgroundColor: 'rgba(0, 245, 155, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 155, 0.4)'
  },
  iconBoltBg: {
    backgroundColor: 'rgba(213, 255, 64, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(213, 255, 64, 0.4)'
  },
  iconMoneyBg: {
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 10, 0.4)'
  },
  benefitIcon: {
    fontSize: 18,
    includeFontPadding: false
  },
  benefitTextBox: {
    flex: 1
  },
  benefitTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13,
    color: THEME.colors.text,
    includeFontPadding: false,
    marginBottom: 3
  },
  benefitDesc: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: '#C0C2B8',
    includeFontPadding: false,
    lineHeight: 15
  },
  bottomBar: {
    backgroundColor: THEME.colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(192, 194, 184, 0.1)',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    alignItems: 'center'
  },
  btnPrimary: {
    width: '100%',
    height: 48,
    backgroundColor: THEME.colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  btnPrimaryText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 14,
    color: THEME.colors.textOnPrimary,
    includeFontPadding: false
  },
  footerLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  footerLinkText: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: '#C0C2B8',
    includeFontPadding: false
  },
  footerLinkAction: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  homeBar: {
    width: 134,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)'
  }
});
