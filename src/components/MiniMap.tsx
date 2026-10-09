import { useEffect, useMemo, useRef } from 'react';
import { View, Text, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useTheme } from '../theme/ThemeProvider';
import { mapStyle } from '../theme/mapStyle';
import type { LatLng } from '../utils/saveRules';

interface MiniMapProps {
  location: LatLng;
  /** Texto del pin: el nombre del sitio o una pista ("Arrástrame"). */
  label: string;
  /** Con draggable el pin se arrastra y tocar el mapa lo mueve ahi. */
  draggable?: boolean;
  onMove?: (location: LatLng) => void;
  caption?: string | null;
  height?: number;
}

const DELTA = 0.008;

// Mapa pequeno de Guardar: ensena donde quedara el pin antes de guardar.
export default function MiniMap({ location, label, draggable = false, onMove, caption, height = 160 }: MiniMapProps) {
  const { colors } = useTheme();
  const mapRef = useRef<MapView>(null);
  const styleOfMap = useMemo(() => mapStyle(colors), [colors]);

  useEffect(() => {
    mapRef.current?.animateToRegion?.({ ...location, latitudeDelta: DELTA, longitudeDelta: DELTA }, 250);
  }, [location.latitude, location.longitude]);

  return (
    <View style={{ height, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.border }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={{ ...location, latitudeDelta: DELTA, longitudeDelta: DELTA }}
        customMapStyle={styleOfMap}
        // Apple Maps ignora customMapStyle: en iOS se pide claro y apagado, como el mapa principal.
        mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
        userInterfaceStyle="light"
        showsPointsOfInterests={false}
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        onPress={draggable ? (e) => onMove?.(e.nativeEvent.coordinate) : undefined}
        accessibilityLabel={`Mapa con el pin de ${label}`}
      >
        <Marker
          coordinate={location}
          draggable={draggable}
          onDragEnd={(e) => onMove?.(e.nativeEvent.coordinate)}
          anchor={{ x: 0.5, y: 1 }}
        >
          <View style={{ alignItems: 'center' }}>
            <View style={{ backgroundColor: colors.primary, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 6 }}>
              <Text numberOfLines={1} style={{ color: colors['on-primary'], fontFamily: 'Figtree_700Bold', fontSize: 13, maxWidth: 200 }}>
                {label}
              </Text>
            </View>
            <View style={{ width: 10, height: 10, marginTop: -6, borderRadius: 2, backgroundColor: colors.primary, transform: [{ rotate: '45deg' }] }} />
          </View>
        </Marker>
      </MapView>
      {!!caption && (
        <View style={{ position: 'absolute', left: 10, bottom: 10, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ fontFamily: 'Figtree_700Bold', fontSize: 12, color: colors['text-primary'] }}>{caption}</Text>
        </View>
      )}
    </View>
  );
}
