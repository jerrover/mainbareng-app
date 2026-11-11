import React, { useState, useEffect, useCallback } from 'react';
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

type Props = BottomTabScreenProps<MainTabParamList, 'Venues'>;

function getActivityIcon(activity: string): string {
  const a = activity.toLowerCase();
  if (a.includes('futsal') || a.includes('soccer')) return '⚽';
  if (a.includes('badminton')) return '🏸';
  if (a.includes('basket')) return '🏀';
  if (a.includes('esport') || a.includes('game') || a.includes('mlbb')) return '🎮';
  return '🏟️';
}

export default function VenuesScreen({ navigation }: Props) {
  const [venues, setVenues] = useState<ApiVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const loadVenues = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await api.getVenues();
      setVenues(data);
    } catch (err: any) {
      console.warn('[VenuesScreen] Error fetching venues:', err.message);
      setError(err.message || 'Gagal mengambil data venue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadVenues();
  }, [loadVenues]);

  // Handle direct WhatsApp chat
  const handleOpenWhatsApp = (item: ApiVenue) => {
    const rawNumber = item.contact_whatsapp.replace(/\D/g, '');
    const phone = rawNumber.startsWith('0') ? '62' + rawNumber.slice(1) : rawNumber;
    const msg = encodeURIComponent(
      `Halo Admin ${item.name}, saya ingin booking lapangan atau tanya ketersediaan jadwal lewat aplikasi Mabar.`
    );
    const waUrl = `https://wa.me/${phone}?text=${msg}`;

    Linking.canOpenURL(waUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(waUrl);
        } else {
          showAlert(
            'info',
            'Kontak Pengelola',
            `Nomor WhatsApp pengelola ${item.name}: +${phone}`
          );
        }
      })
      .catch(() => {
        showAlert(
          'info',
          'Kontak Pengelola',
          `Nomor WhatsApp pengelola ${item.name}: +${phone}`
        );
      });
  };

  // Handle open Maps
  const handleOpenMaps = (item: ApiVenue) => {
    if (item.maps_url) {
      Linking.openURL(item.maps_url).catch(() => {
        showAlert('warning', 'Tautan Peta', 'Tidak dapat membuka aplikasi peta di perangkat.');
      });
    } else {
      const searchUrl = `https://maps.google.com/?q=${encodeURIComponent(
        `${item.name} ${item.address}`
      )}`;
      Linking.openURL(searchUrl).catch(() => {
        showAlert('warning', 'Tautan Peta', 'Tidak dapat membuka aplikasi peta di perangkat.');
      });
    }
  };

  // Counts for filters
  const futsalCount = venues.filter((v) =>
    v.supported_activities.some((a) => a.includes('futsal') || a.includes('soccer'))
  ).length;
  const badmintonCount = venues.filter((v) =>
    v.supported_activities.some((a) => a.includes('badminton'))
  ).length;
  const basketCount = venues.filter((v) =>
    v.supported_activities.some((a) => a.includes('basket'))
  ).length;

  const filterTabs = [
    { id: 'Semua', label: `Semua Venue (${venues.length})` },
    { id: 'Futsal', label: `⚽ Futsal (${futsalCount})` },
    { id: 'Badminton', label: `🏸 Badminton (${badmintonCount})` },
    { id: 'Basket', label: `🏀 Basket (${basketCount})` }
  ];

  const filteredVenues = venues.filter((v) => {
    const actList = v.supported_activities.map((a) => a.toLowerCase());
    const matchesFilter =
      selectedFilter === 'Semua' ||
      (selectedFilter === 'Futsal' &&
        actList.some((a) => a.includes('futsal') || a.includes('soccer'))) ||
      (selectedFilter === 'Badminton' &&
        actList.some((a) => a.includes('badminton'))) ||
      (selectedFilter === 'Basket' &&
        actList.some((a) => a.includes('basket')));

    const nameStr = (v.name || '').toLowerCase();
    const addrStr = (v.address || '').toLowerCase();
    const cityStr = (v.city || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      !searchQuery ||
      nameStr.includes(query) ||
      addrStr.includes(query) ||
      cityStr.includes(query);

    return matchesFilter && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadVenues(true)}
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
              Pilihan Lapangan Olahraga Terverifikasi
            </Text>
          </View>
          <View style={styles.locationPill}>
            <Text style={styles.locationPillText}>📍 Tangerang & Serpong</Text>
          </View>
        </View>

        {/* Search Bar Container (Figma 191:19) */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama GOR, cabor, area Tangerang..."
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

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
            <Text style={styles.loadingText}>Memuat katalog venue resmi...</Text>
          </View>
        )}

        {/* Error State */}
        {!loading && error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorTitle}>Koneksi API Gagal</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => loadVenues(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.retryBtnText}>Muat Ulang</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty State */}
        {!loading && !error && filteredVenues.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🏟️</Text>
            <Text style={styles.emptyTitle}>Venue Tidak Ditemukan</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `Tidak ada venue yang sesuai dengan pencarian "${searchQuery}"`
                : 'Belum ada venue terdaftar di kategori ini.'}
            </Text>
          </View>
        )}

        {/* Venues Card List (Figma 191:32) */}
        {!loading && !error && (
          <View style={styles.venueList}>
            {filteredVenues.map((item) => {
              const sportsLabel = item.supported_activities
                .map((a) => `${getActivityIcon(a)} ${a.toUpperCase()}`)
                .join(' · ');

              const priceText =
                item.rate_hourly_min === item.rate_hourly_max
                  ? `Rp ${item.rate_hourly_min.toLocaleString('id-ID')} / jam`
                  : `Rp ${item.rate_hourly_min.toLocaleString('id-ID')} - ${item.rate_hourly_max.toLocaleString('id-ID')} / jam`;

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
                        activeOpacity={0.8}
                        onPress={() => handleOpenMaps(item)}
                      >
                        <Text style={styles.distanceText}>
                          📍 {item.city} ↗
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={[styles.badgeRow, { marginTop: 6 }]}>
                      <View style={styles.sportBadge}>
                        <Text style={styles.sportBadgeText}>{sportsLabel}</Text>
                      </View>
                      <View style={styles.ratingBadge}>
                        <Text style={styles.ratingText}>
                          ★ 4.9 (Official Partner)
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Title & Price Row */}
                  <View style={styles.venueTitleRow}>
                    <Text style={styles.venueName} numberOfLines={2}>
                      {item.name}
                    </Text>
                  </View>
                  <Text style={styles.venuePrice}>{priceText}</Text>

                  {/* Address */}
                  <Text style={styles.venueAddress}>
                    {item.address}, {item.city}
                  </Text>

                  {/* Facilities Chips */}
                  <View style={styles.facilitiesRow}>
                    {['🅿️ Parkir Luas', '🥤 Kantin', '🚿 Locker & Toilet', '💡 Lighting Pro'].map(
                      (fac, idx) => (
                        <View key={idx} style={styles.facilityChip}>
                          <Text style={styles.facilityText}>{fac}</Text>
                        </View>
                      )
                    )}
                  </View>

                  {/* Card Action Buttons */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.chatBtn}
                      activeOpacity={0.8}
                      onPress={() => handleOpenWhatsApp(item)}
                    >
                      <Text style={styles.chatBtnText}>💬 Chat WhatsApp</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.useBtn}
                      activeOpacity={0.8}
                      onPress={() => navigation.navigate('Create')}
                    >
                      <Text style={styles.useBtnText}>⚡ Buka Sesi Di Sini</Text>
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
    marginBottom: 14
  },
  titleBox: {
    flex: 1,
    paddingRight: 8
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
    fontSize: 10,
    color: THEME.colors.text,
    includeFontPadding: false
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
  venueTitleRow: {
    marginTop: 2
  },
  venueName: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 15,
    color: THEME.colors.text,
    includeFontPadding: false,
    lineHeight: 20
  },
  venuePrice: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 13,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  venueAddress: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    includeFontPadding: false,
    lineHeight: 16
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
  },

  // State Containers
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 10,
    includeFontPadding: false
  },
  errorContainer: {
    backgroundColor: 'rgba(235, 87, 87, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(235, 87, 87, 0.3)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginVertical: 16
  },
  errorEmoji: {
    fontSize: 28,
    marginBottom: 8
  },
  errorTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 14,
    color: THEME.colors.danger,
    includeFontPadding: false
  },
  errorSubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
    includeFontPadding: false
  },
  retryBtn: {
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  retryBtnText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 12,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  emptyContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 10
  },
  emptyTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 15,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  emptySubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    includeFontPadding: false
  }
});
