import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { THEME } from '../theme';

import ExploreScreen from '../screens/ExploreScreen';
import CreateSessionScreen from '../screens/CreateSessionScreen';
import LobbyScreen from '../screens/LobbyScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: THEME.colors.background,
          borderBottomWidth: 1,
          borderBottomColor: THEME.colors.cardBorder
        },
        headerTitleStyle: {
          color: THEME.colors.primary,
          fontWeight: '800',
          fontSize: 18,
          letterSpacing: 1
        },
        tabBarStyle: {
          backgroundColor: '#12141A',
          borderTopColor: THEME.colors.cardBorder,
          height: 65,
          paddingBottom: 10,
          paddingTop: 8
        },
        tabBarActiveTintColor: THEME.colors.primary,
        tabBarInactiveTintColor: THEME.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700'
        }
      }}
    >
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          tabBarLabel: 'Jelajah',
          headerTitle: 'MABAR · EXPLORE',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>⚡</Text>
        }}
      />
      <Tab.Screen
        name="Create"
        component={CreateSessionScreen}
        options={{
          tabBarLabel: 'Buat Sesi',
          headerTitle: 'MABAR · BUAT SESI',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>➕</Text>
        }}
      />
      <Tab.Screen
        name="Lobby"
        component={LobbyScreen}
        options={{
          tabBarLabel: 'Lobby',
          headerTitle: 'MABAR · LOBBY AKTIF',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>👥</Text>
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          headerTitle: 'MABAR · PROFIL SAYA',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>👤</Text>
        }}
      />
    </Tab.Navigator>
  );
}
