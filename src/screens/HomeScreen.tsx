import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator, Pressable, Image } from 'react-native';
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
import type { RootStackParamList } from '../navigation/types';
import type { Restaurant } from '../types';
import {
  CLUSTER_RADIUS,
  CLUSTER_COLOR,
  FAB_SIZE,
  FAB_BOTTOM_OFFSET,
  LOCATION_BUTTON_SIZE,
  CALLOUT_PHOTO_SIZE,
} from '../config/constants';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// --- Haversine ---

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
  if (d < 0.1) return `${Math.round(d * 1000)}m`;
  return `${d.toFixed(1)}km`;
}

// --- Offset for markers at identical coordinates ---

const COORD_PRECISION = 5;
const OFFSET_STEP = 0.00015;

interface OffsetCoord { latitude: number; longitude: number }

function applyNearbyOffsets(restaurants: Restaurant[]): Map<string, OffsetCoord> {
  const groups = new Map<string, string[]>();
  for (const r of restaurants) {
    const key = `${r.latitude.toFixed(COORD_PRECISION)},${r.longitude.toFixed(COORD_PRECISION)}`;
    const arr = groups.get(key);
    if (arr) arr.push(r.id);
    else groups.set(key, [r.id]);
  }

  const offsets = new Map<string, OffsetCoord>();
  for (const r of restaurants) {
    offsets.set(r.id, { latitude: r.latitude, longitude: r.longitude });
  }
  for (const ids of groups.values()) {
    if (ids.length < 2) continue;
    for (let i = 0; i < ids.length; i++) {
      const angle = (2 * Math.PI * i) / ids.length;
      const radius = OFFSET_STEP * (1 + Math.floor(i / 6));
      const r = restaurants.find((x) => x.id === ids[i])!;
      offsets.set(ids[i], {
        latitude: r.latitude + radius * Math.cos(angle),
        longitude: r.longitude + radius * Math.sin(angle),
      });
    }
  }
  return offsets;
}

// --- Dedup ---

function dedupeById(restaurants: Restaurant[]): Restaurant[] {
  const seen = new Set<string>();
  const result: Restaurant[] = [];
  for (const r of restaurants) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    result.push(r);
  }
  return result;
}

// =============================================================

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { restaurants: rawRestaurants, loading, error } = useRestaurants();
  const location = useLocation();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const hasInitiallyFit = useRef(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const restaurants = useMemo(() => dedupeById(rawRestaurants), [rawRestaurants]);
  const coordOffsets = useMemo(() => applyNearbyOffsets(restaurants), [restaurants]);

  // Clear stale selection
  useEffect(() => {
    if (selectedId && !restaurants.some((r) => r.id === selectedId)) {
      setSelectedId(null);
    }
  }, [restaurants, selectedId]);

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

  // Auto-fit
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

  // Marker tap: toggle select
  const handleMarkerPress = useCallback((r: Restaurant) => {
    setSelectedId((prev) => {
      if (prev === r.id) return null;
      mapRef.current?.animateToRegion(
        {
          latitude: r.latitude,
          longitude: r.longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        350,
      );
      return r.id;
    });
  }, []);

  // Map background tap: deselect
  const handleMapPress = useCallback(() => {
    setSelectedId(null);
  }, []);

  // Cluster tap: library handles fitToCoordinates via _onClusterPress,
  // we just need to clear the selected marker.
  const handleClusterPress = useCallback(() => {
    setSelectedId(null);
  }, []);

  const renderCluster = useCallback((cluster: any) => {
    const { id, geometry, properties, onPress } = cluster;
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

  // --- Bottom card data ---
  const hasSelection = selectedId != null;

  const distanceText = useMemo(() => {
    if (!selectedRestaurant || location.latitude == null || location.longitude == null) return null;
    return getDistanceKm(
      location.latitude, location.longitude,
      selectedRestaurant.latitude, selectedRestaurant.longitude,
    );
  }, [selectedRestaurant, location.latitude, location.longitude]);

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
          showsMyLocationButton={false}
          userLocationPriority="balanced"
          mapPadding={mapPadding}
          clusterColor={CLUSTER_COLOR}
          radius={CLUSTER_RADIUS}
          animationEnabled
          onClusterPress={handleClusterPress}
          renderCluster={renderCluster}
          onPress={handleMapPress}
        >
          {restaurants.map((r) => {
            const isSelected = selectedId === r.id;
            const coord = coordOffsets.get(r.id) ?? { latitude: r.latitude, longitude: r.longitude };

            return (
              <Marker
                key={r.id}
                identifier={r.id}
                coordinate={coord}
                tracksViewChanges={isSelected}
                anchor={{ x: 0.5, y: 0.5 }}
                zIndex={isSelected ? 999 : 1}
                stopPropagation
                onPress={() => handleMarkerPress(r)}
              >
                <MapMarker
                  rating={r.rating}
                  visited={r.visited}
                  isSelected={isSelected}
                  dimmed={hasSelection && !isSelected}
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

      {/* ====== Bottom card: appears when a marker is selected ====== */}
      {selectedRestaurant && (
        <View
          style={{
            position: 'absolute',
            bottom: FAB_BOTTOM_OFFSET + FAB_SIZE + 16,
            left: 16,
            right: 16,
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 14,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          {/* Row: photo + info */}
          <View style={{ flexDirection: 'row' }}>
            {/* Photo */}
            <View
              style={{
                width: CALLOUT_PHOTO_SIZE,
                height: CALLOUT_PHOTO_SIZE,
                borderRadius: 10,
                backgroundColor: '#F3F4F6',
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              {selectedRestaurant.photoURL ? (
                <Image
                  source={{ uri: selectedRestaurant.photoURL }}
                  style={{ width: CALLOUT_PHOTO_SIZE, height: CALLOUT_PHOTO_SIZE }}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="restaurant" size={24} color="#9CA3AF" />
              )}
            </View>

            {/* Info */}
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', color: '#1F2937' }}>
                {selectedRestaurant.name}
              </Text>

              {/* Stars + status pill */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <View style={{ flexDirection: 'row', gap: 1 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Ionicons
                      key={i}
                      name={i <= selectedRestaurant.rating ? 'star' : 'star-outline'}
                      size={12}
                      color="#FFB800"
                    />
                  ))}
                </View>
                <View
                  style={{
                    backgroundColor: selectedRestaurant.visited ? '#E6F7F5' : '#FFEEEE',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '600', color: selectedRestaurant.visited ? '#00A699' : '#FF5A5F' }}>
                    {selectedRestaurant.visited ? 'Visitado' : 'Pendiente'}
                  </Text>
                </View>
              </View>

              {/* Distance + ETA line */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Ionicons name="location-outline" size={12} color="#6B7280" />
                {etaLoading ? (
                  <ActivityIndicator size={10} color="#9CA3AF" />
                ) : etaInfoText ? (
                  <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>
                    {etaInfoText}
                  </Text>
                ) : distanceText ? (
                  <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>
                    {distanceText}
                  </Text>
                ) : null}
                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                  {timeAgo(selectedRestaurant.createdAt)}
                </Text>
              </View>
            </View>
          </View>

          {/* Note preview */}
          {selectedRestaurant.note ? (
            <Text
              numberOfLines={2}
              style={{ fontSize: 13, color: '#6B7280', marginTop: 8 }}
            >
              {'\u{1F4AD}'} {selectedRestaurant.note}
            </Text>
          ) : null}

          {/* Two real buttons: "Ver detalle" + "Ir ahora" */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Pressable
              onPress={() => navigation.navigate('Detail', { restaurantId: selectedRestaurant.id })}
              style={({ pressed }) => ({
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: '#E5E7EB',
                backgroundColor: pressed ? '#F9FAFB' : '#fff',
              })}
            >
              <Ionicons name="information-circle-outline" size={16} color="#374151" />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>
                Ver detalle
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                openNativeNavigation(
                  selectedRestaurant.latitude,
                  selectedRestaurant.longitude,
                  selectedRestaurant.name,
                )
              }
              style={({ pressed }) => ({
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: pressed ? '#E8494E' : '#FF5A5F',
              })}
            >
              <Ionicons name="navigate" size={15} color="#fff" />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>
                Ir ahora
              </Text>
            </Pressable>
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
