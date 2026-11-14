import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { THEME } from '../theme';
import { MainTabParamList } from '../navigation/types';
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

function formatHourlyPrice(min: number, max: number): { formatted: string; isRange: boolean } {
  if (!min && !max) return { formatted: 'Hubungi Venue', isRange: false };
  if (min === max || !max || max <= min) {
    return { formatted: `Rp ${min.toLocaleString('id-ID')} / jam`, isRange: false };
  }
  return {
    formatted: `Rp ${min.toLocaleString('id-ID')} - ${max.toLocaleString('id-ID')} / jam`,
    isRange: true
  };
}

function getSportBadgeLabel(activities: string[] = []): string {
  if (!activities || activities.length === 0) return '🏅 Multi-Sport';
  const labels: string[] = [];
  activities.forEach((act) => {
    const a = act.toLowerCase();
    if (a.includes('futsal')) labels.push('⚽ Futsal');
    else if (a.includes('badminton')) labels.push('🏸 Badminton');
    else if (a.includes('basket')) labels.push('🏀 Basket');
    else if (a.includes('mini_soccer')) labels.push('⚽ Mini Soccer');
    else labels.push(act.toUpperCase());
  });
  return labels.join(' & ');
}

function getFacilities(activities: string[] = []): string[] {
  const common = ['🅿️ Parkir', '🥤 Kantin', '🚿 Ruang Ganti'];
  if (activities.some((a) => a.includes('badminton'))) {
    return [...common, '💡 Karpet Standar BWF'];
  }
  if (activities.some((a) => a.includes('futsal'))) {
    return [...common, '🥅 Lapangan Vinyl'];
  }
  if (activities.some((a) => a.includes('basket'))) {
    return [...common, '🏀 Ring Standar FIBA'];
  }
  return [...common, '📶 WiFi'];
}

export default function VenuesScreen({ navigation }: Props) {
  const [venues, setVenues] = useState<ApiVenue[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);

  const [selectedFilter, setSelectedFilter] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');

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
        setIsLiveConnected(true);
      } else {
        setVenues(FALLBACK_VENUES);
        setIsLiveConnected(false);
      }
    } catch (err) {
      console.warn('[VenuesScreen] Gagal memuat venues dari API, menggunakan fallback:', err);
      setVenues(FALLBACK_VENUES);
      setIsLiveConnected(false);
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

  // Hitung jumlah venue per filter tab secara dinamis
  const filterCounts = useMemo(() => {
    const all = venues.length;
    let futsal = 0;
    let badminton = 0;
    let basket = 0;

    venues.forEach((v) => {
      const acts = v.supported_activities?.map((a) => a.toLowerCase()) || [];
      if (acts.some((a) => a.includes('futsal') || a.includes('soccer'))) futsal++;
      if (acts.some((a) => a.includes('badminton'))) badminton++;
      if (acts.some((a) => a.includes('basket'))) basket++;
    });

    return { all, futsal, badminton, basket };
  }, [venues]);

  const filterTabs = [
    { id: 'Semua', label: `Semua Venue (${filterCounts.all})` },
    { id: 'Futsal', label: `⚽ Futsal (${filterCounts.futsal})` },
    { id: 'Badminton', label: `🏸 Badminton (${filterCounts.badminton})` },
    { id: 'Basket', label: `🏀 Basket (${filterCounts.basket})` }
  ];

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchVenues(true)}
            tintColor={THEME.colors.primary}
            colors={[THEME.colors.primary]}
          />
        }
      >
        {/* Top App Bar (Figma SCR-10 191:13) */}
        <View style={styles.topAppBar}>
          <View style={styles.titleBox}>
            <Text style={styles.headerTitle}>Katalog Venue & GOR</Text>
            <Text style={styles.headerSubtitle}>
              Pilihan Lapangan Olahraga Terverifikasi di Database
            </Text>
          </View>
          <View style={styles.locationPill}>
            <Text style={styles.locationPillText}>📍 Jabodetabek</Text>
          </View>
        </View>

        {/* Live Database Indicator */}
        <View style={styles.liveIndicatorRow}>
          <View
            style={[
              styles.liveDot,
              { backgroundColor: isLiveConnected ? THEME.colors.success : THEME.colors.warning }
            ]}
          />
          <Text style={styles.liveIndicatorText}>
            {isLiveConnected ? 'Connected to Database' : 'Offline Mode (Fallback Data)'}
          </Text>
        </View>

        {/* Search Bar Container (Figma 191:19) */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama GOR, area, fasilitas..."
            placeholderTextColor={THEME.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Chips Row (Figma 191:23) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {filterTabs.map((tab) => {
            const isActive = selectedFilter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                activeOpacity={0.7}
                onPress={() => setSelectedFilter(tab.id)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Loading Indicator */}
        {isLoading && !isRefreshing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
            <Text style={styles.loadingText}>Memuat katalog venue dari database...</Text>
          </View>
        )}

        {/* Empty State */}
        {!isLoading && filteredVenues.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏟️</Text>
            <Text style={styles.emptyTitle}>Venue Tidak Ditemukan</Text>
            <Text style={styles.emptySubtitle}>
              Tidak ada lapangan yang cocok dengan pencarian "{searchQuery}".
            </Text>
          </View>
        )}

        {/* Venues Card List (Figma 191:32) */}
        {!isLoading && (
          <View style={styles.venueList}>
            {filteredVenues.map((item) => {
              const priceInfo = formatHourlyPrice(item.rate_hourly_min, item.rate_hourly_max);
              const sportLabel = getSportBadgeLabel(item.supported_activities);
              const facilities = getFacilities(item.supported_activities);

              return (
                <View key={item.id} style={styles.venueCard}>
                  {/* Card Banner Header */}
                  <View style={styles.cardHeaderBox}>
                    <View style={styles.badgeRow}>
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedText}>TERVERIFIKASI ✓</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.distanceBadge}
                        onPress={() => handleOpenMaps(item.name, item.maps_url)}
                      >
                        <Text style={styles.distanceText}>
                          📍 {item.city || 'Tangerang'} · Maps ↗
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={[styles.badgeRow, { marginTop: 6 }]}>
                      <View style={styles.sportBadge}>
                        <Text style={styles.sportBadgeText}>{sportLabel}</Text>
                      </View>
                      <View style={styles.ratingBadge}>
                        <Text style={styles.ratingText}>★ 4.9 (Teruji)</Text>
                      </View>
                    </View>
                  </View>

                  {/* Title & Price Row (Fully Responsive, Anti-Clipping) */}
                  <View style={styles.venueTitleRow}>
                    <View style={styles.venueNameBox}>
                      <Text style={styles.venueName} numberOfLines={2}>
                        {item.name}
                      </Text>
                    </View>
                    <View style={styles.venuePriceBox}>
                      <Text style={styles.venuePriceText} numberOfLines={2}>
                        {priceInfo.formatted}
                      </Text>
                    </View>
                  </View>

                  {/* Address */}
                  <Text style={styles.venueAddress} numberOfLines={2}>
                    {item.address}
                  </Text>

                  {/* Facilities Chips */}
                  <View style={styles.facilitiesRow}>
                    {facilities.map((fac, idx) => (
                      <View key={idx} style={styles.facilityChip}>
                        <Text style={styles.facilityText}>{fac}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Card Action Buttons */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.chatBtn}
                      activeOpacity={0.8}
                      onPress={() => handleOpenWhatsApp(item.name, item.contact_whatsapp)}
                    >
                      <Text style={styles.chatBtnText}>💬 Chat Pengelola</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.useBtn}
                      activeOpacity={0.8}
                      onPress={() => navigation.navigate('Create')}
                    >
                      <Text style={styles.useBtnText}>⚡ Pakai Buat Sesi</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Custom Alert Modal */}
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

  // Top App Bar (Figma SCR-10 191:13)
  topAppBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  titleBox: {
    flex: 1
  },
  headerTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 20,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  headerSubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    includeFontPadding: false
  },
  locationPill: {
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  locationPillText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.text,
    includeFontPadding: false
  },

  // Live Database Indicator
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 2
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5
  },
  liveIndicatorText: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 10,
    color: THEME.colors.textSecondary
  },

  // Search Bar (Figma 191:19)
  searchBar: {
    height: 42,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 12
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: THEME.colors.text,
    includeFontPadding: false,
    paddingVertical: 0
  },

  // Filter Chips Row (Figma 191:23)
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 14
  },
  filterChip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center'
  },
  filterChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary
  },
  filterChipText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  filterChipTextActive: {
    color: THEME.colors.textOnPrimary
  },

  // Loading & Empty States
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  loadingText: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 12,
    color: THEME.colors.textSecondary
  },
  emptyContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    marginTop: 8
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12
  },
  emptyTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 16,
    color: THEME.colors.text,
    marginBottom: 6
  },
  emptySubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18
  },

  // Venue Cards (Figma 191:32)
  venueList: {
    gap: 14
  },
  venueCard: {
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: 14,
    padding: 12,
    gap: 8
  },
  cardHeaderBox: {
    backgroundColor: THEME.colors.cardElevated,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(192, 194, 184, 0.15)'
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  verifiedBadge: {
    backgroundColor: THEME.colors.success,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  verifiedText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 9,
    color: THEME.colors.textOnPrimary,
    includeFontPadding: false
  },
  distanceBadge: {
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  distanceText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  sportBadge: {
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  sportBadgeText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 9,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  ratingBadge: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  ratingText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textOnPrimary,
    includeFontPadding: false
  },

  // Responsive Title & Price Layout (Fixes Clipping)
  venueTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 2
  },
  venueNameBox: {
    flex: 1
  },
  venueName: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 14,
    color: THEME.colors.text,
    lineHeight: 19,
    includeFontPadding: false
  },
  venuePriceBox: {
    flexShrink: 0,
    alignItems: 'flex-end',
    maxWidth: '48%'
  },
  venuePriceText: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 12,
    color: THEME.colors.primary,
    textAlign: 'right',
    lineHeight: 17,
    includeFontPadding: false
  },
  venueAddress: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  facilitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2
  },
  facilityChip: {
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: 'rgba(192, 194, 184, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4
  },
  facilityText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 9,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 6
  },
  chatBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center'
  },
  chatBtnText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  useBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  useBtnText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 11,
    color: THEME.colors.textOnPrimary,
    includeFontPadding: false
  }
});
