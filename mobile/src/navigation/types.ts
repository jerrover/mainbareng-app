import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Explore: undefined;
  Lobby: { sessionId?: string; sessionTitle?: string };
  Create: undefined;
  Venues: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Auth: undefined;
};
