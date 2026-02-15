import { useMemo } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRestaurants } from '../hooks/useRestaurants';
import { useLocation } from '../hooks/useLocation';
import FAB from '../components/FAB';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PIN_VISITED = '#66BB6A';
const PIN_PENDING = '#FF5A5F';

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { restaurants, loading, error } = useRestaurants();
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
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator size="large" color="#FF5A5F" />
        </View>
      ) : (
        <MapView
          style={{ flex: 1 }}
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

      {error && (
        <View className="absolute top-12 left-4 right-4 z-10 rounded-card bg-red-100 px-4 py-3 border border-red-300">
          <Text className="text-sm text-red-800">
            Error cargando restaurantes. Revisa tu conexion o reinicia la app.
          </Text>
        </View>
      )}

      {restaurants.length === 0 && !loading && !error && (
        <View className="absolute bottom-24 left-0 right-0 items-center px-8">
          <View className="w-full items-center rounded-card bg-surface px-6 py-6 border border-border" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}>
            <View className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Ionicons name="restaurant-outline" size={32} color="#FF5A5F" />
            </View>
            <Text className="mb-1 text-subtitle font-semibold text-text-primary">
              Tu mapa esta vacio
            </Text>
            <Text className="text-center text-sm text-text-secondary">
              Toca + para guardar tu primer restaurante y verlo aqui
            </Text>
          </View>
        </View>
      )}

      <FAB onPress={() => navigation.navigate('Save')} />
    </View>
  );
}
