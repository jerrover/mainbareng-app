import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Keyboard,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { THEME } from '../theme';
import { MainTabParamList } from '../navigation/types';
import BentoCard from '../components/BentoCard';
import CustomAlertModal, { AlertType } from '../components/CustomAlertModal';
import { api, ApiVenue } from '../services/api';
import { supabase } from '../services/supabase';

type Props = BottomTabScreenProps<MainTabParamList, 'Venues'>;

// Fallback jika API sedang offline / belum ada koneksi
const FALLBACK_VENUES: ApiVenue[] = [
  {
    id: 'fallback-v1',
    name: 'GOR Candra Wijaya International Badminton Centre',
    address: 'Jl. Jelupang Utama No.15, Serpong Utara',
    city: 'Tangerang Selatan',
    category: 'sports',
    supported_activities: ['badminton'],
    rate_hourly_min: 75000,
    rate_hourly_max: 120000,
    contact_whatsapp: '6281298765431',
    maps_url: 'https://maps.google.com/?q=GOR+Candra+Wijaya',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'fallback-v2',
    name: 'Lapangan Cakra Futsal Gading Serpong',
    address: 'Jl. Boulevard Raya Gading Serpong Kav. M5',
    city: 'Tangerang',
    category: 'sports',
    supported_activities: ['futsal'],
    rate_hourly_min: 150000,
    rate_hourly_max: 220000,
    contact_whatsapp: '6281234567890',
    maps_url: 'https://maps.google.com/?q=Cakra+Futsal',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'fallback-v3',
    name: 'The Hawk Basketball Stadium',
    address: 'Jl. Alam Sutera Boulevard Kav. 21',
    city: 'Tangerang Selatan',
    category: 'sports',
    supported_activities: ['basket'],
    rate_hourly_min: 200000,
    rate_hourly_max: 300000,
    contact_whatsapp: '628118899001',
    maps_url: 'https://maps.google.com/?q=The+Hawk+Stadium',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'fallback-v4',
    name: 'King Kong Arena Mini Soccer',
    address: 'Kawasan Danau Biru, Cisauk, Tangerang',
    city: 'Tangerang',
    category: 'sports',
    supported_activities: ['futsal', 'mini_soccer'],
    rate_hourly_min: 350000,
    rate_hourly_max: 500000,
    contact_whatsapp: '6281311223344',
    maps_url: 'https://maps.google.com/?q=King+Kong+Arena',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const SPORT_FILTERS = ['Semua', 'Futsal', 'Badminton', 'Basket'] as const;
const FACILITY_PREVIEW_COUNT = 3;

function formatHourlyPrice(min: number, max: number): string | null {
  if (!min && !max) return null;
  const price = `IDR ${min.toLocaleString('id-ID')}`;
  return max > min ? `${price}–${max.toLocaleString('id-ID')}` : price;
}

function getSportLabel(activities: string[]): string {
  if (activities.length === 0) return 'Multi-Sport';
  return activities.map((activity) => {
    const name = activity.toLowerCase();
    if (name.includes('futsal')) return 'Futsal';
    if (name.includes('badminton')) return 'Badminton';
    if (name.includes('basket')) return 'Basket';
    if (name.includes('mini_soccer')) return 'Mini Soccer';
    return activity.toUpperCase();
  }).join(' & ');
}

function getFacilities(activities: string[]): string[] {
  const common = ['Parkir', 'Kantin', 'Ruang ganti'];
  const sports = activities.map((activity) => activity.toLowerCase());
  if (sports.some((sport) => sport.includes('badminton'))) return [...common, 'Karpet standar BWF'];
  if (sports.some((sport) => sport.includes('futsal'))) return [...common, 'Lapangan vinyl'];
  if (sports.some((sport) => sport.includes('basket'))) return [...common, 'Ring standar FIBA'];
  return [...common, 'WiFi'];
}

const ICON_PATHS = {
  search: 'M16 16l4 4M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z',
  close: 'm6 6 12 12M18 6 6 18',
  pin: 'M20 10c0 6-8 11-8 11s-8-5-8-11a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  verified: 'M12 2.5 15 4l3.4.6.6 3.4 1.5 3-1.5 3-.6 3.4-3.4.6-3 1.5-3-1.5-3.4-.6L5 14l-1.5-3L5 8l.6-3.4L9 4l3-1.5ZM8.5 11l2.5 2.5 4.5-4.5',
  star: 'm12 3 2.7 5.6 6.2.9-4.5 4.4 1 6.1-5.4-2.9L6.6 20l1-6.1-4.5-4.4 6.2-.9L12 3Z',
  arrow: 'M6 18 18 6M8 6h10v10',
  chat: 'M20.5 11.5a8.5 8.5 0 0 1-12.2 7.7L4 20.5l1.3-4.3A8.5 8.5 0 1 1 20.5 11.5Z'
} as const;

function VenueIcon({ name, color = THEME.colors.textSecondary, size = 16 }: {
  name: keyof typeof ICON_PATHS;
  color?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path
        d={ICON_PATHS[name]}
        fill={name === 'star' ? color : 'none'}
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const COURT_DETAILS = {
  futsal: <Circle cx={12} cy={8} r={3} />,
  badminton: <Path d="M6.5 2v12m11-12v12" />,
  basket: <Rect x={4} y={4} width={16} height={8} rx={4} />
};

function VenueCourt({ activities }: { activities: string[] }) {
  const sport = activities
    .map((activity) => activity.match(/futsal|soccer|badminton|basket/i)?.[0].toLowerCase())
    .find(Boolean);
  let detail: React.ReactNode = null;
  if (sport === 'badminton' || sport === 'basket') detail = COURT_DETAILS[sport];
  if (sport === 'futsal' || sport === 'soccer') detail = COURT_DETAILS.futsal;

  return (
    <View style={styles.sportMark} accessible={false}>
      <Svg width={24} height={16} viewBox="0 0 24 16" fill="none" stroke={THEME.colors.primary} strokeWidth={1.25}>
        <Rect x={1} y={2} width={22} height={12} rx={1.5} />
        <Line x1={12} y1={2} x2={12} y2={14} />
        {detail}
      </Svg>
    </View>
  );
}

export default function VenuesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const compact = width <= 355;
  const listRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const searchRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [venues, setVenues] = useState<ApiVenue[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [selectedFilter, setSelectedFilter] = useState<(typeof SPORT_FILTERS)[number]>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [facilityDetails, setFacilityDetails] = useState<{ venue: string; items: string[] } | null>(null);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: ''
  });

  const showAlert = (type: AlertType, title: string, message: string) => {
    setAlertConfig({ visible: true, type, title, message });
  };

  const closeAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  // 1. Fetch Venues from Real API
  const fetchVenues = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const data = await api.getVenues();
      if (data && Array.isArray(data) && data.length > 0) {
        setVenues(data);
      } else {
        setVenues(FALLBACK_VENUES);
      }
    } catch (err) {
      console.warn('[VenuesScreen] Gagal memuat venues dari API, menggunakan fallback:', err);
      setVenues(FALLBACK_VENUES);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Inisialisasi awal
  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  // Real-time listener: dengarkan perubahan tabel venues di Supabase
  useEffect(() => {
    const channel = supabase
      .channel('venues-live-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'venues' },
        () => {
          fetchVenues(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchVenues]);

  // Filtering data
  const filteredVenues = useMemo(() => {
    return venues.filter((v) => {
      // Filter kategori olahraga
      const acts = v.supported_activities?.map((a) => a.toLowerCase()) || [];
      const matchesFilter =
        selectedFilter === 'Semua' ||
        (selectedFilter === 'Futsal' && acts.some((a) => a.includes('futsal') || a.includes('soccer'))) ||
        (selectedFilter === 'Badminton' && acts.some((a) => a.includes('badminton'))) ||
        (selectedFilter === 'Basket' && acts.some((a) => a.includes('basket')));

      // Filter pencarian
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        v.name.toLowerCase().includes(query) ||
        v.address.toLowerCase().includes(query) ||
        v.city.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [venues, selectedFilter, searchQuery]);

  // Action handlers
  const handleOpenWhatsApp = (name: string, phone: string) => {
    if (!phone) {
      showAlert('info', 'Kontak WhatsApp', `Nomor WhatsApp belum tersedia untuk ${name}.`);
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}?text=Halo%20${encodeURIComponent(name)},%20saya%20ingin%20tanya%20jadwal%20booking%20lapangan%20lewat%20aplikasi%20Mabar.`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          showAlert('info', 'Kontak WhatsApp', `Hubungi pengelola ${name} di nomor WhatsApp: +${cleanPhone}`);
        }
      })
      .catch(() => {
        showAlert('info', 'Kontak WhatsApp', `Hubungi pengelola ${name} di nomor WhatsApp: +${cleanPhone}`);
      });
  };

  const handleOpenMaps = (name: string, mapsUrl: string | null) => {
    if (mapsUrl) {
      Linking.openURL(mapsUrl).catch(() => {
        showAlert('info', 'Lokasi Maps', `Membuka peta Google Maps untuk ${name}.`);
      });
    } else {
      showAlert('info', 'Lokasi Maps', `Tautan Google Maps untuk ${name} belum tersedia.`);
    }
  };

  const updateSearch = (query: string) => {
    setSearchQuery(query);
    listRef.current?.scrollTo({ y: 0, animated: false });
  };

  const closeFacilities = () => setFacilityDetails(null);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">Daftar Venue</Text>
        <View style={styles.region}>
          <VenueIcon name="pin" size={14} color={THEME.colors.primary} />
          <Text style={styles.regionText}>Jabodetabek</Text>
        </View>

        <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
          <VenueIcon name="search" size={18} />
          <TextInput
            ref={searchRef}
            style={styles.searchInput}
            accessibilityLabel="Cari nama venue atau area"
            placeholder="Cari nama venue atau area"
            placeholderTextColor={THEME.colors.textMuted}
            selectionColor={THEME.colors.primary}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            value={searchQuery}
            onChangeText={updateSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchQuery.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hapus pencarian"
              style={styles.iconTarget}
              onPress={() => {
                updateSearch('');
                searchRef.current?.focus();
              }}
            >
              <VenueIcon name="close" />
            </Pressable>
          )}
        </View>

        <View style={styles.filters}>
          {SPORT_FILTERS.map((sport) => {
            const selected = selectedFilter === sport;
            return (
              <Pressable
                key={sport}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={styles.filterTarget}
                onPress={() => {
                  setSelectedFilter(sport);
                  listRef.current?.scrollTo({ y: 0, animated: false });
                }}
              >
                <View style={[styles.filterChip, selected && styles.filterChipSelected]}>
                  <Text style={[styles.filterLabel, selected && styles.filterLabelSelected]}>{sport}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        ref={listRef}
        style={styles.scroll}
        contentContainerStyle={styles.catalog}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchVenues(true)}
            tintColor={THEME.colors.primary}
            colors={[THEME.colors.primary]}
          />
        }
      >
        {isLoading ? (
          <View style={styles.catalogState} accessibilityLiveRegion="polite">
            <ActivityIndicator color={THEME.colors.primary} />
            <Text style={styles.stateDescription}>Memuat katalog venue...</Text>
          </View>
        ) : (
          <>
            <View style={styles.resultCount}>
              <Text style={styles.resultCountText} accessibilityLiveRegion="polite">
                {filteredVenues.length} venue
              </Text>
              <View style={styles.resultRule} />
            </View>

            {filteredVenues.length === 0 ? (
              <View style={styles.catalogState}>
                <Text style={styles.emptyTitle} accessibilityRole="header">Venue belum ditemukan</Text>
                <Text style={styles.stateDescription}>Coba nama atau area lain, atau ubah filter olahraga.</Text>
              </View>
            ) : (
              <View style={styles.venueList}>
                {filteredVenues.map((item) => {
                  const activities = item.supported_activities ?? [];
                  const facilities = getFacilities(activities);
                  const price = formatHourlyPrice(item.rate_hourly_min, item.rate_hourly_max);
                  const city = item.city || 'Tangerang';

                  return (
                    <BentoCard
                      key={item.id}
                      accentColor={null}
                      padded={false}
                      style={[styles.venueCard, compact && styles.venueCardCompact]}
                    >
                      <View style={styles.venueMeta}>
                        <VenueCourt activities={activities} />
                        <View style={styles.sportInfo}>
                          <Text style={styles.sportLabel}>{getSportLabel(activities)}</Text>
                          <View style={styles.verification}>
                            <VenueIcon name="verified" size={13} color={THEME.colors.success} />
                            <Text style={styles.verificationText}>Terverifikasi</Text>
                          </View>
                        </View>
                        <View style={styles.rating} accessible accessibilityLabel="Rating 4,9">
                          <VenueIcon name="star" size={14} color={THEME.colors.primary} />
                          <Text style={styles.ratingText}>4,9</Text>
                        </View>
                      </View>

                      <Text style={styles.venueName} accessibilityRole="header">{item.name}</Text>
                      <Pressable
                        accessibilityRole="link"
                        accessibilityLabel={'Lokasi ' + item.name + ', ' + [item.address, city].filter(Boolean).join(', ')}
                        accessibilityHint="Buka Google Maps"
                        onPress={() => handleOpenMaps(item.name, item.maps_url)}
                        style={({ pressed }) => [styles.venueLocation, pressed && styles.pressed]}
                      >
                        <VenueIcon name="pin" size={15} />
                        <View style={styles.address}>
                          <Text style={styles.addressText}>{item.address}</Text>
                          <Text style={styles.cityText}>{city}</Text>
                        </View>
                        <VenueIcon name="arrow" size={15} color={THEME.colors.textMuted} />
                      </Pressable>

                      <View style={styles.facilities}>
                        <Text style={styles.facilitySummary}>{facilities.slice(0, FACILITY_PREVIEW_COUNT).join(' · ')}</Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={'Lihat semua fasilitas ' + item.name}
                          onPress={() => {
                            Keyboard.dismiss();
                            setFacilityDetails({ venue: item.name, items: facilities });
                          }}
                          style={({ pressed }) => [styles.facilitiesTarget, pressed && styles.pressed]}
                        >
                          <Text style={styles.facilityCount}>+{facilities.length - FACILITY_PREVIEW_COUNT}</Text>
                        </Pressable>
                      </View>

                      <View style={[
                        styles.venueFooter,
                        compact && styles.venueFooterCompact,
                        fontScale >= 1.5 && styles.venueFooterStacked
                      ]}>
                        <View style={styles.price}>
                          <Text style={[styles.priceText, compact && styles.priceTextCompact]}>
                            {price ?? 'Hubungi venue'}
                          </Text>
                          {price !== null && <Text style={styles.priceUnit}>per jam</Text>}
                        </View>
                        <View style={styles.actions}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={'Chat pengelola ' + item.name}
                            onPress={() => handleOpenWhatsApp(item.name, item.contact_whatsapp)}
                            style={({ pressed }) => [styles.iconTarget, styles.chatButton, pressed && styles.pressed]}
                          >
                            <VenueIcon name="chat" />
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={'Buat sesi di ' + item.name}
                            onPress={() =>
                              navigation.navigate('Create', {
                                preselectedVenueId: item.id,
                                preselectedVenueName: item.name,
                                preselectedRate: item.rate_hourly_min
                              })
                            }
                            style={({ pressed }) => [
                              styles.createButton,
                              compact && styles.createButtonCompact,
                              pressed && styles.createButtonPressed
                            ]}
                          >
                            <Text style={styles.createButtonText}>Buat sesi</Text>
                            {!compact && <VenueIcon name="arrow" size={14} color={THEME.colors.textOnPrimary} />}
                          </Pressable>
                        </View>
                      </View>
                    </BentoCard>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {facilityDetails && (
        <Modal transparent visible animationType="fade" onRequestClose={closeFacilities}>
          <View style={[styles.sheetOverlay, { paddingBottom: Math.max(insets.bottom, GRID) }]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              accessible={false}
              importantForAccessibility="no"
              onPress={closeFacilities}
            />
            <View style={styles.sheet} accessibilityViewIsModal onAccessibilityEscape={closeFacilities}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle} accessibilityRole="header">Fasilitas venue</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Tutup fasilitas"
                  style={styles.iconTarget}
                  onPress={closeFacilities}
                >
                  <VenueIcon name="close" />
                </Pressable>
              </View>
              <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent}>
                <Text style={styles.sheetVenue}>{facilityDetails.venue}</Text>
                {facilityDetails.items.map((facility) => (
                  <View key={facility} style={styles.sheetFacility}>
                    <Text accessible={false} importantForAccessibility="no" style={styles.sheetFacilityText}>•</Text>
                    <Text style={styles.sheetFacilityText}>{facility}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      <CustomAlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onPrimaryPress={closeAlert}
        onClose={closeAlert}
      />
    </SafeAreaView>
  );
}

const GRID = THEME.spatial.gridUnit;
const TOUCH_TARGET = THEME.components.fabButton.height;
const textSmall = { ...THEME.typography.bodySmall, fontSize: THEME.typography.caption.fontSize };

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background
  },
  header: {
    paddingHorizontal: THEME.spatial.screenPaddingHorizontal,
    paddingTop: GRID * 3,
    paddingBottom: GRID / 2
  },
  headerTitle: {
    ...THEME.typography.h1,
    color: THEME.colors.text
  },
  region: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: GRID / 2
  },
  regionText: {
    ...THEME.typography.body,
    color: THEME.colors.textSecondary
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID,
    minHeight: THEME.components.buttonPrimary.height,
    marginTop: GRID * 2,
    marginBottom: GRID,
    paddingLeft: GRID * 1.5,
    paddingRight: GRID / 2,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: THEME.radius.md
  },
  searchBarFocused: {
    borderColor: THEME.colors.borderActive
  },
  searchInput: {
    ...THEME.typography.body,
    flex: 1,
    minWidth: 0,
    minHeight: TOUCH_TARGET,
    paddingVertical: GRID,
    fontSize: THEME.typography.cardTitle.fontSize,
    lineHeight: THEME.typography.cardTitle.lineHeight,
    color: THEME.colors.text
  },
  iconTarget: {
    flexShrink: 0,
    minWidth: TOUCH_TARGET,
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center'
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  filterTarget: {
    flexGrow: 1,
    minHeight: TOUCH_TARGET,
    justifyContent: 'center'
  },
  filterChip: {
    minHeight: GRID * 4,
    paddingHorizontal: GRID,
    paddingVertical: GRID / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: THEME.radius.md
  },
  filterChipSelected: {
    backgroundColor: THEME.colors.primaryMuted,
    borderColor: THEME.colors.primaryBorder
  },
  filterLabel: {
    ...THEME.typography.bodySmall,
    fontFamily: THEME.typography.fonts.semiBold,
    color: THEME.colors.textSecondary
  },
  filterLabelSelected: {
    color: THEME.colors.primary
  },
  scroll: {
    flex: 1
  },
  catalog: {
    flexGrow: 1,
    paddingHorizontal: THEME.spatial.screenPaddingHorizontal,
    paddingTop: GRID / 2,
    paddingBottom: GRID * 2
  },
  catalogState: {
    alignItems: 'center',
    gap: GRID / 2,
    paddingHorizontal: GRID,
    paddingVertical: GRID * 3
  },
  emptyTitle: {
    ...THEME.typography.cardTitle,
    color: THEME.colors.text,
    textAlign: 'center'
  },
  stateDescription: {
    ...THEME.typography.bodySmall,
    color: THEME.colors.textSecondary,
    textAlign: 'center'
  },
  resultCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID * 1.5,
    marginBottom: GRID * 1.5
  },
  resultCountText: {
    ...THEME.typography.bodySmall,
    fontFamily: THEME.typography.fonts.semiBold,
    color: THEME.colors.textSecondary
  },
  resultRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: THEME.colors.border
  },
  venueList: {
    gap: GRID * 1.5
  },
  venueCard: {
    padding: 14
  },
  venueCardCompact: {
    paddingHorizontal: GRID * 1.5
  },
  venueMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID,
    marginBottom: GRID
  },
  sportMark: {
    width: 38,
    height: 38,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: THEME.radius.sm,
    borderTopLeftRadius: THEME.radius.lg,
    backgroundColor: THEME.colors.primaryMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: THEME.colors.primaryMuted
  },
  sportInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  sportLabel: {
    ...THEME.typography.bodySmall,
    fontFamily: THEME.typography.fonts.semiBold,
    color: THEME.colors.textSecondary
  },
  verification: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID / 2
  },
  verificationText: {
    ...textSmall,
    flexShrink: 1,
    color: THEME.colors.success
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID / 2
  },
  ratingText: {
    ...THEME.typography.bodySmall,
    fontFamily: THEME.typography.fonts.bold,
    color: THEME.colors.text
  },
  venueName: {
    ...THEME.typography.cardTitle,
    color: THEME.colors.text
  },
  venueLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TOUCH_TARGET,
    gap: GRID,
    paddingVertical: GRID / 2
  },
  address: {
    flex: 1,
    minWidth: 0
  },
  addressText: {
    ...THEME.typography.bodySmall,
    color: THEME.colors.textSecondary
  },
  cityText: {
    ...textSmall,
    color: THEME.colors.textMuted
  },
  facilities: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TOUCH_TARGET,
    gap: GRID / 2
  },
  facilitySummary: {
    ...textSmall,
    flex: 1,
    color: THEME.colors.textSecondary
  },
  facilitiesTarget: {
    minWidth: TOUCH_TARGET,
    minHeight: TOUCH_TARGET,
    alignItems: 'flex-end',
    justifyContent: 'center'
  },
  facilityCount: {
    ...THEME.typography.caption,
    minWidth: GRID * 4,
    paddingHorizontal: GRID / 2,
    paddingVertical: 2,
    color: THEME.colors.textSecondary,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: THEME.radius.sm,
    textAlign: 'center'
  },
  venueFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: THEME.colors.border
  },
  venueFooterCompact: {
    gap: GRID / 2
  },
  venueFooterStacked: {
    flexDirection: 'column',
    alignItems: 'stretch'
  },
  price: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0
  },
  priceText: {
    ...THEME.typography.body,
    fontFamily: THEME.typography.fonts.bold,
    color: THEME.colors.text
  },
  priceTextCompact: {
    fontSize: THEME.typography.bodySmall.fontSize
  },
  priceUnit: {
    ...textSmall,
    color: THEME.colors.textMuted
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6
  },
  chatButton: {
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder
  },
  pressed: {
    opacity: 0.7
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TOUCH_TARGET,
    minWidth: GRID * 11,
    gap: GRID / 2,
    paddingHorizontal: 10,
    paddingVertical: GRID,
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.md
  },
  createButtonCompact: {
    minWidth: 76,
    paddingHorizontal: GRID
  },
  createButtonPressed: {
    backgroundColor: THEME.colors.primaryLight
  },
  createButtonText: {
    ...THEME.typography.bodySmall,
    fontFamily: THEME.typography.fonts.bold,
    color: THEME.colors.textOnPrimary
  },
  sheetOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: THEME.colors.overlay,
    paddingHorizontal: GRID
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    paddingHorizontal: GRID * 2,
    paddingTop: GRID,
    paddingBottom: GRID * 2,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: THEME.radius.xl
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: GRID
  },
  sheetTitle: {
    ...THEME.typography.h2,
    color: THEME.colors.text,
    flexShrink: 1
  },
  sheetScroll: {
    flexGrow: 0
  },
  sheetContent: {
    gap: GRID / 2
  },
  sheetVenue: {
    ...THEME.typography.subtitle,
    color: THEME.colors.text,
    marginBottom: GRID / 2
  },
  sheetFacility: {
    flexDirection: 'row',
    gap: GRID
  },
  sheetFacilityText: {
    ...THEME.typography.body,
    color: THEME.colors.textSecondary,
    flexShrink: 1
  }
});
