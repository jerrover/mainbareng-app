import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { THEME } from '../theme';
import { MainTabParamList } from '../navigation/types';
import CustomAlertModal, { AlertType } from '../components/CustomAlertModal';

type Props = BottomTabScreenProps<MainTabParamList, 'Venues'>;

interface VenueItem {
  id: string;
  name: string;
  sport: string;
  distance: string;
  area: string;
  rating: string;
  reviewCount: number;
  hourlyPrice: string;
  address: string;
  facilities: string[];
}

export default function VenuesScreen({ navigation }: Props) {
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

  const filterTabs = [
    { id: 'Semua', label: 'Semua Venue (24)' },
    { id: 'Futsal', label: '⚽ Futsal (10)' },
    { id: 'Badminton', label: '🏸 Badminton (8)' },
    { id: 'Basket', label: '🏀 Basket (6)' }
  ];

  const venues: VenueItem[] = [
    {
      id: 'ven-1',
      name: 'GOR Bulungan Arena',
      sport: '⚽ Futsal Vinyl & Rumput',
      distance: '2.4 km',
      area: 'Jaksel',
      rating: '4.8',
      reviewCount: 142,
      hourlyPrice: 'Rp 150.000 / jam',
      address: 'Jl. Bulungan No. 1, Kebayoran Baru, Jakarta Selatan',
      facilities: ['🅿️ Parkir Luas', '🥤 Kantin', '🚿 Locker Room', '❄️ AC/Exhaust']
    },
    {
      id: 'ven-2',
      name: 'Champion Court Gading Serpong',
      sport: '🏸 6 Lapangan Karpet Standar BWF',
      distance: '3.1 km',
      area: 'Tangerang',
      rating: '4.9',
      reviewCount: 98,
      hourlyPrice: 'Rp 75.000 / jam',
      address: 'Kav. Commercial Gading Serpong, Tangerang',
      facilities: ['🅿️ Parkir', '🥤 Kantin', '🚿 Shower', '💡 Lighting Pro']
    },
    {
      id: 'ven-3',
      name: 'Tifosi Sport Center',
      sport: '⚽ 4 Lapangan Vinyl Interlock',
      distance: '3.8 km',
      area: 'Serpong',
      rating: '4.7',
      reviewCount: 210,
      hourlyPrice: 'Rp 150.000 / jam',
      address: 'Jl. Raya Serpong KM 8, Tangerang Selatan',
      facilities: ['🅿️ Parkir Luas', '🥤 Kantin 24 Jam', '🚿 Air Panas', '📶 WiFi']
    }
  ];

  const filteredVenues = venues.filter((v) => {
    const matchesFilter =
      selectedFilter === 'Semua' ||
      v.sport.toLowerCase().includes(selectedFilter.toLowerCase());
    const matchesSearch =
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
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
            <Text style={styles.locationPillText}>📍 Serpong / Jaksel</Text>
          </View>
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

        {/* Venues Card List (Figma 191:32) */}
        <View style={styles.venueList}>
          {filteredVenues.map((item) => (
            <View key={item.id} style={styles.venueCard}>
              {/* Card Banner Header */}
              <View style={styles.cardHeaderBox}>
                <View style={styles.badgeRow}>
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>TERVERIFIKASI ✓</Text>
                  </View>
                  <View style={styles.distanceBadge}>
                    <Text style={styles.distanceText}>
                      📍 {item.distance} · {item.area}
                    </Text>
                  </View>
                </View>

                <View style={[styles.badgeRow, { marginTop: 6 }]}>
                  <View style={styles.sportBadge}>
                    <Text style={styles.sportBadgeText}>{item.sport}</Text>
                  </View>
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>
                      ★ {item.rating} ({item.reviewCount} Ulasan)
                    </Text>
                  </View>
                </View>
              </View>

              {/* Title & Price Row */}
              <View style={styles.venueTitleRow}>
                <Text style={styles.venueName}>{item.name}</Text>
                <Text style={styles.venuePrice}>{item.hourlyPrice}</Text>
              </View>

              {/* Address */}
              <Text style={styles.venueAddress}>{item.address}</Text>

              {/* Facilities Chips */}
              <View style={styles.facilitiesRow}>
                {item.facilities.map((fac, idx) => (
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
                  onPress={() =>
                    showAlert(
                      'info',
                      'Kontak WhatsApp',
                      `Membuka direct chat WhatsApp ke Customer Service pengelola ${item.name}.`
                    )
                  }
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
          ))}
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2
  },
  venueName: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 15,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  venuePrice: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 14,
    color: THEME.colors.primary,
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
