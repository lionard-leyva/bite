import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Home: undefined;
  List: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Loading: undefined;
  Auth: undefined;
  Tabs: NavigatorScreenParams<TabParamList>;
  Save: undefined;
  Detail: { restaurantId: string };
};
