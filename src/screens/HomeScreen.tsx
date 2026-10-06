import React, { useReducer, useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable, Platform, Modal, StyleSheet, TextInput, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ClusteredMapView from 'react-native-map-clustering';
import { Marker, type Region } from 'react-native-maps';
import MapView from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRestaurants } from '../hooks/useRestaurants';
import { useLocation } from '../hooks/useLocation';
import { useNavigationETA } from '../hooks/useNavigationETA';
import FAB from '../components/FAB';
import MapDetailCard from '../components/MapDetailCard';
import MatchEntryCard from '../components/MatchEntryCard';
import MapMarker, { markerAnchorY } from '../components/MapMarker';
import UserLocationMarker from '../components/UserLocationMarker';
import type { FilterValue } from '../components/FilterButtons';
import type { RootStackParamList, TabParamList } from '../navigation/types';
import { getPrimaryPhoto, type Restaurant } from '../types';
import { formatDistance, haversineKm, openNativeNavigation } from '../services/navigationService';
import { timeAgo } from '../utils/timeAgo';
import {
  CLUSTER_RADIUS,
  CLUSTER_COLOR,
  CLUSTER_FONT_SIZE,
  FAB_BOTTOM_OFFSET,
  Z_MARKER,
  Z_MARKER_SELECTED,
  Z_CLUSTER,
  EDGE_PADDING_TOP,
  EDGE_PADDING_RIGHT,
  EDGE_PADDING_BOTTOM,
  EDGE_PADDING_LEFT,
  PRICE_VALUES,
  PRICE_LABELS,
  SHEET_SPRING_TENSION,
  SHEET_SPRING_FRICTION,
  SHEET_DISMISS_TRANSLATE,
} from '../config/constants';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type HomeRoute = RouteProp<TabParamList, 'Home'>;

const COORD_PRECISION = 5;
const OFFSET_STEP = 0.0009;
const SPIDER_THRESHOLD = 0.00075;
const SPIDER_RADIUS = 0.0012;

interface OffsetCoord { latitude: number; longitude: number }

function applyNearbyOffsets(restaurants: Restaurant[]): Map<string, OffsetCoord> {
  const byId = new Map<string, Restaurant>();
  const groups = new Map<string, string[]>();
  for (const r of restaurants) {
    byId.set(r.id, r);
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
    // Keep a stable order so each restaurant keeps its same offset across rerenders.
    ids.sort((a, b) => a.localeCompare(b));
    for (let i = 0; i < ids.length; i++) {
      const angle = (2 * Math.PI * i) / ids.length;
      const radius = OFFSET_STEP * (1 + Math.floor(i / 6));
      const r = byId.get(ids[i])!;
      offsets.set(ids[i], {
        latitude: r.latitude + radius * Math.cos(angle),
        longitude: r.longitude + radius * Math.sin(angle),
      });
    }
  }
  return offsets;
}

function applySpiderOffsets(center: Restaurant, restaurants: Restaurant[], progress: number): Map<string, OffsetCoord> {
  const nearby = restaurants
    .filter((r) => Math.hypot(r.latitude - center.latitude, r.longitude - center.longitude) <= SPIDER_THRESHOLD)
    .sort((a, b) => a.id.localeCompare(b.id));

  const offsets = new Map<string, OffsetCoord>();
  if (nearby.length < 2) return offsets;
  const radius = SPIDER_RADIUS * Math.max(0, Math.min(1, progress));

  for (let i = 0; i < nearby.length; i++) {
    const angle = (-Math.PI / 2) + ((2 * Math.PI * i) / nearby.length);
    offsets.set(nearby[i].id, {
      latitude: center.latitude + (radius * Math.cos(angle)),
      longitude: center.longitude + (radius * Math.sin(angle)),
    });
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

const IG_FILTERS: { label: string; value: FilterValue; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Todos', value: 'all', icon: 'grid-outline' },
  { label: 'Visitados', value: 'visited', icon: 'checkmark-circle-outline' },
  { label: 'Pendientes', value: 'pending', icon: 'time-outline' },
];

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0f1524' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9aa3b2' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f1524' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1b2740' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0f1524' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a101c' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

// =============================================================

interface RestaurantMarkerProps {
  restaurant: Restaurant;
  coord: OffsetCoord;
  isSelected: boolean;
  hasSelection: boolean;
  tracksViewChanges: boolean;
  onPress: (r: Restaurant) => void;
}

const RestaurantMarkerMemo = React.memo(function RestaurantMarkerMemo({
  restaurant,
  coord,
  isSelected,
  hasSelection,
  tracksViewChanges,
  onPress,
}: RestaurantMarkerProps) {
  return (
    <Marker
      identifier={restaurant.id}
      coordinate={coord}
      tracksViewChanges={tracksViewChanges}
      anchor={{ x: 0.5, y: markerAnchorY(isSelected) }}
      zIndex={isSelected ? Z_MARKER_SELECTED : (Z_MARKER + 1)}
      opacity={1}
      stopPropagation
      onPress={() => onPress(restaurant)}
    >
      <MapMarker
        name={restaurant.name}
        visited={restaurant.visited}
        isSelected={isSelected}
        photoUri={getPrimaryPhoto(restaurant)}
      />
    </Marker>
  );
}, (prev, next) =>
  prev.isSelected === next.isSelected &&
  prev.hasSelection === next.hasSelection &&
  prev.tracksViewChanges === next.tracksViewChanges &&
  prev.coord.latitude === next.coord.latitude &&
  prev.coord.longitude === next.coord.longitude &&
  prev.restaurant.name === next.restaurant.name &&
  prev.restaurant.visited === next.restaurant.visited &&
  getPrimaryPhoto(prev.restaurant) === getPrimaryPhoto(next.restaurant),
);

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<HomeRoute>();
  const focusRestaurantId = route.params?.focusRestaurantId;
  const { restaurants: rawRestaurants, loading, error } = useRestaurants({ mode: 'all' });
  const location = useLocation();
  const mapRef = useRef<MapView>(null);
  const hasInitiallyFit = useRef(false);

  interface HomeState {
    selectedId: string | null;
    mapExpanded: boolean;
    searchQuery: string;
    activeFilter: FilterValue;
    mapRegion: Region | null;
    markerTracks: boolean;
    refocusNonce: number;
    spiderCenterId: string | null;
  }

  type HomeAction =
    | { type: 'patch'; payload: Partial<HomeState> }
    | { type: 'reset' };

  const initialState: HomeState = {
    selectedId: null,
    mapExpanded: false,
    searchQuery: '',
    activeFilter: 'all',
    mapRegion: null,
    markerTracks: Platform.OS === 'android',
    refocusNonce: 0,
    spiderCenterId: null,
  };

  function reducer(state: HomeState, action: HomeAction): HomeState {
    switch (action.type) {
      case 'patch':
        return { ...state, ...action.payload };
      case 'reset':
        return initialState;
      default:
        return state;
    }
  }

  const [state, dispatch] = useReducer(reducer, initialState);
  const [spiderProgress, setSpiderProgress] = useState(0);
  const { selectedId, mapExpanded, searchQuery, activeFilter, mapRegion, markerTracks, refocusNonce, spiderCenterId } = state;
  const selectedIdRef = useRef<string | null>(null);
  const cardTranslateY = useRef(new Animated.Value(SHEET_DISMISS_TRANSLATE)).current;
  const suppressMapPressRef = useRef(false);
  const modalMapRef = useRef<MapView>(null);
  const hasAutoFocusedRef = useRef(false);
  const prevQueryRef = useRef('');
  const prevFilterRef = useRef<FilterValue>('all');
  const prevRefocusNonceRef = useRef(0);
  const spiderProgressRef = useRef(0);

  useEffect(() => {
    const to = spiderCenterId ? 1 : 0;
    const from = spiderProgressRef.current;
    if (from === to) return;
    const duration = 180;
    const start = Date.now();
    let frame: ReturnType<typeof setTimeout> | null = null;

    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + ((to - from) * eased);
      spiderProgressRef.current = next;
      setSpiderProgress(next);
      if (t < 1) frame = setTimeout(tick, 16);
    };

    tick();
    return () => {
      if (frame) clearTimeout(frame);
    };
  }, [spiderCenterId]);

  const restaurants = useMemo(() => dedupeById(rawRestaurants), [rawRestaurants]);

  const visibleRestaurants = useMemo(() => {
    let filtered = restaurants;

    if (activeFilter === 'visited') {
      filtered = filtered.filter(r => r.visited);
    } else if (activeFilter === 'pending') {
      filtered = filtered.filter(r => !r.visited);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.address?.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [restaurants, activeFilter, searchQuery]);

  // Android: ensure custom marker views render at least once and when map surface changes
  // (compact card <-> fullscreen modal) to avoid stale/corrupted marker snapshots.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    dispatch({ type: 'patch', payload: { markerTracks: true } });
  }, [visibleRestaurants.length, mapExpanded, selectedId]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (!markerTracks) return;
    const t = setTimeout(() => dispatch({ type: 'patch', payload: { markerTracks: false } }), 700);
    return () => clearTimeout(t);
  }, [markerTracks]);

  const restaurantMap = useMemo(() => new Map(visibleRestaurants.map((r) => [r.id, r])), [visibleRestaurants]);
  const coordOffsets = useMemo(() => applyNearbyOffsets(visibleRestaurants), [visibleRestaurants]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    if (selectedId && !restaurantMap.has(selectedId)) {
      dispatch({ type: 'patch', payload: { selectedId: null } });
    }
  }, [restaurantMap, selectedId]);

  const selectedRestaurant = useMemo(
    () => (selectedId ? restaurantMap.get(selectedId) ?? null : null),
    [restaurantMap, selectedId],
  );

  useEffect(() => {
    if (!selectedId) return;
    cardTranslateY.setValue(SHEET_DISMISS_TRANSLATE);
    Animated.spring(cardTranslateY, {
      toValue: 0,
      tension: SHEET_SPRING_TENSION,
      friction: SHEET_SPRING_FRICTION,
      useNativeDriver: true,
    }).start();
  }, [selectedId, cardTranslateY]);

  const { infoText: etaInfoText, etaLoading } = useNavigationETA({
    restaurantId: selectedId,
    destLat: selectedRestaurant?.latitude ?? null,
    destLng: selectedRestaurant?.longitude ?? null,
    userLat: location.latitude,
    userLng: location.longitude,
  });

  const metaLine = useMemo(() => {
    if (!selectedRestaurant) return '';
    const parts: string[] = [];
    const dist =
      etaInfoText ||
      (location.latitude != null && location.longitude != null
        ? formatDistance(haversineKm(location.latitude, location.longitude, selectedRestaurant.latitude, selectedRestaurant.longitude))
        : null);
    if (dist) parts.push(dist);
    parts.push(timeAgo(selectedRestaurant.createdAt));
    if (selectedRestaurant.pricePerPerson) parts.push(`\u20AC${selectedRestaurant.pricePerPerson}`);
    return parts.join(' \u00B7 ');
  }, [selectedRestaurant, etaInfoText, location.latitude, location.longitude]);

  const dismissCard = useCallback(() => {
    dispatch({ type: 'patch', payload: { selectedId: null, spiderCenterId: null } });
  }, []);

  const spiderOffsets = useMemo(() => {
    if (!spiderCenterId) return new Map<string, OffsetCoord>();
    const center = restaurantMap.get(spiderCenterId);
    if (!center) return new Map<string, OffsetCoord>();
    return applySpiderOffsets(center, visibleRestaurants, spiderProgress);
  }, [spiderCenterId, restaurantMap, visibleRestaurants, spiderProgress]);

  const initialRegion = useMemo(() => ({
    latitude: location.latitude ?? 40.4168,
    longitude: location.longitude ?? -3.7038,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  }), [location.latitude, location.longitude]);

  useEffect(() => {
    if (!mapRegion) {
      dispatch({ type: 'patch', payload: { mapRegion: initialRegion } });
    }
  }, [initialRegion, mapRegion]);

  const handleRegionChangeComplete = useCallback((region: Region) => {
    dispatch({ type: 'patch', payload: { mapRegion: region } });
  }, []);

  const mapPadding = useMemo(() => ({
    top: 16,
    right: 16,
    bottom: 16,
    left: 16,
  }), []);
  const visibleIdsKey = useMemo(() => visibleRestaurants.map((r) => r.id).join('|'), [visibleRestaurants]);

  useEffect(() => {
    if (hasInitiallyFit.current || loading || visibleRestaurants.length === 0) return;
    hasInitiallyFit.current = true;
    const coords = visibleRestaurants.map((r) => ({
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
  }, [visibleRestaurants, loading, mapPadding]);

  // Re-focus map only on first load or when search/filter changes.
  // Avoid refocusing while selecting markers to prevent "jumping" to wrong areas.
  useEffect(() => {
    if (loading || visibleRestaurants.length === 0) return;
    const queryChanged = prevQueryRef.current !== searchQuery;
    const filterChanged = prevFilterRef.current !== activeFilter;
    const refocusTriggered = prevRefocusNonceRef.current !== refocusNonce;
    const shouldRefocus = !hasAutoFocusedRef.current || queryChanged || filterChanged || refocusTriggered;
    prevQueryRef.current = searchQuery;
    prevFilterRef.current = activeFilter;
    prevRefocusNonceRef.current = refocusNonce;
    if (!shouldRefocus) return;

    const targetMap = mapExpanded ? modalMapRef.current : mapRef.current;
    if (!targetMap) return;

    const coords = visibleRestaurants.map((r) => ({
      latitude: r.latitude,
      longitude: r.longitude,
    }));

    const timer = setTimeout(() => {
      if (coords.length === 1) {
        targetMap.animateToRegion(
          {
            latitude: coords[0].latitude,
            longitude: coords[0].longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          350,
        );
      } else {
        targetMap.fitToCoordinates(coords, {
          edgePadding: {
            top: EDGE_PADDING_TOP,
            right: EDGE_PADDING_RIGHT,
            bottom: EDGE_PADDING_BOTTOM,
            left: EDGE_PADDING_LEFT,
          },
          animated: true,
        });
      }
    }, 120);
    hasAutoFocusedRef.current = true;

    return () => clearTimeout(timer);
  }, [visibleIdsKey, activeFilter, searchQuery, mapExpanded, loading, visibleRestaurants, refocusNonce]);

  const handleMyLocation = useCallback(async () => {
    // Ask again so a failed first attempt at mount does not disable the button; fall back to the last known fix.
    const fresh = await location.refresh();
    const coords =
      fresh ??
      (location.latitude != null && location.longitude != null
        ? { latitude: location.latitude, longitude: location.longitude }
        : null);
    if (!coords) return;
    mapRef.current?.animateToRegion(
      {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500,
    );
  }, [location.refresh, location.latitude, location.longitude]);

  const handleMarkerPress = useCallback((r: Restaurant) => {
    suppressMapPressRef.current = true;
    const nearbyCount = visibleRestaurants.filter((x) =>
      Math.hypot(x.latitude - r.latitude, x.longitude - r.longitude) <= SPIDER_THRESHOLD,
    ).length;

    dispatch({
      type: 'patch',
      payload: {
        selectedId: r.id,
        markerTracks: true,
        spiderCenterId: nearbyCount > 1 ? r.id : null,
      },
    });

    // Keep the current zoom: only recenter, shifted so the marker sits above the bottom card.
    const selectedCoord = coordOffsets.get(r.id) ?? { latitude: r.latitude, longitude: r.longitude };
    const targetMap = mapExpanded ? modalMapRef.current : mapRef.current;
    if (targetMap) {
      const latitudeDelta = (mapRegion ?? initialRegion).latitudeDelta;
      targetMap.animateCamera(
        { center: { latitude: selectedCoord.latitude - (latitudeDelta * 0.18), longitude: selectedCoord.longitude } },
        { duration: 260 },
      );
    }

    setTimeout(() => {
      suppressMapPressRef.current = false;
    }, 260);
  }, [visibleRestaurants, coordOffsets, mapRegion, initialRegion, mapExpanded]);

  // "Ver en mapa" from MatchScreen: select the matched restaurant once it is visible.
  const handledFocusRef = useRef<string | null>(null);
  useEffect(() => {
    if (!focusRestaurantId || handledFocusRef.current === focusRestaurantId) return;
    const target = restaurantMap.get(focusRestaurantId);
    if (!target) return;
    handledFocusRef.current = focusRestaurantId;
    handleMarkerPress(target);
  }, [focusRestaurantId, restaurantMap, handleMarkerPress]);

  const pendingCount = useMemo(() => restaurants.filter((r) => !r.visited).length, [restaurants]);

  const handleMapPress = useCallback(() => {
    if (suppressMapPressRef.current) return;
    if (selectedIdRef.current) dismissCard();
  }, [dismissCard]);

  const handleClusterPress = useCallback(() => {
    suppressMapPressRef.current = true;
    if (selectedIdRef.current) dismissCard();
    setTimeout(() => {
      suppressMapPressRef.current = false;
    }, 0);
  }, [dismissCard]);

  const renderCluster = useCallback((cluster: any) => {
    const { id, geometry, properties, onPress } = cluster;
    const count = properties.point_count;
    const displayCount = count > 99 ? '99+' : String(count);
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
        anchor={{ x: 0.5, y: 0.5 }}
      >
        <View
          style={{
            width: 58,
            height: 58,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 77, 103, 0.22)',
            borderRadius: 29,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.18)',
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 12,
              },
              android: { elevation: 9 },
            }),
          }}
        >
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: '#0B1324',
              borderWidth: 2,
              borderColor: '#FF4D67',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: CLUSTER_FONT_SIZE }}>
              {displayCount}
            </Text>
          </View>
        </View>
        </Marker>
      );
  }, []);

  const hasSelection = selectedId != null;

  const mapProps = {
    initialRegion,
    mapType: 'standard' as const,
    showsUserLocation: false,
    showsMyLocationButton: false,
    showsCompass: false,
    showsScale: false,
    toolbarEnabled: false,
    rotateEnabled: false,
    pitchEnabled: false,
    mapPadding,
    clusterColor: CLUSTER_COLOR,
    radius: CLUSTER_RADIUS,
    extent: 512,
    minZoom: 0,
    maxZoom: 20,
    animationEnabled: false,
    onClusterPress: handleClusterPress,
    renderCluster,
    onPress: handleMapPress,
    onRegionChangeComplete: handleRegionChangeComplete,
  };

  const markers = useMemo(() => (
    <>
      {location.latitude != null && location.longitude != null && (
        <UserLocationMarker latitude={location.latitude} longitude={location.longitude} />
      )}
      {visibleRestaurants.map((r) => (
        <RestaurantMarkerMemo
          key={r.id}
          restaurant={r}
          coord={spiderOffsets.get(r.id) ?? coordOffsets.get(r.id) ?? { latitude: r.latitude, longitude: r.longitude }}
          isSelected={selectedId === r.id}
          hasSelection={hasSelection}
          tracksViewChanges={Platform.OS === 'android' ? (markerTracks || selectedId === r.id) : false}
          onPress={handleMarkerPress}
        />
      ))}
    </>
  ), [
    location.latitude,
    location.longitude,
    visibleRestaurants,
    coordOffsets,
    spiderOffsets,
    selectedId,
    mapExpanded,
    hasSelection,
    markerTracks,
    handleMarkerPress,
  ]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#070B14' }}>
      {!mapExpanded && (
        <View style={layoutStyles.mapFull}>
          <ClusteredMapView
            ref={mapRef}
            style={{ flex: 1 }}
            {...mapProps}
            initialRegion={mapRegion ?? initialRegion}
            customMapStyle={DARK_MAP_STYLE}
          >
            {markers}
          </ClusteredMapView>

          <View style={layoutStyles.topOverlay}>
            <View style={layoutStyles.topRow}>
              <Pressable
                style={layoutStyles.circleControl}
                onPress={() => navigation.navigate('Tabs', { screen: 'Profile' })}
                accessibilityRole="button"
                accessibilityLabel="Perfil"
              >
                <Ionicons name="person-outline" size={18} color="#E5E7EB" />
              </Pressable>

              <View style={layoutStyles.searchPill}>
                <Ionicons name="search" size={16} color="#9CA3AF" />
                <TextInput
                  value={searchQuery}
                  onChangeText={(text) => dispatch({ type: 'patch', payload: { searchQuery: text } })}
                  placeholder="Buscar en esta zona"
                  placeholderTextColor="#9CA3AF"
                  style={layoutStyles.searchInput}
                />
              </View>

              <Pressable
                style={layoutStyles.circleControl}
                onPress={handleMyLocation}
                accessibilityRole="button"
                accessibilityLabel="Ir a mi ubicacion"
              >
                <Ionicons name="navigate" size={18} color="#E5E7EB" />
              </Pressable>
            </View>

            <View style={layoutStyles.filterRow}>
              {IG_FILTERS.map((f) => {
                const active = activeFilter === f.value;
                return (
                  <Pressable
                    key={f.value}
                    style={[layoutStyles.filterPill, active && layoutStyles.filterPillActive]}
                    onPress={() =>
                      dispatch({
                        type: 'patch',
                        payload: {
                          activeFilter: f.value,
                          selectedId: null,
                          spiderCenterId: null,
                          refocusNonce: refocusNonce + 1,
                        },
                      })
                    }
                  >
                    <Ionicons name={f.icon} size={14} color={active ? '#FFFFFF' : '#D1D5DB'} />
                    <Text style={[layoutStyles.filterText, active && layoutStyles.filterTextActive]}>{f.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            style={layoutStyles.expandButton}
            onPress={() => dispatch({ type: 'patch', payload: { mapExpanded: true } })}
            accessibilityRole="button"
            accessibilityLabel="Expandir mapa"
          >
            <Ionicons name="expand-outline" size={18} color="#E5E7EB" />
          </Pressable>

          {loading && (
            <View style={layoutStyles.loadingOverlay}>
              <ActivityIndicator size="large" color="#FF5A5F" />
            </View>
          )}

          {visibleRestaurants.length === 0 && !error && !loading && (
            <View style={layoutStyles.emptyOverlay}>
              <Text style={layoutStyles.emptyTitle}>Tu mapa esta vacio</Text>
              <Text style={layoutStyles.emptySubtitle}>Guarda tu primer restaurante para empezar</Text>
            </View>
          )}

          {error && (
            <View style={layoutStyles.errorBanner}>
              <Text style={layoutStyles.errorText}>Error cargando restaurantes: {error}</Text>
            </View>
          )}
        </View>
      )}

      {!mapExpanded && !loading && pendingCount > 0 && (
        <MatchEntryCard
          pendingCount={pendingCount}
          onPress={() => navigation.navigate('Match')}
          bottomOffset={FAB_BOTTOM_OFFSET + 8}
        />
      )}

      {selectedRestaurant && !mapExpanded && (
        <MapDetailCard
          restaurant={selectedRestaurant}
          translateY={cardTranslateY}
          metaLine={metaLine}
          etaLoading={etaLoading}
          onClose={dismissCard}
          onDetail={() => {
            navigation.navigate('Detail', { restaurantId: selectedRestaurant.id });
            dismissCard();
          }}
          onNavigate={() =>
            openNativeNavigation(selectedRestaurant.latitude, selectedRestaurant.longitude, selectedRestaurant.name)
          }
        />
      )}

      <FAB onPress={() => navigation.navigate('Save')} bottomOffset={FAB_BOTTOM_OFFSET + 8} />

      {/* ====== Fullscreen Map Modal ====== */}
      <Modal
        visible={mapExpanded}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => dispatch({ type: 'patch', payload: { mapExpanded: false } })}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#070B14' }}>
          <View style={layoutStyles.modalHeader}>
            <Pressable style={layoutStyles.closeButton} onPress={() => dispatch({ type: 'patch', payload: { mapExpanded: false } })}>
              <Ionicons name="close" size={18} color="#E5E7EB" />
            </Pressable>
            <Text style={layoutStyles.modalTitle}>Explorar mapa</Text>
            <View style={{ width: 36 }} />
          </View>
          <ClusteredMapView
            ref={modalMapRef}
            style={{ flex: 1 }}
            {...mapProps}
            initialRegion={mapRegion ?? initialRegion}
            customMapStyle={DARK_MAP_STYLE}
          >
            {markers}
          </ClusteredMapView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const layoutStyles = StyleSheet.create({
  mapFull: {
    flex: 1,
    backgroundColor: '#070B14',
  },
  topOverlay: {
    position: 'absolute',
    top: 8,
    left: 12,
    right: 12,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 22,
    paddingHorizontal: 14,
    height: 44,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  searchInput: {
    flex: 1,
    color: '#F3F4F6',
    fontSize: 15,
    paddingVertical: 0,
  },
  circleControl: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  filterPillActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  filterText: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandButton: {
    position: 'absolute',
    top: 118,
    right: 12,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  emptyOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 110,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  emptyTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    color: '#CBD5E1',
    fontSize: 13,
  },
  errorBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 110,
    borderRadius: 14,
    backgroundColor: 'rgba(127, 29, 29, 0.92)',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    color: '#FEE2E2',
    fontSize: 13,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#070B14',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
  },
});
