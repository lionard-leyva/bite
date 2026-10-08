import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import ListScreen from '../screens/ListScreen';
import ProfileScreen from '../screens/ProfileScreen';
import type { TabParamList } from './types';
import { useShareIntent } from '../hooks/useShareIntent';
import { useTheme } from '../theme/ThemeProvider';

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
  useShareIntent();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  // Con navegacion por gestos el indicador del sistema cruza las etiquetas si la altura es fija.
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors['text-tertiary'],
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 52 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        getComponent={() => require('../screens/HomeScreen').default}
        options={{
          tabBarLabel: 'Mapa',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="List"
        component={ListScreen}
        options={{
          tabBarLabel: 'Lista',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'list' : 'list-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
