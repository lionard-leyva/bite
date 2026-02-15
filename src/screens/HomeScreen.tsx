import { useMemo } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRestaurants } from '../hooks/useRestaurants';
import { useLocation } from '../hooks/useLocation';
import FAB from '../components/FAB';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PIN_VISITED = '#22c55e';
const PIN_PENDING = '#f97316';

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { restaurants, loading } = useRestaurants();
  const location = useLocation();

  const initialRegion = useMemo(() => ({
    latitude: location.latitude ?? 40.4168,
    longitude: location.longitude ?? -3.7038,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  }), [location.latitude, location.longitude]);

  return (
    <View className="flex-1">
      {loading ? (
        <View className="flex-1 items-center justify-center bg-white">
          <ActivityIndicator size="large" color="#e63946" />
        </View>
      ) : (
        <MapView
          className="flex-1"
          provider={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton
        >
          {restaurants.map((r) => (
            <Marker
              key={r.id}
              coordinate={{ latitude: r.latitude, longitude: r.longitude }}
              title={r.name}
              description={r.address}
              pinColor={r.visited ? PIN_VISITED : PIN_PENDING}
              onCalloutPress={() =>
                navigation.navigate('Detail', { restaurantId: r.id })
              }
            />
          ))}
        </MapView>
      )}

      {restaurants.length === 0 && !loading && (
        <View className="absolute bottom-24 left-0 right-0 items-center">
          <View className="rounded-lg bg-white/90 px-4 py-2 shadow-sm">
            <Text className="text-sm text-gray-500">
              Toca + para guardar tu primer restaurante
            </Text>
          </View>
        </View>
      )}

      <FAB onPress={() => navigation.navigate('Save')} />
    </View>
  );
}
