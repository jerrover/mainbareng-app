import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  createBottomTabNavigator,
  BottomTabBarButtonProps
} from '@react-navigation/bottom-tabs';
import { THEME } from '../theme';
import { MainTabParamList } from './types';

import ExploreScreen from '../screens/ExploreScreen';
import CreateSessionScreen from '../screens/CreateSessionScreen';
import LobbyScreen from '../screens/LobbyScreen';
import VenuesScreen from '../screens/VenuesScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Custom Center Action FAB with Geometric Plus (Figma 31:10378)
function CenterActionButton({ onPress }: BottomTabBarButtonProps) {
  return (
    <TouchableOpacity
      style={styles.centerFabContainer}
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityLabel="Buat Sesi Mabar Baru"
    >
      <View style={styles.centerFab}>
        {/* Mathematically Centered Geometric Plus Crossbars */}
        <View style={styles.plusCrossBox}>
          <View style={styles.plusBarHorizontal} />
          <View style={styles.plusBarVertical} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Explore"
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBarCapsule,
        tabBarActiveTintColor: THEME.colors.primary,
        tabBarInactiveTintColor: THEME.colors.textMuted,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem
      }}
    >
      {/* 1. Explore (Figma 31:10366) */}
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          tabBarLabel: 'Explore',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>🧭</Text>
          )
        }}
      />

      {/* 2. Sesi Saya / Lobby (Figma 31:10371) */}
      <Tab.Screen
        name="Lobby"
        component={LobbyScreen}
        options={{
          tabBarLabel: 'Sesi Saya',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>🎫</Text>
          )
        }}
      />

      {/* 3. Center Action Button: Buat Sesi (Figma 31:10378 - Exact Dead Center) */}
      <Tab.Screen
        name="Create"
        component={CreateSessionScreen}
        options={{
          tabBarLabel: () => null,
          tabBarButton: (props) => <CenterActionButton {...props} />
        }}
      />

      {/* 4. Venues Catalog (Figma 31:10382) */}
      <Tab.Screen
        name="Venues"
        component={VenuesScreen}
        options={{
          tabBarLabel: 'Venues',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>📍</Text>
          )
        }}
      />

      {/* 5. Profil (Figma 31:10387) */}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>👤</Text>
          )
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  // Floating Capsule Nav (Figma 31:10365)
  tabBarCapsule: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    height: 64,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    paddingHorizontal: 8,
    paddingBottom: 6,
    paddingTop: 6,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12
  },
  tabBarItem: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center'
  },
  tabBarLabel: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    marginTop: 2,
    includeFontPadding: false
  },
  tabIcon: {
    fontSize: 18
  },

  // Center Action Button FAB (Figma 31:10378 - Perfectly Centered)
  centerFabContainer: {
    flex: 1,
    top: -14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  centerFab: {
    width: THEME.components.fabButton.width,
    height: THEME.components.fabButton.height,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8
  },
  plusCrossBox: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  plusBarHorizontal: {
    position: 'absolute',
    width: 16,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: THEME.colors.textOnPrimary
  },
  plusBarVertical: {
    position: 'absolute',
    width: 2.5,
    height: 16,
    borderRadius: 1.5,
    backgroundColor: THEME.colors.textOnPrimary
  }
});
