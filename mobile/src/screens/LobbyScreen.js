import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { THEME } from '../theme';

export default function LobbyScreen({ route, navigation }) {
  const sessionTitle = route?.params?.sessionTitle || 'Futsal Santai 5v5 Malam Ini';
  const totalSlots = 10;
  
  // Mock slot data
  const [participants, setParticipants] = useState([
    { slot: 1, name: 'Jeremy (Host)', karma: 98, team: 'A' },
    { slot: 2, name: 'Ben_Mobile', karma: 92, team: 'A' },
    { slot: 3, name: 'Hyun_Striker', karma: 88, team: 'B' },
    { slot: 4, name: 'Yua_Design', karma: 95, team: 'B' },
    { slot: 5, name: 'Jerikho_Backend', karma: 90, team: 'A' },
    { slot: 6, name: 'Budi_W', karma: 75, team: 'B' },
    { slot: 7, name: 'Andi_K', karma: 82, team: 'A' },
    { slot: 8, name: 'Rian_F', karma: 78, team: 'B' }
  ]);

  const [hasJoined, setHasJoined] = useState(false);

  const handleJoinSlot = () => {
    if (hasJoined) {
      Alert.alert('Info', 'Anda sudah terdaftar di sesi ini.');
      return;
    }
    if (participants.length >= totalSlots) {
      Alert.alert('Penuh', 'Sesi ini sudah penuh (10/10).');
      return;
    }
    const newSlotNum = participants.length + 1;
    setParticipants([
      ...participants,
      { slot: newSlotNum, name: 'Anda (Saya)', karma: 100, team: newSlotNum % 2 === 1 ? 'A' : 'B' }
    ]);
    setHasJoined(true);
    Alert.alert('Sukses Join!', `Slot #${newSlotNum} berhasil dikunci secara atomik.`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Lobby Header */}
      <View style={styles.headerBox}>
        <View style={styles.badgeRow}>
          <Text style={styles.activityTag}>LOBBY MATCHMAKING</Text>
          <Text style={styles.statusLive}>● LIVE</Text>
        </View>
        <Text style={styles.title}>{sessionTitle}</Text>
        <Text style={styles.subtitle}>Tifosi Sport Center · Lapangan 2 Vinyl</Text>
      </View>

      {/* Roster & Slot Matrix */}
      <View style={styles.rosterSection}>
        <View style={styles.rosterHeader}>
          <Text style={styles.sectionTitle}>ROSTER PEMAIN ({participants.length}/{totalSlots})</Text>
          <Text style={styles.lockNotice}>🔒 Atomic Slot Lock</Text>
        </View>

        <View style={styles.slotGrid}>
          {Array.from({ length: totalSlots }, (_, i) => i + 1).map((slotNum) => {
            const player = participants.find((p) => p.slot === slotNum);
            return (
              <View
                key={slotNum}
                style={[
                  styles.slotCard,
                  player ? styles.slotFilled : styles.slotEmpty
                ]}
              >
                <View style={styles.slotNumBox}>
                  <Text style={styles.slotNumText}>#{slotNum}</Text>
                </View>
                <View style={styles.slotInfo}>
                  <Text style={styles.playerName}>{player ? player.name : 'Slot Kosong'}</Text>
                  {player ? (
                    <Text style={styles.playerMeta}>Team {player.team} · Karma: {player.karma}</Text>
                  ) : (
                    <Text style={styles.emptyMeta}>Siap Diisi</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Split Teams Button */}
      <TouchableOpacity
        style={styles.btnSplit}
        onPress={() => Alert.alert('Balanced Team Splitter', 'Tim A dan Tim B telah diratakan berdasarkan Skill Rating & Karma Score!')}
      >
        <Text style={styles.btnSplitText}>⚖️ Jalankan Balanced Team Splitter</Text>
      </TouchableOpacity>

      {/* Action Footer */}
      <TouchableOpacity
        style={[styles.btnJoin, hasJoined && styles.btnJoinDisabled]}
        onPress={handleJoinSlot}
      >
        <Text style={styles.btnJoinText}>
          {hasJoined ? '✓ Anda Terdaftar di Slot #' + (participants.length) : '⚡ AMBIL 1 SLOT TERAKHIR'}
        </Text>
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
    padding: 20,
    paddingBottom: 40
  },
  headerBox: {
    backgroundColor: THEME.colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    marginBottom: 20
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  activityTag: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 0.5
  },
  statusLive: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.success
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 4
  },
  subtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary
  },
  rosterSection: {
    marginBottom: 20
  },
  rosterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase'
  },
  lockNotice: {
    fontSize: 11,
    color: THEME.colors.primary,
    fontWeight: '600'
  },
  slotGrid: {
    gap: 8
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1
  },
  slotFilled: {
    backgroundColor: THEME.colors.card,
    borderColor: THEME.colors.cardBorder
  },
  slotEmpty: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderStyle: 'dashed'
  },
  slotNumBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: THEME.colors.cardElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  slotNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primary
  },
  slotInfo: {
    flex: 1
  },
  playerName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text
  },
  playerMeta: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2
  },
  emptyMeta: {
    fontSize: 12,
    color: THEME.colors.textMuted
  },
  btnSplit: {
    backgroundColor: THEME.colors.cardElevated,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    marginBottom: 16
  },
  btnSplitText: {
    color: THEME.colors.text,
    fontSize: 13,
    fontWeight: '700'
  },
  btnJoin: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  btnJoinDisabled: {
    backgroundColor: THEME.colors.cardElevated,
    opacity: 0.8
  },
  btnJoinText: {
    color: THEME.colors.textOnPrimary,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5
  }
});
