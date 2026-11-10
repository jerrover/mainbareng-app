import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Explore: undefined;
  Lobby: { sessionId?: string; sessionTitle?: string };
  Create: undefined;
  Venues: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Auth: { initialMode?: 'signin' | 'signup' } | undefined;
};
