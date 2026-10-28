import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { THEME } from '../theme';

export default function ExploreScreen({ navigation }) {
  // Mock data session mabar
  const sessions = [
    {
      id: 'ses-1',
      title: 'Futsal Santai 5v5 Malam Ini',
      activity: 'Futsal',
      venue: 'Tifosi Sport Center',
      time: 'Hari ini · 19:00 - 21:00',
      slots: '8/10 Terisi',
      minKarma: 70,
      cost: 'Rp 35.000 / slot'
    },
    {
      id: 'ses-2',
      title: 'Badminton Ganda Men/Mix intermediate',
      activity: 'Badminton',
      venue: 'Champion Court Gading Serpong',
      time: 'Besok · 08:00 - 10:00',
      slots: '3/4 Terisi',
      minKarma: 80,
      cost: 'Rp 25.000 / slot'
    },
    {
      id: 'ses-3',
      title: 'Custom Match MLBB Mythic Only',
      activity: 'MLBB',
      venue: 'Online Room Discord',
      time: 'Sabtu · 20:00 WIB',
      slots: '9/10 Terisi',
      minKarma: 85,
      cost: 'Gratis'
    }
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroSection}>
        <Text style={styles.headerTitle}>JELAJAH SESI</Text>
        <Text style={styles.headerSubtitle}>Temukan sesi mabar terdekat tanpa drama no-show.</Text>
      </View>

      {/* Filter Chips */}
      <View style={styles.chipRow}>
        <TouchableOpacity style={[styles.chip, styles.chipActive]}>
          <Text style={[styles.chipText, styles.chipTextActive]}>Semua</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chip}>
          <Text style={styles.chipText}>⚽ Futsal</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chip}>
          <Text style={styles.chipText}>🏸 Badminton</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chip}>
          <Text style={styles.chipText}>🎮 MLBB</Text>
        </TouchableOpacity>
      </View>

      {/* Session Cards */}
      <View style={styles.cardList}>
        {sessions.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Lobby', { sessionId: item.id, sessionTitle: item.title })}
          >
            <View style={styles.cardTop}>
              <View style={styles.activityBadge}>
                <Text style={styles.activityBadgeText}>{item.activity}</Text>
              </View>
              <Text style={styles.karmaBadge}>Min Karma: {item.minKarma}</Text>
            </View>

            <Text style={styles.sessionTitle}>{item.title}</Text>
            <Text style={styles.sessionMeta}>📍 {item.venue}</Text>
            <Text style={styles.sessionMeta}>⏰ {item.time}</Text>

            <View style={styles.cardBottom}>
              <Text style={styles.slotText}>{item.slots}</Text>
              <Text style={styles.costText}>{item.cost}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background
  },
  content: {
    padding: 20,
    paddingBottom: 40
  },
  heroSection: {
    marginBottom: 16
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 1
  },
  headerSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 4
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder
  },
  chipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary
  },
  chipText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '600'
  },
  chipTextActive: {
    color: THEME.colors.textOnPrimary
  },
  cardList: {
    gap: 14
  },
  card: {
    backgroundColor: THEME.colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  activityBadge: {
    backgroundColor: THEME.colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borderActive
  },
  activityBadgeText: {
    color: THEME.colors.primary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  karmaBadge: {
    fontSize: 11,
    color: THEME.colors.warning,
    fontWeight: '600'
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 8
  },
  sessionMeta: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginBottom: 4
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)'
  },
  slotText: {
    fontSize: 12,
    color: THEME.colors.success,
    fontWeight: '700'
  },
  costText: {
    fontSize: 13,
    color: THEME.colors.text,
    fontWeight: '700'
  }
});
