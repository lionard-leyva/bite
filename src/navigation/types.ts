import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Home: { focusRestaurantId?: string } | undefined;
  List: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Loading: undefined;
  Auth: undefined;
  Tabs: NavigatorScreenParams<TabParamList>;
  Save: { restaurantId?: string; sharedText?: string } | undefined;
  Detail: { restaurantId: string };
  Match: undefined;
};
