import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { THEME } from '../theme';
import { RootStackParamList } from './types';
import { useAuthStore } from '../store/authStore';

import WelcomeScreen from '../screens/WelcomeScreen';
import AuthScreen from '../screens/AuthScreen';
import TabNavigator from './TabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const session = useAuthStore((s) => s.session);

  return (
    <Stack.Navigator
      initialRouteName={session ? 'MainTabs' : 'Welcome'}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: THEME.colors.background }
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="MainTabs" component={TabNavigator} />
    </Stack.Navigator>
  );
}
