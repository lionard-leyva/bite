import { memo } from 'react';
import { Text, View, Platform, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { MARKER_SHADOW_RADIUS, MARKER_SHADOW_OPACITY } from '../config/constants';

interface MapMarkerProps {
  name: string;
  visited: boolean;
  isSelected: boolean;
}

const PILL_HEIGHT = 30;
const PILL_HEIGHT_SELECTED = 36;
const POINTER = 5; // el piquito que apunta al sitio
const PAD = 6; // margen para la sombra
const WIDTH = 64;
const WIDTH_SELECTED = 200;
const EMOJI = '🍽';

// Fraccion vertical del piquito dentro del contenedor, para anclar el marker justo en el sitio.
export function markerAnchorY(isSelected: boolean) {
  const h = isSelected ? PILL_HEIGHT_SELECTED : PILL_HEIGHT;
  return (PAD + h + POINTER) / (PAD + h + POINTER + PAD);
}

// Diseno Terracota: pildora terracota con el emoji si esta pendiente; blanca con borde salvia y ✓ si ya fuimos;
// la elegida, algo mas grande y con el nombre.
function MapMarkerInner({ name, visited, isSelected }: MapMarkerProps) {
  const { colors } = useTheme();
  const h = isSelected ? PILL_HEIGHT_SELECTED : PILL_HEIGHT;
  const fill = visited ? colors.surface : colors.primary;
  const ink = visited ? colors['text-primary'] : colors['on-primary'];
  const border = visited ? { borderWidth: 2, borderColor: colors.visited } : {};

  const shadow = Platform.select({
    ios: {
      shadowColor: colors['text-primary'],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isSelected ? 0.3 : MARKER_SHADOW_OPACITY,
      shadowRadius: isSelected ? 10 : MARKER_SHADOW_RADIUS,
    },
    android: { elevation: isSelected ? 10 : 5 },
  });

  return (
    <View
      collapsable={false}
      style={[styles.container, { width: isSelected ? WIDTH_SELECTED : WIDTH, height: PAD + h + POINTER + PAD }]}
    >
      <View
        testID="pin"
        style={{
          marginTop: PAD,
          height: h,
          maxWidth: (isSelected ? WIDTH_SELECTED : WIDTH) - PAD * 2,
          paddingHorizontal: isSelected ? 12 : 9,
          borderRadius: h / 2,
          backgroundColor: fill,
          ...border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          ...shadow,
        }}
      >
        <Text style={{ fontSize: isSelected ? 15 : 13 }}>{EMOJI}</Text>
        {visited && !isSelected && (
          <Text style={{ color: colors.visited, fontSize: 12, fontFamily: 'Figtree_700Bold' }}>✓</Text>
        )}
        {isSelected && (
          <Text numberOfLines={1} style={{ flexShrink: 1, color: ink, fontSize: 14, fontFamily: 'Figtree_700Bold' }}>
            {name}
          </Text>
        )}
      </View>
      <View
        style={{
          width: 10,
          height: 10,
          marginTop: -6,
          backgroundColor: fill,
          borderRadius: 2,
          transform: [{ rotate: '45deg' }],
          ...(visited ? { borderRightWidth: 2, borderBottomWidth: 2, borderColor: colors.visited } : {}),
        }}
      />
    </View>
  );
}

export default memo(MapMarkerInner, (prev, next) =>
  prev.name === next.name && prev.visited === next.visited && prev.isSelected === next.isSelected,
);

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'flex-start', overflow: 'visible' },
});
