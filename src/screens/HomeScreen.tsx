import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator, Pressable, Platform, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
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
import UserLocationMarker from '../components/UserLocationMarker';
import DragHandle from '../components/DragHandle';
import type { RootStackParamList } from '../navigation/types';
import type { Restaurant } from '../types';
import {
  CLUSTER_RADIUS,
  CLUSTER_COLOR,
  CLUSTER_FONT_SIZE,
  FAB_SIZE,
  FAB_BOTTOM_OFFSET,
  LOCATION_BUTTON_SIZE,
  CARD_BOTTOM_POSITION,
  CARD_HORIZONTAL_MARGIN,
  CARD_CONTENT_PADDING_H,
  CARD_CONTENT_PADDING_V,
  CARD_PHOTO_HEIGHT,
  CARD_BORDER_RADIUS,
  Z_MARKER,
  Z_MARKER_SELECTED,
  Z_CLUSTER,
  Z_FAB,
  Z_CARD,
  EDGE_PADDING_TOP,
  EDGE_PADDING_RIGHT,
  EDGE_PADDING_BOTTOM,
  EDGE_PADDING_LEFT,
  PRICE_VALUES,
  PRICE_LABELS,
  MARKER_PILL_HEIGHT,
  SHEET_SPRING_TENSION,
  SHEET_SPRING_FRICTION,
  SHEET_DISMISS_TRANSLATE,
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
  if (d < 0.1) return `${Math.round(d * 1000)}m`;
  return `${d.toFixed(1)}km`;
}

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

function getPriceLabel(price: number): string {
  const idx = PRICE_VALUES.indexOf(price as (typeof PRICE_VALUES)[number]);
  return idx >= 0 ? PRICE_LABELS[idx] : '';
}

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

const CARD_BOTTOM = CARD_BOTTOM_POSITION;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { restaurants: rawRestaurants, loading, error } = useRestaurants();
  const location = useLocation();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const hasInitiallyFit = useRef(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cardTranslateY = useRef(new Animated.Value(SHEET_DISMISS_TRANSLATE)).current;

  const restaurants = useMemo(() => dedupeById(rawRestaurants), [rawRestaurants]);
  const coordOffsets = useMemo(() => applyNearbyOffsets(restaurants), [restaurants]);

  useEffect(() => {
    if (selectedId && !restaurants.some((r) => r.id === selectedId)) {
      setSelectedId(null);
    }
  }, [restaurants, selectedId]);

  const selectedRestaurant = useMemo(
    () => restaurants.find((r) => r.id === selectedId) ?? null,
    [restaurants, selectedId],
  );

  const isDismissing = useRef(false);

  useEffect(() => {
    if (selectedId && !isDismissing.current) {
      cardTranslateY.setValue(SHEET_DISMISS_TRANSLATE);
      Animated.spring(cardTranslateY, {
        toValue: 0,
        tension: SHEET_SPRING_TENSION,
        friction: SHEET_SPRING_FRICTION,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedId]);

  const dismissCard = useCallback(() => {
    if (isDismissing.current) return;
    isDismissing.current = true;
    Animated.timing(cardTranslateY, {
      toValue: SHEET_DISMISS_TRANSLATE,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setSelectedId(null);
      isDismissing.current = false;
    });
  }, [cardTranslateY]);

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
          top: EDGE_PADDING_TOP,
          right: EDGE_PADDING_RIGHT,
          bottom: EDGE_PADDING_BOTTOM,
          left: EDGE_PADDING_LEFT,
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
    if (selectedId === r.id) {
      dismissCard();
    } else {
      setSelectedId(r.id);
    }
    mapRef.current?.animateToRegion(
      {
        latitude: r.latitude,
        longitude: r.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      },
      350,
    );
  }, [selectedId, dismissCard]);

  const handleMapPress = useCallback(() => {
    if (selectedId) dismissCard();
  }, [selectedId, dismissCard]);

  const handleClusterPress = useCallback(() => {
    if (selectedId) dismissCard();
  }, [selectedId, dismissCard]);

  const renderCluster = useCallback((cluster: any) => {
    const { id, geometry, properties, onPress } = cluster;
    const count = properties.point_count;
    return (
      <Marker
        key={`cluster-${id}`}
        coordinate={{
          latitude: geometry.coordinates[1],
          longitude: geometry.coordinates[0],
        }}
        onPress={onPress}
        tracksViewChanges={false}
        zIndex={Z_CLUSTER}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            height: MARKER_PILL_HEIGHT,
            paddingHorizontal: 14,
            backgroundColor: '#222222',
            borderRadius: MARKER_PILL_HEIGHT / 2,
            gap: 4,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.22,
                shadowRadius: 8,
              },
              android: { elevation: 6 },
            }),
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: CLUSTER_FONT_SIZE }}>
            {count}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600' }}>
            sitios
          </Text>
        </View>
      </Marker>
    );
  }, []);

  const hasSelection = selectedId != null;

  const distanceText = useMemo(() => {
    if (!selectedRestaurant || location.latitude == null || location.longitude == null) return null;
    return getDistanceKm(
      location.latitude, location.longitude,
      selectedRestaurant.latitude, selectedRestaurant.longitude,
    );
  }, [selectedRestaurant, location.latitude, location.longitude]);

  return (
    <View style={{ flex: 1 }}>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' }}>
          <ActivityIndicator size="large" color="#FF5A5F" />
        </View>
      ) : (
        <ClusteredMapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={initialRegion}
          mapType="standard"
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          showsScale={false}
          toolbarEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          mapPadding={mapPadding}
          clusterColor={CLUSTER_COLOR}
          radius={CLUSTER_RADIUS}
          extent={512}
          minZoom={0}
          maxZoom={20}
          animationEnabled={false}
          onClusterPress={handleClusterPress}
          renderCluster={renderCluster}
          onPress={handleMapPress}
        >
          {/* Custom user location marker */}
          {location.latitude != null && location.longitude != null && (
            <UserLocationMarker latitude={location.latitude} longitude={location.longitude} />
          )}

          {restaurants.map((r) => {
            const isSelected = selectedId === r.id;
            const coord = coordOffsets.get(r.id) ?? { latitude: r.latitude, longitude: r.longitude };
            return (
              <Marker
                key={`${r.id}-${isSelected ? 1 : 0}`}
                identifier={r.id}
                coordinate={coord}
                tracksViewChanges={true}
                anchor={{ x: 0.5, y: 1 }}
                zIndex={isSelected ? Z_MARKER_SELECTED : Z_MARKER}
                opacity={hasSelection && !isSelected ? 0.45 : 1}
                stopPropagation
                onPress={() => handleMarkerPress(r)}
              >
                <MapMarker
                  name={r.name}
                  rating={r.rating}
                  visited={r.visited}
                  isSelected={isSelected}
                />
              </Marker>
            );
          })}
        </ClusteredMapView>
      )}

      {error && (
        <View style={{ position: 'absolute', top: 48, left: 16, right: 16, zIndex: 10, borderRadius: 12, backgroundColor: '#FEE2E2', paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#FECACA' }}>
          <Text style={{ fontSize: 14, color: '#991B1B' }}>
            Error cargando restaurantes. Revisa tu conexion o reinicia la app.
          </Text>
        </View>
      )}

      {restaurants.length === 0 && !loading && !error && (
        <View style={{ position: 'absolute', bottom: 96, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 32 }}>
          <View style={{ width: '100%', alignItems: 'center', borderRadius: 16, backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 24, borderWidth: 1, borderColor: '#E5E7EB' }}>
            <View style={{ marginBottom: 12, height: 80, width: 80, alignItems: 'center', justifyContent: 'center', borderRadius: 40, backgroundColor: 'rgba(255,90,95,0.1)' }}>
              <Ionicons name="restaurant-outline" size={32} color="#FF5A5F" />
            </View>
            <Text style={{ marginBottom: 4, fontSize: 17, fontWeight: '600', color: '#1F2937' }}>
              Tu mapa esta vacio
            </Text>
            <Text style={{ textAlign: 'center', fontSize: 14, color: '#6B7280' }}>
              Toca + para guardar tu primer restaurante y verlo aqui
            </Text>
          </View>
        </View>
      )}

      {/* ====== Bottom card — Airbnb listing card style ====== */}
      {selectedRestaurant && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: CARD_BOTTOM,
            left: CARD_HORIZONTAL_MARGIN,
            right: CARD_HORIZONTAL_MARGIN,
            backgroundColor: '#FFFFFF',
            borderRadius: CARD_BORDER_RADIUS,
            zIndex: Z_CARD,
            transform: [{ translateY: cardTranslateY }],
            ...(Platform.OS === 'android'
              ? { elevation: 12 }
              : { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 12 }),
          }}
        >
          <DragHandle />

          {/* Photo — full width, Airbnb height */}
          {selectedRestaurant.photoURL ? (
            <View style={{ borderRadius: CARD_BORDER_RADIUS - 4, overflow: 'hidden', height: CARD_PHOTO_HEIGHT, marginHorizontal: 4 }}>
              <Image
                source={{ uri: selectedRestaurant.photoURL }}
                style={{ width: '100%', height: CARD_PHOTO_HEIGHT }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
                placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
              />
            </View>
          ) : null}

          {/* Close */}
          <Pressable
            onPress={dismissCard}
            hitSlop={12}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 20,
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: 'rgba(0,0,0,0.5)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="close" size={18} color="#fff" />
          </Pressable>

          {/* Info section */}
          <View style={{ paddingHorizontal: CARD_CONTENT_PADDING_H, paddingVertical: CARD_CONTENT_PADDING_V }}>
            <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: '700', color: '#1F2937' }}>
              {selectedRestaurant.name}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}>
              <Text style={{ fontSize: 13 }}>
                {'\u{2B50}'.repeat(selectedRestaurant.rating)}
              </Text>
              <View style={{ backgroundColor: selectedRestaurant.visited ? '#E6F7F5' : '#FFEEEE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: selectedRestaurant.visited ? '#00A699' : '#FF5A5F' }}>
                  {selectedRestaurant.visited ? 'Visitado' : 'Pendiente'}
                </Text>
              </View>
              {selectedRestaurant.pricePerPerson ? (
                <View style={{ backgroundColor: '#FFF7ED', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#EA580C' }}>
                    {'\u20AC'}{selectedRestaurant.pricePerPerson} {'\u00B7'} {getPriceLabel(selectedRestaurant.pricePerPerson)}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}>
              {etaLoading ? (
                <ActivityIndicator size={10} color="#9CA3AF" />
              ) : etaInfoText ? (
                <Text style={{ fontSize: 12, color: '#6B7280' }}>{'\u{1F4CD}'} {etaInfoText}</Text>
              ) : distanceText ? (
                <Text style={{ fontSize: 12, color: '#6B7280' }}>{'\u{1F4CD}'} {distanceText}</Text>
              ) : null}
              <Text style={{ fontSize: 12, color: selectedRestaurant.visited ? '#10b981' : '#f59e0b' }}>
                {selectedRestaurant.visited ? '\u{2705}' : '\u{23F3}'} {timeAgo(selectedRestaurant.createdAt)}
              </Text>
            </View>

            {selectedRestaurant.note ? (
              <Text numberOfLines={2} style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>
                {'\u{1F4AD}'} {selectedRestaurant.note}
              </Text>
            ) : null}
          </View>

          {/* Buttons */}
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: CARD_CONTENT_PADDING_H, paddingBottom: CARD_CONTENT_PADDING_V, marginTop: 4 }}>
            <Pressable
              onPress={() => {
                navigation.navigate('Detail', { restaurantId: selectedRestaurant.id });
                setSelectedId(null);
              }}
              style={{
                flex: 1,
                backgroundColor: '#ef4444',
                paddingVertical: 14,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                minHeight: 48,
              }}
            >
              <Ionicons name="information-circle-outline" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Ver detalle</Text>
            </Pressable>

            <Pressable
              onPress={() =>
                openNativeNavigation(
                  selectedRestaurant.latitude,
                  selectedRestaurant.longitude,
                  selectedRestaurant.name,
                )
              }
              style={{
                flex: 1,
                backgroundColor: '#3b82f6',
                paddingVertical: 14,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                minHeight: 48,
              }}
            >
              <Ionicons name="navigate" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Ir ahora</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {/* My Location FAB — Airbnb style */}
      <Pressable
        onPress={handleMyLocation}
        style={{
          position: 'absolute',
          bottom: 180,
          left: CARD_HORIZONTAL_MARGIN,
          width: LOCATION_BUTTON_SIZE,
          height: LOCATION_BUTTON_SIZE,
          borderRadius: LOCATION_BUTTON_SIZE / 2,
          backgroundColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: Z_FAB,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}
        accessibilityRole="button"
        accessibilityLabel="Ir a mi ubicacion"
      >
        <Ionicons name="navigate" size={24} color="#484848" />
      </Pressable>

      <FAB onPress={() => navigation.navigate('Save')} bottomOffset={FAB_BOTTOM_OFFSET} />
    </View>
  );
}
