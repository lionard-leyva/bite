import React, { useReducer, useMemo, useRef, useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator, Pressable, Platform, Animated, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ClusteredMapView from 'react-native-map-clustering';
import { Marker, type Region } from 'react-native-maps';
import MapView from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRestaurants } from '../hooks/useRestaurants';
import { useLocation } from '../hooks/useLocation';
import { useNavigationETA } from '../hooks/useNavigationETA';
import { timeAgo } from '../utils/timeAgo';
import { openNativeNavigation, haversineKm, formatDistance } from '../services/navigationService';
import FAB from '../components/FAB';
import MapMarker from '../components/MapMarker';
import UserLocationMarker from '../components/UserLocationMarker';
import HomeHeader from '../components/HomeHeader';
import type { FilterValue } from '../components/FilterButtons';
import type { RootStackParamList } from '../navigation/types';
import type { Restaurant } from '../types';
import {
  CLUSTER_RADIUS,
  CLUSTER_COLOR,
  CLUSTER_FONT_SIZE,
  FAB_BOTTOM_OFFSET,
  LOCATION_BUTTON_SIZE,
  Z_MARKER,
  Z_MARKER_SELECTED,
  Z_CLUSTER,
  Z_FAB,
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
  MAP_CARD_MARGIN_H,
  MAP_CARD_MARGIN_TOP,
  MAP_CARD_MARGIN_BOTTOM,
  MAP_CARD_BORDER_RADIUS,
  MAP_CARD_BG,
  EXPAND_BUTTON_SIZE,
  EXPAND_BUTTON_RADIUS,
} from '../config/constants';
import MapDetailCard from '../components/MapDetailCard';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const COORD_PRECISION = 5;
const OFFSET_STEP = 0.00015;

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
      anchor={{ x: 0.5, y: 1 }}
      zIndex={isSelected ? Z_MARKER_SELECTED : Z_MARKER}
      opacity={hasSelection && !isSelected ? 0.45 : 1}
      stopPropagation
      onPress={() => onPress(restaurant)}
    >
      <MapMarker
        name={restaurant.name}
        rating={restaurant.rating}
        visited={restaurant.visited}
        isSelected={isSelected}
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
  prev.restaurant.rating === next.restaurant.rating &&
  prev.restaurant.visited === next.restaurant.visited,
);

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
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
  const { selectedId, mapExpanded, searchQuery, activeFilter, mapRegion, markerTracks } = state;
  const selectedIdRef = useRef<string | null>(null);
  const cardTranslateY = useRef(new Animated.Value(SHEET_DISMISS_TRANSLATE)).current;
  const suppressMapPressRef = useRef(false);
  const modalMapRef = useRef<MapView>(null);

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

  // Android: ensure custom marker views render at least once.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    dispatch({ type: 'patch', payload: { markerTracks: true } });
  }, [visibleRestaurants.length]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (!markerTracks) return;
    const t = setTimeout(() => dispatch({ type: 'patch', payload: { markerTracks: false } }), 400);
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
      dispatch({ type: 'patch', payload: { selectedId: null } });
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
    suppressMapPressRef.current = true;
    if (selectedIdRef.current === r.id) {
      dismissCard();
    } else {
      dispatch({ type: 'patch', payload: { selectedId: r.id } });
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
    setTimeout(() => {
      suppressMapPressRef.current = false;
    }, 0);
  }, [dismissCard]);

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
            backgroundColor: '#FF3B30',
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
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' }}>
              sitios
            </Text>
          </View>
        </Marker>
      );
  }, []);

  const hasSelection = selectedId != null;

  const distanceText = useMemo(() => {
    if (!selectedRestaurant || location.latitude == null || location.longitude == null) return null;
    const km = haversineKm(
      location.latitude, location.longitude,
      selectedRestaurant.latitude, selectedRestaurant.longitude,
    );
    return formatDistance(km);
  }, [selectedRestaurant, location.latitude, location.longitude]);

  const metaLine = useMemo(() => {
    if (!selectedRestaurant) return '';
    const parts: string[] = [];
    const dist = etaInfoText || distanceText;
    if (dist) parts.push(dist);
    parts.push(timeAgo(selectedRestaurant.createdAt));
    if (selectedRestaurant.pricePerPerson) {
      parts.push(`${'\u20AC'}${selectedRestaurant.pricePerPerson}`);
    }
    return parts.join(' \u00B7 ');
  }, [selectedRestaurant, etaInfoText, distanceText]);

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
          key={`${r.id}:${selectedId === r.id ? 'sel' : 'base'}`}
          restaurant={r}
          coord={coordOffsets.get(r.id) ?? { latitude: r.latitude, longitude: r.longitude }}
          isSelected={selectedId === r.id}
          hasSelection={hasSelection}
          tracksViewChanges={Platform.OS === 'android' ? markerTracks : false}
          onPress={handleMarkerPress}
        />
      ))}
    </>
  ), [
    location.latitude,
    location.longitude,
    visibleRestaurants,
    coordOffsets,
    selectedId,
    hasSelection,
    markerTracks,
    handleMarkerPress,
  ]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* HEADER */}
      <HomeHeader
        city={location.city ?? 'Tu zona'}
        searchQuery={searchQuery}
        onSearchChange={(text) => dispatch({ type: 'patch', payload: { searchQuery: text } })}
        activeFilter={activeFilter}
        onFilterChange={(value) => dispatch({ type: 'patch', payload: { activeFilter: value } })}
        onProfilePress={() => navigation.navigate('Tabs', { screen: 'Profile' })}
      />

      {/* MAP CARD */}
      {!mapExpanded && (
        loading ? (
          <View style={[layoutStyles.mapCard, { alignItems: 'center', justifyContent: 'center' }]}>
            <ActivityIndicator size="large" color="#FF5A5F" />
          </View>
        ) : (
          <View style={layoutStyles.mapCard}>
          <ClusteredMapView
            ref={mapRef}
            style={{ flex: 1 }}
            {...mapProps}
            initialRegion={mapRegion ?? initialRegion}
          >
            {markers}
          </ClusteredMapView>

            {/* Expand button */}
            <Pressable
              style={layoutStyles.expandButton}
            onPress={() => dispatch({ type: 'patch', payload: { mapExpanded: true } })}
              accessibilityRole="button"
              accessibilityLabel="Expandir mapa"
            >
              <Ionicons name="expand-outline" size={18} color="#222222" />
            </Pressable>

            {/* Location button inside map card */}
            <Pressable
              onPress={handleMyLocation}
              style={layoutStyles.locationButton}
              accessibilityRole="button"
              accessibilityLabel="Ir a mi ubicacion"
            >
              <Ionicons name="navigate" size={20} color="#484848" />
            </Pressable>

            {/* Empty state inside map card */}
            {visibleRestaurants.length === 0 && !error && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
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
          </View>
        )
      )}

      {/* Error banner */}
      {error && (
        <View style={{ marginHorizontal: 16, marginTop: 8, borderRadius: 12, backgroundColor: '#FEE2E2', paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#FECACA' }}>
          <Text style={{ fontSize: 14, color: '#991B1B' }}>
            Error cargando restaurantes: {error}
          </Text>
        </View>
      )}

      {/* ====== Bottom card — compact detail ====== */}
      {selectedRestaurant && (
        <MapDetailCard
          restaurant={selectedRestaurant}
          translateY={cardTranslateY}
          metaLine={metaLine}
          etaLoading={etaLoading}
          onClose={dismissCard}
          onDetail={() => {
            navigation.navigate('Detail', { restaurantId: selectedRestaurant.id });
            dispatch({ type: 'patch', payload: { selectedId: null } });
          }}
          onNavigate={() =>
            openNativeNavigation(
              selectedRestaurant.latitude,
              selectedRestaurant.longitude,
              selectedRestaurant.name,
            )
          }
        />
      )}

      <FAB onPress={() => navigation.navigate('Save')} bottomOffset={FAB_BOTTOM_OFFSET} />

      {/* ====== Fullscreen Map Modal ====== */}
      <Modal
        visible={mapExpanded}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => dispatch({ type: 'patch', payload: { mapExpanded: false } })}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <View style={layoutStyles.modalHeader}>
            <Pressable style={layoutStyles.closeButton} onPress={() => dispatch({ type: 'patch', payload: { mapExpanded: false } })}>
              <Ionicons name="close" size={18} color="#222222" />
            </Pressable>
            <Text style={layoutStyles.modalTitle}>Mapa</Text>
            <View style={{ width: 36 }} />
          </View>
          <ClusteredMapView
            ref={modalMapRef}
            style={{ flex: 1 }}
            {...mapProps}
            initialRegion={mapRegion ?? initialRegion}
          >
            {markers}
          </ClusteredMapView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const layoutStyles = StyleSheet.create({
  mapCard: {
    marginHorizontal: MAP_CARD_MARGIN_H,
    marginTop: MAP_CARD_MARGIN_TOP,
    marginBottom: MAP_CARD_MARGIN_BOTTOM,
    borderRadius: MAP_CARD_BORDER_RADIUS,
    overflow: 'hidden',
    flex: 1,
    backgroundColor: MAP_CARD_BG,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  expandButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: EXPAND_BUTTON_SIZE,
    height: EXPAND_BUTTON_SIZE,
    borderRadius: EXPAND_BUTTON_RADIUS,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  locationButton: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    width: LOCATION_BUTTON_SIZE,
    height: LOCATION_BUTTON_SIZE,
    borderRadius: LOCATION_BUTTON_SIZE / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222222',
  },
});
