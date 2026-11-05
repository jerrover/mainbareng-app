import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Explore: undefined;
  Create: undefined;
  Lobby: { sessionId?: string; sessionTitle?: string };
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Auth: undefined;
};
