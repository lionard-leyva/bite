import React, { useReducer, useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable, Platform, StyleSheet, TextInput, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ClusteredMapView from 'react-native-map-clustering';
import { Marker, type Region } from 'react-native-maps';
import MapView from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRestaurants } from '../hooks/useRestaurants';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from '../hooks/useLocation';
import { useNavigationETA } from '../hooks/useNavigationETA';
import FAB from '../components/FAB';
import MapDetailCard from '../components/MapDetailCard';
import LocationNotice from '../components/LocationNotice';
import MapMarker, { markerAnchorY } from '../components/MapMarker';
import UserLocationMarker from '../components/UserLocationMarker';
import FilterButtons, { type FilterValue } from '../components/FilterButtons';
import AvatarStack from '../components/AvatarStack';
import { useListMembers } from '../hooks/useListMembers';
import type { RootStackParamList, TabParamList } from '../navigation/types';
import type { Restaurant } from '../types';
import { formatDistance, haversineKm, openNativeNavigation } from '../services/navigationService';
import { useTheme } from '../theme/ThemeProvider';
import { matchesQuery } from '../utils/searchMatch';
import { savedByLabel } from '../utils/savedBy';
import { priceSymbols } from '../utils/price';
import { focusTargets, newRestaurantToFocus } from '../utils/mapFocus';
import { mapStyle } from '../theme/mapStyle';
import type { Colors } from '../theme/palette';
import { locationNotice, locationButtonState } from '../utils/locationNotice';
import {
  CLUSTER_RADIUS,
  CLUSTER_FONT_SIZE,
  FAB_BOTTOM_OFFSET,
  FAB_SIZE,
  Z_MARKER,
  Z_MARKER_SELECTED,
  Z_CLUSTER,
  EDGE_PADDING_TOP,
  EDGE_PADDING_RIGHT,
  EDGE_PADDING_BOTTOM,
  EDGE_PADDING_LEFT,
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
      anchor={{ x: 0.5, y: markerAnchorY(isSelected) }}
      zIndex={isSelected ? Z_MARKER_SELECTED : (Z_MARKER + 1)}
      opacity={1}
      stopPropagation
      onPress={() => onPress(restaurant)}
    >
      <MapMarker name={restaurant.name} visited={restaurant.visited} isSelected={isSelected} />
    </Marker>
  );
}, (prev, next) =>
  prev.isSelected === next.isSelected &&
  prev.hasSelection === next.hasSelection &&
  prev.tracksViewChanges === next.tracksViewChanges &&
  prev.coord.latitude === next.coord.latitude &&
  prev.coord.longitude === next.coord.longitude &&
  prev.restaurant.name === next.restaurant.name &&
  prev.restaurant.visited === next.restaurant.visited,
);

export default function HomeScreen() {
  const { colors } = useTheme();
  const layoutStyles = useMemo(() => makeStyles(colors), [colors]);
  const styleOfMap = useMemo(() => mapStyle(colors), [colors]);
  const navigation = useNavigation<Nav>();
  const route = useRoute<HomeRoute>();
  const focusRestaurantId = route.params?.focusRestaurantId;
  const { restaurants: rawRestaurants, loading, error } = useRestaurants({ mode: 'all' });
  const { userId, listId, skipMode } = useAuth();
  const members = useListMembers(listId, !skipMode);
  const insets = useSafeAreaInsets();
  const location = useLocation();
  // El aviso de ubicacion solo sale tras pulsar el boton (ver utils/locationNotice).
  const [locationAsked, setLocationAsked] = useState(false);
  const locationBanner = locationNotice(location.errorKind, locationAsked);
  const locationButton = locationButtonState(location.errorKind);
  const mapRef = useRef<MapView>(null);
  const hasInitiallyFit = useRef(false);

  interface HomeState {
    selectedId: string | null;
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
  const { selectedId, searchQuery, activeFilter, mapRegion, markerTracks, refocusNonce, spiderCenterId } = state;
  const selectedIdRef = useRef<string | null>(null);
  const cardTranslateY = useRef(new Animated.Value(SHEET_DISMISS_TRANSLATE)).current;
  const suppressMapPressRef = useRef(false);
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
      filtered = filtered.filter(r => matchesQuery(r, searchQuery));
    }

    return filtered;
  }, [restaurants, activeFilter, searchQuery]);

  // Android: ensure custom marker views render at least once and when map surface changes
  // (compact card <-> fullscreen modal) to avoid stale/corrupted marker snapshots.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    dispatch({ type: 'patch', payload: { markerTracks: true } });
  }, [visibleRestaurants.length, selectedId]);

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
    // Como en el diseno: "★ 4 · €€ · a 6 min" (la estrella la pone la tarjeta).
    const price = priceSymbols(selectedRestaurant.pricePerPerson);
    if (price) parts.push(price);
    if (dist) parts.push(dist);
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

  const userPoint = useMemo(
    () => (location.latitude != null && location.longitude != null ? { latitude: location.latitude, longitude: location.longitude } : null),
    [location.latitude, location.longitude],
  );

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
    const coords = focusTargets(visibleRestaurants, userPoint).map((r) => ({
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

    const targetMap = mapRef.current;
    if (!targetMap) return;

    // Primer encuadre: la zona donde estas o donde guardaste lo ultimo. Buscar o filtrar: todo lo que coincide.
    const firstFocus = !hasAutoFocusedRef.current;
    const coords = (firstFocus ? focusTargets(visibleRestaurants, userPoint) : visibleRestaurants).map((r) => ({
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
  }, [visibleIdsKey, activeFilter, searchQuery, loading, visibleRestaurants, refocusNonce]);

  // Al guardar un restaurante y volver al mapa, se enfoca el nuevo aunque quede lejos del resto.
  const knownIdsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (loading) return;
    // Solo los que guarda quien tiene el movil: lo que anade la pareja en tiempo real no mueve el mapa.
    const target = newRestaurantToFocus(knownIdsRef.current, restaurants.filter((r) => r.createdBy === userId));
    knownIdsRef.current = new Set(restaurants.map((r) => r.id));
    if (!target) return;
    const targetMap = mapRef.current;
    targetMap?.animateToRegion(
      { latitude: target.latitude, longitude: target.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      350,
    );
  }, [restaurants, loading, userId]);

  const handleMyLocation = useCallback(async () => {
    setLocationAsked(true);
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
    const targetMap = mapRef.current;
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
  }, [visibleRestaurants, coordOffsets, mapRegion, initialRegion]);

  // "Ver en mapa" from MatchScreen: select the matched restaurant once it is visible.
  const handledFocusRef = useRef<string | null>(null);
  useEffect(() => {
    if (!focusRestaurantId || handledFocusRef.current === focusRestaurantId) return;
    const target = restaurantMap.get(focusRestaurantId);
    if (!target) return;
    handledFocusRef.current = focusRestaurantId;
    handleMarkerPress(target);
  }, [focusRestaurantId, restaurantMap, handleMarkerPress]);

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
            backgroundColor: colors['primary-light'],
            borderRadius: 29,
            ...Platform.select({
              ios: {
                shadowColor: colors['text-primary'],
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
              backgroundColor: colors.surface,
              borderWidth: 2,
              borderColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors['text-primary'], fontWeight: '900', fontSize: CLUSTER_FONT_SIZE }}>
              {displayCount}
            </Text>
          </View>
        </View>
        </Marker>
      );
  }, [colors]);

  const hasSelection = selectedId != null;

  const mapProps = {
    initialRegion,
    // Apple Maps ignora customMapStyle: en iOS se pide claro y apagado, lo mas cerca del mapa crema del diseno.
    mapType: (Platform.OS === 'ios' ? 'mutedStandard' : 'standard') as 'mutedStandard' | 'standard',
    userInterfaceStyle: 'light' as const,
    showsPointsOfInterests: false,
    showsUserLocation: false,
    showsMyLocationButton: false,
    showsCompass: false,
    showsScale: false,
    toolbarEnabled: false,
    rotateEnabled: false,
    pitchEnabled: false,
    mapPadding,
    clusterColor: colors.primary,
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
    hasSelection,
    markerTracks,
    handleMarkerPress,
  ]);

  // Botones flotantes abajo a la derecha: guardar (+) y, encima, volver a mi ubicacion.
  const fabBottom = FAB_BOTTOM_OFFSET + 8;
  const avatarNames = members.length > 1 ? members.map((m) => m.displayName || m.email || '') : [];

  return (
    <View style={layoutStyles.mapFull}>
      {/* Mapa de borde a borde: los controles flotan encima respetando la barra de estado. */}
      <ClusteredMapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        {...mapProps}
        initialRegion={mapRegion ?? initialRegion}
        customMapStyle={styleOfMap}
      >
        {markers}
      </ClusteredMapView>

      <View style={[layoutStyles.topOverlay, { top: insets.top + 8 }]}>
        <View style={layoutStyles.searchPill}>
          <Ionicons name="search" size={18} color={colors['text-secondary']} />
          <TextInput
            value={searchQuery}
            onChangeText={(text) => dispatch({ type: 'patch', payload: { searchQuery: text } })}
            placeholder="Buscar en esta zona"
            placeholderTextColor={colors['text-secondary']}
            style={layoutStyles.searchInput}
          />
          {avatarNames.length > 0 && <AvatarStack names={avatarNames} size={24} filled />}
        </View>

        <FilterButtons
          floating
          active={activeFilter}
          onSelect={(value) =>
            dispatch({
              type: 'patch',
              payload: { activeFilter: value, selectedId: null, spiderCenterId: null, refocusNonce: refocusNonce + 1 },
            })
          }
        />

        {locationBanner && (
          <LocationNotice notice={locationBanner} onDismiss={() => setLocationAsked(false)} />
        )}
      </View>

      {loading && (
        <View style={layoutStyles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
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
          <Text style={layoutStyles.errorText}>No pudimos cargar tus restaurantes. Revisa tu conexión.</Text>
        </View>
      )}

      {selectedRestaurant && (
        <MapDetailCard
          restaurant={selectedRestaurant}
          translateY={cardTranslateY}
          metaLine={metaLine}
          etaLoading={etaLoading}
          savedBy={savedByLabel(selectedRestaurant.createdBy, members, userId)}
          avatarNames={avatarNames}
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

      {!selectedRestaurant && (
        <Pressable
          style={[layoutStyles.locationButton, { bottom: fabBottom + FAB_SIZE + 12 }, locationButton.dimmed && layoutStyles.circleControlDim]}
          onPress={handleMyLocation}
          accessibilityRole="button"
          accessibilityLabel={locationButton.label}
        >
          <Ionicons name="navigate" size={18} color={locationButton.dimmed ? colors['text-tertiary'] : colors['text-primary']} />
        </Pressable>
      )}

      <FAB onPress={() => navigation.navigate('Save')} bottomOffset={fabBottom} />
    </View>
  );
}

function makeStyles(c: Colors) {
  // Una sola elevacion para todo lo que flota sobre el mapa: sombra suave, sin borde.
  const float = {
    backgroundColor: c.surface,
    shadowColor: c['text-primary'],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  } as const;
  return StyleSheet.create({
    mapFull: { flex: 1, backgroundColor: c.background },
    topOverlay: { position: 'absolute', left: 12, right: 12, gap: 8 },
    searchPill: {
      ...float,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 999,
      paddingHorizontal: 16,
      minHeight: 48,
    },
    searchInput: { flex: 1, color: c['text-primary'], fontSize: 15, fontFamily: 'Figtree_400Regular', paddingVertical: 10 },
    locationButton: {
      ...float,
      position: 'absolute',
      right: 24,
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    circleControlDim: { opacity: 0.6 },
    loadingOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
    emptyOverlay: {
      ...float,
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 110,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    emptyTitle: { color: c['text-primary'], fontSize: 17, fontFamily: 'YoungSerif_400Regular', marginBottom: 4 },
    emptySubtitle: { color: c['text-secondary'], fontSize: 13, fontFamily: 'Figtree_400Regular' },
    errorBanner: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 110,
      borderRadius: 14,
      backgroundColor: c.danger,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    errorText: { color: c['on-danger'], fontSize: 13 },
  });
}
