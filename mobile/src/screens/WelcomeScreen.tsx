import React, { useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AccessibilityInfo,
  AppState,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomButton from '../components/CustomButton';
import { RootStackParamList } from '../navigation/types';
import { THEME } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

const SLIDES = [
  {
    id: 'sessions',
    title: 'Temukan sesi main',
    description: 'Pilih sesi olahraga atau esports yang cocok dengan jadwalmu.'
  },
  {
    id: 'teams',
    title: 'Main dengan tim seimbang',
    description: 'Tim dibagi berdasarkan level dan posisi pemain.'
  },
  {
    id: 'cost',
    title: 'Cek iuran sebelum main',
    description: 'Biaya sewa dibagi sesuai kuota. Kamu bisa cek bagianmu di lobi.'
  },
  {
    id: 'credit',
    title: 'Jaga Credit Score',
    description: 'Absen tanpa kabar mengurangi 20 poin dan membatasi akses gabung sementara.'
  }
] as const;

const BACKGROUND_PHOTO = require('../../assets/welcome-mobile-gaming.jpg');
const AUTO_SCROLL_INTERVAL_MS = 6500;
const SCROLL_SETTLE_MS = 150;
const GUTTER = THEME.spatial.screenPaddingHorizontal;
const GRID = THEME.spatial.gridUnit;

function SlideArtwork({ slide }: { slide: (typeof SLIDES)[number]['id'] }) {
  return (
    <View style={styles.artwork} aria-hidden accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={styles.artworkHalo} />
      {slide === 'sessions' && (
        <>
          <View style={[styles.sessionCard, styles.sessionCardBack]}>
            <View style={styles.sessionLine} />
            <View style={[styles.sessionLine, styles.sessionLineShort]} />
          </View>
          <View style={[styles.sessionCard, styles.sessionCardFront]}>
            <View style={styles.sessionBadge} />
            <View style={styles.sessionLine} />
          </View>
        </>
      )}
      {slide === 'teams' &&
        ([false, true] as const).map((highlighted) => {
          const color = highlighted ? THEME.colors.primary : THEME.colors.secondary;
          return (
            <View
              key={String(highlighted)}
              style={[styles.jersey, highlighted ? styles.jerseyFront : styles.jerseyBack]}
            >
              <View style={[styles.sleeve, styles.leftSleeve, { backgroundColor: color }]} />
              <View style={[styles.sleeve, styles.rightSleeve, { backgroundColor: color }]} />
              <View style={[styles.jerseyBody, { backgroundColor: color }]}>
                <View style={styles.jerseyCollar} />
                <View style={styles.jerseyStripe} />
              </View>
            </View>
          );
        })}
      {slide === 'cost' && (
        <>
          <View style={styles.receipt}>
            <View style={styles.receiptLine} />
            <View style={styles.receiptLine} />
            <View style={[styles.receiptLine, styles.receiptLineShort]} />
          </View>
          <View style={styles.coin}>
            <Text style={styles.coinLabel}>Rp</Text>
          </View>
        </>
      )}
      {slide === 'credit' && (
        <View style={styles.calendar}>
          <View style={[styles.calendarPin, styles.leftCalendarPin]} />
          <View style={[styles.calendarPin, styles.rightCalendarPin]} />
          <View style={styles.calendarDivider} />
          <View style={styles.calendarCheck} />
        </View>
      )}
    </View>
  );
}

export default function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isFocused = useIsFocused();
  const carouselRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const scrollSettled = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isTouching, setIsTouching] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState ?? 'active');

  const safeWidth = width - insets.left - insets.right;
  const contentWidth = Math.max(1, Math.min(safeWidth - 2 * GUTTER, 448));
  const slideWidth = contentWidth + 2 * GRID;
  const illustrationHeight = Math.max(144, Math.min(height * 0.24, 216));
  const previousSlideWidth = useRef(slideWidth);

  useEffect(() => {
    let mounted = true;
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      setAppState(nextState);
      if (nextState !== 'active') setIsTouching(false);
    });
    const motionSubscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {
        // Keep the current motion preference if the platform cannot read it.
      });

    return () => {
      mounted = false;
      appStateSubscription.remove();
      motionSubscription.remove();
      if (scrollSettled.current) clearTimeout(scrollSettled.current);
    };
  }, []);

  useEffect(() => {
    if (previousSlideWidth.current === slideWidth) return;
    previousSlideWidth.current = slideWidth;
    if (scrollSettled.current) {
      clearTimeout(scrollSettled.current);
      scrollSettled.current = null;
      setIsScrolling(false);
    }
    carouselRef.current?.scrollTo({ x: activeSlide * slideWidth, animated: false });
  }, [activeSlide, slideWidth]);

  useEffect(() => {
    if (!isFocused || appState !== 'active' || reduceMotion || isTouching || isScrolling) return;

    const timer = setTimeout(() => {
      const nextIndex = (activeSlide + 1) % SLIDES.length;
      carouselRef.current?.scrollTo({ x: nextIndex * slideWidth, animated: nextIndex !== 0 });
      setActiveSlide(nextIndex);
    }, AUTO_SCROLL_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [activeSlide, appState, isFocused, isScrolling, isTouching, reduceMotion, slideWidth]);

  const handleScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (scrollSettled.current) {
      clearTimeout(scrollSettled.current);
    } else {
      setIsScrolling(true);
    }

    const index = Math.round(nativeEvent.contentOffset.x / slideWidth);
    scrollSettled.current = setTimeout(() => {
      scrollSettled.current = null;
      setActiveSlide(Math.max(0, Math.min(index, SLIDES.length - 1)));
      setIsScrolling(false);
    }, SCROLL_SETTLE_MS);
  };

  const selectSlide = (index: number) => {
    carouselRef.current?.scrollTo({ x: index * slideWidth, animated: !reduceMotion });
    setActiveSlide(index);
  };

  return (
    <View
      style={styles.container}
      onTouchStart={() => setIsTouching(true)}
      onTouchEnd={(event) => setIsTouching(event.nativeEvent.touches.length > 0)}
      onTouchCancel={() => setIsTouching(false)}
    >
      <Image
        source={BACKGROUND_PHOTO}
        resizeMode="cover"
        style={styles.background}
        accessible={false}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.containerContent}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.brand} accessible accessibilityLabel="MainBareng">
            <View style={styles.brandMark}>
              <Text style={styles.brandInitial}>M</Text>
            </View>
            <Text style={styles.brandName}>MainBareng</Text>
          </View>

          <Text accessibilityRole="header" style={styles.heading}>
            Selamat Datang di MainBareng!
          </Text>

          <ScrollView
            ref={carouselRef}
            style={[styles.carousel, { width: slideWidth }]}
            horizontal
            pagingEnabled
            nestedScrollEnabled
            directionalLockEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            scrollEventThrottle={16}
            onScroll={handleScroll}
          >
            {SLIDES.map((slide, index) => (
              <View
                key={slide.id}
                style={{ width: slideWidth }}
                aria-hidden={index !== activeSlide}
                importantForAccessibility={index === activeSlide ? 'auto' : 'no-hide-descendants'}
              >
                <View style={[styles.illustration, { height: illustrationHeight }]}>
                  <SlideArtwork slide={slide.id} />
                </View>
                <Text accessibilityRole="header" style={styles.slideTitle}>
                  {slide.title}
                </Text>
                <Text style={styles.slideDescription}>{slide.description}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.indicators}>
            {SLIDES.map((slide, index) => (
              <Pressable
                key={slide.id}
                accessibilityRole="button"
                accessibilityLabel={slide.title}
                aria-selected={activeSlide === index}
                onPress={() => selectSlide(index)}
                style={({ pressed }) => [
                  styles.indicator,
                  pressed && (!reduceMotion ? styles.indicatorPressed : styles.indicatorHighlighted)
                ]}
              >
                <View style={[styles.dot, activeSlide === index && styles.activeDot]} />
              </Pressable>
            ))}
          </View>

          <View style={[styles.actions, { width: contentWidth }]}>
            <CustomButton label="Masuk" onPress={() => navigation.navigate('Auth', { initialMode: 'signin' })} />
            <CustomButton
              label="Buat Akun Baru"
              variant="secondary"
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('Auth', { initialMode: 'signup' })}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background
  },
  containerContent: {
    flex: 1
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0.33
  },
  content: {
    alignItems: 'center',
    paddingTop: GRID * 1.5,
    paddingBottom: GRID * 3
  },
  brand: {
    minHeight: THEME.components.buttonPrimary.height,
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID
  },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: THEME.radius.sm,
    borderTopRightRadius: THEME.radius.xs,
    borderBottomLeftRadius: THEME.radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primary
  },
  brandInitial: {
    ...THEME.typography.h3,
    color: THEME.colors.textOnPrimary
  },
  brandName: {
    ...THEME.typography.cardTitle,
    fontFamily: THEME.typography.fonts.extraBold,
    letterSpacing: -0.6,
    color: THEME.colors.text
  },
  heading: {
    ...THEME.typography.h1,
    color: THEME.colors.text,
    textAlign: 'center',
    marginHorizontal: GUTTER,
    marginTop: GRID * 6,
    marginBottom: GRID * 2.5
  },
  carousel: {
    flexGrow: 0
  },
  illustration: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.lg,
    borderTopLeftRadius: THEME.radius.xl + GRID / 2,
    borderBottomRightRadius: THEME.radius.xl
  },
  artwork: {
    width: 154,
    height: 112,
    transform: [{ scale: 1.18 }]
  },
  artworkHalo: {
    position: 'absolute',
    top: GRID / 2,
    bottom: GRID / 2,
    left: 0,
    right: 0,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.primaryMuted,
    opacity: 0.7,
    transform: [{ rotate: '-9deg' }]
  },
  sessionCard: {
    position: 'absolute',
    width: 75,
    height: 67,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.borderStrong,
    padding: GRID * 1.5,
    justifyContent: 'flex-end',
    gap: GRID
  },
  sessionCardBack: {
    top: 17,
    left: 24,
    transform: [{ rotate: '-12deg' }]
  },
  sessionCardFront: {
    top: 33,
    left: 55,
    transform: [{ rotate: '10deg' }],
    borderColor: THEME.colors.primary
  },
  sessionLine: {
    height: 4,
    width: '94%',
    borderRadius: THEME.radius.xs,
    backgroundColor: THEME.colors.textMuted
  },
  sessionLineShort: { width: '58%' },
  sessionBadge: {
    position: 'absolute',
    top: 13,
    left: 12,
    width: 21,
    height: 13,
    borderRadius: THEME.radius.xs,
    backgroundColor: THEME.colors.primary
  },
  jersey: {
    position: 'absolute',
    width: 64,
    height: 64
  },
  jerseyBack: {
    top: 24,
    left: 18,
    transform: [{ rotate: '-12deg' }]
  },
  jerseyFront: {
    top: 30,
    left: 74,
    transform: [{ rotate: '10deg' }]
  },
  jerseyBody: {
    position: 'absolute',
    top: 6,
    left: 16,
    width: 32,
    height: 54,
    borderRadius: THEME.radius.xs,
    alignItems: 'center'
  },
  sleeve: {
    position: 'absolute',
    top: 9,
    width: 21,
    height: 23,
    borderRadius: THEME.radius.xs
  },
  leftSleeve: { left: 6, transform: [{ rotate: '29deg' }] },
  rightSleeve: { right: 6, transform: [{ rotate: '-29deg' }] },
  jerseyCollar: {
    width: 12,
    height: 7,
    borderBottomLeftRadius: THEME.radius.sm,
    borderBottomRightRadius: THEME.radius.sm,
    backgroundColor: THEME.colors.card
  },
  jerseyStripe: {
    width: 13,
    height: 4,
    marginTop: 20,
    borderRadius: THEME.radius.xs,
    backgroundColor: THEME.colors.card,
    opacity: 0.65
  },
  receipt: {
    position: 'absolute',
    top: 12,
    left: 53,
    width: 57,
    height: 86,
    borderRadius: THEME.radius.sm,
    padding: 10,
    paddingTop: 21,
    gap: 6,
    backgroundColor: THEME.colors.secondary,
    transform: [{ rotate: '-10deg' }]
  },
  receiptLine: {
    height: 4,
    borderRadius: THEME.radius.xs,
    backgroundColor: THEME.colors.card,
    opacity: 0.55
  },
  receiptLineShort: { width: '64%' },
  coin: {
    position: 'absolute',
    top: 56,
    left: 93,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: THEME.radius.full,
    borderWidth: 2,
    borderColor: THEME.colors.background,
    backgroundColor: THEME.colors.primary
  },
  coinLabel: {
    ...THEME.typography.button,
    color: THEME.colors.textOnPrimary
  },
  calendar: {
    position: 'absolute',
    top: 23,
    left: 39,
    width: 76,
    height: 67,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: THEME.colors.borderStrong,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.cardElevated,
    transform: [{ rotate: '-8deg' }]
  },
  calendarPin: {
    position: 'absolute',
    top: -7,
    width: 5,
    height: 13,
    borderRadius: THEME.radius.xs,
    backgroundColor: THEME.colors.secondary
  },
  leftCalendarPin: { left: 17 },
  rightCalendarPin: { right: 17 },
  calendarDivider: {
    alignSelf: 'stretch',
    marginTop: 14,
    borderBottomWidth: 2,
    borderBottomColor: THEME.colors.borderStrong
  },
  calendarCheck: {
    width: 24,
    height: 13,
    marginTop: 13,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    borderColor: THEME.colors.primary,
    transform: [{ rotate: '-41deg' }]
  },
  slideTitle: {
    ...THEME.typography.h2,
    color: THEME.colors.text,
    textAlign: 'center',
    marginHorizontal: GUTTER,
    marginTop: GRID * 2,
    marginBottom: GRID * 0.75
  },
  slideDescription: {
    ...THEME.typography.body,
    fontSize: 16,
    lineHeight: 24,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 384,
    paddingHorizontal: GUTTER,
    minHeight: 48
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: GRID / 2,
    marginBottom: GRID * 1.75
  },
  indicator: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: THEME.radius.md
  },
  indicatorPressed: {
    backgroundColor: THEME.colors.cardElevated,
    transform: [{ scale: 0.98 }]
  },
  indicatorHighlighted: { backgroundColor: THEME.colors.cardElevated },
  dot: {
    width: GRID,
    height: GRID,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.textMuted
  },
  activeDot: {
    width: GRID * 2.5,
    backgroundColor: THEME.colors.primary
  },
  actions: {
    gap: GRID * 2
  },
  secondaryButton: {
    backgroundColor: THEME.colors.background
  }
});
