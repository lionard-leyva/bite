import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import ClusteredMapView from 'react-native-map-clustering';
import { Marker } from 'react-native-maps';
import MapView from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRestaurants } from '../hooks/useRestaurants';
import { useLocation } from '../hooks/useLocation';
import { useNavigationETA } from '../hooks/useNavigationETA';
import { timeAgo } from '../utils/timeAgo';
import { openNativeNavigation } from '../services/navigationService';
import FAB from '../components/FAB';
import MapMarker from '../components/MapMarker';
import MapCallout from '../components/MapCallout';
import type { RootStackParamList } from '../navigation/types';
import type { Restaurant } from '../types';
import {
  CLUSTER_RADIUS,
  CLUSTER_COLOR,
  FAB_SIZE,
  FAB_BOTTOM_OFFSET,
  LOCATION_BUTTON_SIZE,
} from '../config/constants';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function getDistanceKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): string {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  if (d < 0.1) return `${Math.round(d * 1000)}m de ti`;
  return `${d.toFixed(1)}km de ti`;
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { restaurants, loading, error } = useRestaurants();
  const location = useLocation();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const hasInitiallyFit = useRef(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tracksChanges, setTracksChanges] = useState(false);

  const selectedRestaurant = useMemo(
    () => restaurants.find((r) => r.id === selectedId) ?? null,
    [restaurants, selectedId],
  );

  const { infoText: etaInfoText, etaLoading } = useNavigationETA({
    restaurantId: selectedId,
    destLat: selectedRestaurant?.latitude ?? null,
    destLng: selectedRestaurant?.longitude ?? null,
    userLat: location.latitude,
    userLng: location.longitude,
  });

  const handleNavigate = useCallback(() => {
    if (!selectedRestaurant) return;
    openNativeNavigation(
      selectedRestaurant.latitude,
      selectedRestaurant.longitude,
      selectedRestaurant.name,
    );
  }, [selectedRestaurant]);

  const initialRegion = useMemo(() => ({
    latitude: location.latitude ?? 40.4168,
    longitude: location.longitude ?? -3.7038,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  }), [location.latitude, location.longitude]);

  const mapPadding = useMemo(() => ({
    top: insets.top + 16,
    right: 16,
    bottom: FAB_SIZE + FAB_BOTTOM_OFFSET + 16,
    left: 16,
  }), [insets.top]);

  // Auto-fit all pins on initial load
  useEffect(() => {
    if (hasInitiallyFit.current || loading || restaurants.length === 0) return;
    hasInitiallyFit.current = true;

    const coords = restaurants.map((r) => ({
      latitude: r.latitude,
      longitude: r.longitude,
    }));

    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: {
          top: mapPadding.top + 60,
          right: mapPadding.right + 60,
          bottom: mapPadding.bottom + 60,
          left: mapPadding.left + 60,
        },
        animated: false,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [restaurants, loading, mapPadding]);

  const handleMyLocation = useCallback(() => {
    if (location.latitude == null || location.longitude == null) return;
    mapRef.current?.animateToRegion(
      {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500,
    );
  }, [location.latitude, location.longitude]);

  const handleMarkerPress = useCallback((r: Restaurant) => {
    setSelectedId(r.id);
    setTracksChanges(true);
    mapRef.current?.animateToRegion(
      {
        latitude: r.latitude,
        longitude: r.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      },
      350,
    );
    setTimeout(() => setTracksChanges(false), 450);
  }, []);

  const handleMapPress = useCallback(() => {
    if (selectedId == null) return;
    setSelectedId(null);
    setTracksChanges(true);
    setTimeout(() => setTracksChanges(false), 450);
  }, [selectedId]);

  const renderCluster = useCallback((cluster: any) => {
    const { id, geometry, onPress, properties } = cluster;
    const count = properties.point_count;
    const size = 40 + Math.min(count, 20);
    return (
      <Marker
        key={`cluster-${id}`}
        coordinate={{
          latitude: geometry.coordinates[1],
          longitude: geometry.coordinates[0],
        }}
        onPress={onPress}
        tracksViewChanges={false}
      >
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: CLUSTER_COLOR,
            borderWidth: 3,
            borderColor: '#fff',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
            {count}
          </Text>
        </View>
      </Marker>
    );
  }, []);

  return (
    <View className="flex-1">
      {loading ? (
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator size="large" color="#FF5A5F" />
        </View>
      ) : (
        <ClusteredMapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={initialRegion}
          showsUserLocation
          mapPadding={mapPadding}
          clusterColor={CLUSTER_COLOR}
          radius={CLUSTER_RADIUS}
          animationEnabled={false}
          renderCluster={renderCluster}
          onPress={handleMapPress}
        >
          {restaurants.map((r) => {
            const isSelected = selectedId === r.id;
            const distanceText =
              location.latitude != null && location.longitude != null
                ? getDistanceKm(location.latitude, location.longitude, r.latitude, r.longitude)
                : null;

            return (
              <Marker
                key={r.id}
                coordinate={{ latitude: r.latitude, longitude: r.longitude }}
                tracksViewChanges={tracksChanges}
                anchor={{ x: 0.5, y: 0.5 }}
                zIndex={isSelected ? 999 : 0}
                onPress={() => handleMarkerPress(r)}
              >
                <MapMarker visited={r.visited} isSelected={isSelected} />
                <MapCallout
                  name={r.name}
                  rating={r.rating}
                  photoURL={r.photoURL}
                  createdAt={timeAgo(r.createdAt)}
                  distanceText={distanceText}
                  visited={r.visited}
                  onPress={() => navigation.navigate('Detail', { restaurantId: r.id })}
                  etaInfoText={isSelected ? etaInfoText : undefined}
                  etaLoading={isSelected ? etaLoading : undefined}
                  onNavigate={isSelected ? handleNavigate : undefined}
                />
              </Marker>
            );
          })}
        </ClusteredMapView>
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

      {/* My Location FAB */}
      <Pressable
        onPress={handleMyLocation}
        style={{
          position: 'absolute',
          bottom: FAB_BOTTOM_OFFSET,
          left: 20,
          width: LOCATION_BUTTON_SIZE,
          height: LOCATION_BUTTON_SIZE,
          borderRadius: LOCATION_BUTTON_SIZE / 2,
          backgroundColor: '#fff',
          borderWidth: 1,
          borderColor: '#E5E7EB',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
          elevation: 4,
        }}
        accessibilityRole="button"
        accessibilityLabel="Ir a mi ubicacion"
      >
        <Ionicons name="navigate" size={22} color="#FF5A5F" />
      </Pressable>

      <FAB onPress={() => navigation.navigate('Save')} bottomOffset={FAB_BOTTOM_OFFSET} />
    </View>
  );
}
