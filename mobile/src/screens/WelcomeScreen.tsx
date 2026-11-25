import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent
} from 'react-native';
import Svg, { Path, Circle, Line, Polyline } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { THEME } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

interface HeroSlide {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  chips: string[];
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'discover',
    tag: 'JADWAL MABAR',
    title: 'Cari Sesi Terdekat',
    subtitle:
      'Lihat jadwal futsal, badminton, basket, sampai MLBB yang lagi butuh pemain di sekitar Tangerang.',
    chips: ['Futsal', 'Badminton', 'Basket', 'MLBB', 'Valorant']
  },
  {
    id: 'reputation',
    tag: 'CREDIT SCORE',
    title: 'Main Bareng Pemain Terpercaya',
    subtitle:
      'Setiap pemain punya Credit Score dari riwayat sesi sebelumnya untuk bantu jaga komitmen hadir.',
    chips: ['Credit Score', 'Check-in QR', 'Rating Teman']
  },
  {
    id: 'matchmaking',
    tag: 'TIM & PATUNGAN',
    title: 'Main Seru dengan Tim Seimbang',
    subtitle:
      'Susunan tim disesuaikan level main, dan biaya sewa langsung dibagi per orang.',
    chips: ['Bagi Tim', 'Level Main', 'Patungan']
  }
];

function ShieldIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function UsersIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx={9}
        cy={7}
        r={4}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M23 21v-2a4 4 0 0 0-3-3.87"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 3.13a4 4 0 0 1 0 7.75"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function WalletIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ArrowRightIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Line
        x1={5}
        y1={12}
        x2={19}
        y2={12}
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points="12 5 19 12 12 19"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const AUTO_SCROLL_INTERVAL_MS = 4000;

export default function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const carouselRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isDragging || screenWidth <= 0) return;

    const timer = setTimeout(() => {
      const nextIndex = (activeSlide + 1) % HERO_SLIDES.length;
      setActiveSlide(nextIndex);
      carouselRef.current?.scrollTo({ x: nextIndex * screenWidth, animated: true });
    }, AUTO_SCROLL_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [activeSlide, isDragging, screenWidth]);

  const syncActiveSlideFromOffset = (offsetX: number) => {
    if (screenWidth <= 0) return;
    const nextIndex = Math.round(offsetX / screenWidth);
    const clamped = Math.max(0, Math.min(HERO_SLIDES.length - 1, nextIndex));
    setActiveSlide(clamped);
  };

  const handleSlideEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIsDragging(false);
    syncActiveSlideFromOffset(event.nativeEvent.contentOffset.x);
  };

  const handleSelectSlide = (index: number) => {
    setActiveSlide(index);
    carouselRef.current?.scrollTo({ x: index * screenWidth, animated: true });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 3-Slide Horizontal Hero Carousel (Figma 95:6) */}
        <ScrollView
          ref={carouselRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          onScrollBeginDrag={() => setIsDragging(true)}
          onScrollEndDrag={(e) => {
            setIsDragging(false);
            syncActiveSlideFromOffset(e.nativeEvent.contentOffset.x);
          }}
          onMomentumScrollEnd={handleSlideEnd}
          scrollEventThrottle={16}
          style={styles.carousel}
        >
          {HERO_SLIDES.map((slide) => (
            <View key={slide.id} style={{ width: screenWidth, paddingHorizontal: 16 }}>
              <View style={styles.heroCard}>
                <View>
                  <View style={styles.tagBadge}>
                    <Text style={styles.tagBadgeText}>{slide.tag}</Text>
                  </View>

                  <Text style={styles.heroTitle}>{slide.title}</Text>

                  <Text style={styles.heroSubtitle}>{slide.subtitle}</Text>
                </View>

                <View style={styles.sportsRow}>
                  {slide.chips.map((chip) => (
                    <View key={chip} style={styles.sportChip}>
                      <Text style={styles.sportChipText}>{chip}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Carousel Indicators / Pips (Figma 95:23) */}
        <View style={styles.pipsRow}>
          {HERO_SLIDES.map((slide, index) => (
            <TouchableOpacity
              key={slide.id}
              activeOpacity={0.8}
              onPress={() => handleSelectSlide(index)}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <View style={[styles.pip, activeSlide === index && styles.pipActive]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Value Prop Section Header (Figma 95:27) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Cara Kerja Mabar</Text>
          <Text style={styles.sectionSubtitle}>
            Aturan lobi, pembagian tim, dan hitung iuran sebelum kamu datang ke lapangan.
          </Text>
        </View>

        {/* 3 Benefit Cards (Figma 95:30, 95:36, 95:42) */}
        <View style={styles.benefitCard}>
          <View style={[styles.benefitIconBox, styles.iconShieldBg]}>
            <ShieldIcon color={THEME.colors.success} />
          </View>
          <View style={styles.benefitTextBox}>
            <Text style={styles.benefitTitle}>Credit Score</Text>
            <Text style={styles.benefitDesc}>
              Tidak hadir tanpa kabar memotong 20 poin dan membatasi akses gabung sementara.
            </Text>
          </View>
        </View>

        <View style={styles.benefitCard}>
          <View style={[styles.benefitIconBox, styles.iconBoltBg]}>
            <UsersIcon color={THEME.colors.primary} />
          </View>
          <View style={styles.benefitTextBox}>
            <Text style={styles.benefitTitle}>Bagi Tim Seimbang</Text>
            <Text style={styles.benefitDesc}>
              Susunan tim diatur dari rating dan posisi masing-masing pemain.
            </Text>
          </View>
        </View>

        <View style={styles.benefitCard}>
          <View style={[styles.benefitIconBox, styles.iconMoneyBg]}>
            <WalletIcon color={THEME.colors.warning} />
          </View>
          <View style={styles.benefitTextBox}>
            <Text style={styles.benefitTitle}>Patungan Otomatis</Text>
            <Text style={styles.benefitDesc}>
              Nominal sewa lapangan langsung dibagi jumlah kuota sejak kamu masuk lobi.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Pinned Bottom Action (Figma 95:48) - Dinamis mengikuti navbar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom + 8, 16) }]}>
        <TouchableOpacity
          style={styles.btnPrimary}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Auth', { initialMode: 'signup' })}
        >
          <Text style={styles.btnPrimaryText}>Buat Akun</Text>
          <ArrowRightIcon color={THEME.colors.textOnPrimary} />
        </TouchableOpacity>

        <View style={styles.footerLinkRow}>
          <Text style={styles.footerLinkText}>Sudah punya akun? </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Auth', { initialMode: 'signin' })}
          >
            <Text style={styles.footerLinkAction}>Masuk</Text>
          </TouchableOpacity>
        </View>
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
  carousel: {
    marginBottom: 16
  },
  heroCard: {
    flex: 1,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: 'rgba(213, 255, 64, 0.35)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
