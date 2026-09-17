import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { THEME } from './src/theme';

export default function App() {
  const [activeTab, setActiveTab] = useState('discovery');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brandTitle}>MABAR</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>IF670 Milestone W4-W5</Text>
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Main Bareng, Tanpa Ghosting</Text>
          <Text style={styles.heroSubtitle}>
            Platform pencarian lawan dan rekan main olahraga & game kompetitif dengan reputasi Credit Score dan Skill Rating.
          </Text>
        </View>

        {/* Feature Check Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Core Modules Baseline</Text>
          
          <View style={styles.itemCard}>
            <Text style={styles.itemTitle}>⚡ FR-04: Discovery & Feed</Text>
            <Text style={styles.itemDesc}>Play Now & Scheduled Session Feed</Text>
            <Text style={styles.itemStatus}>Ready for UI Slicing</Text>
          </View>

          <View style={styles.itemCard}>
            <Text style={styles.itemTitle}>🛡️ FR-05 & FR-06: Atomic Slot Lock</Text>
            <Text style={styles.itemDesc}>PostgreSQL Stored Function / Concurrent Safe</Text>
            <Text style={styles.itemStatus}>Backend Endpoint Ready</Text>
          </View>

          <View style={styles.itemCard}>
            <Text style={styles.itemTitle}>🏆 FR-02 & FR-10: Dual Reputation</Text>
            <Text style={styles.itemDesc}>Credit Score (Accountability) + Skill Rating</Text>
            <Text style={styles.itemStatus}>Formula Specification Frozen</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation Mockup */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'discovery' && styles.navItemActive]}
          onPress={() => setActiveTab('discovery')}
        >
          <Text style={[styles.navText, activeTab === 'discovery' && styles.navTextActive]}>Discovery</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'create' && styles.navItemActive]}
          onPress={() => setActiveTab('create')}
        >
          <Text style={[styles.navText, activeTab === 'create' && styles.navTextActive]}>+ Create</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'profile' && styles.navItemActive]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.navText, activeTab === 'profile' && styles.navTextActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.cardBorder
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 1.5
  },
  badge: {
    backgroundColor: 'rgba(200, 155, 107, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(200, 155, 107, 0.3)'
  },
  badgeText: {
    fontSize: 11,
    color: THEME.colors.primaryLight,
    fontWeight: '600'
  },
  content: {
    padding: 20
  },
  heroCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    marginBottom: 20
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 6
  },
  heroSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18
  },
  section: {
    marginTop: 5
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12
  },
  itemCard: {
    backgroundColor: THEME.colors.card,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    marginBottom: 10
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: 4
  },
  itemDesc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginBottom: 6
  },
  itemStatus: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary
  },
  bottomNav: {
    flexDirection: 'row',
    height: 65,
    backgroundColor: '#12121A',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.cardBorder,
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  navItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20
  },
  navItemActive: {
    backgroundColor: 'rgba(200, 155, 107, 0.15)'
  },
  navText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontWeight: '600'
  },
  navTextActive: {
    color: THEME.colors.primary
  }
});
