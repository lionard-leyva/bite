import { memo } from 'react';
import { Text, View, Platform, Image, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { MARKER_SHADOW_RADIUS, MARKER_SHADOW_OPACITY } from '../config/constants';

interface MapMarkerProps {
  name: string;
  visited: boolean;
  isSelected: boolean;
  photoUri?: string | null;
}

const MARKER_SIZE_BASE = 30;
const MARKER_SIZE_SELECTED = 42;
const LABEL_HEIGHT = 40;
const LABEL_GAP = 4;
const LABEL_WIDTH = 150;
const PAD = 4;

// Fraccion vertical del circulo dentro del contenedor, para anclar el marker en su base.
export function markerAnchorY(isSelected: boolean) {
  const size = isSelected ? MARKER_SIZE_SELECTED : MARKER_SIZE_BASE;
  const total = size + PAD * 2 + (isSelected ? LABEL_GAP + LABEL_HEIGHT : 0);
  return (size + PAD) / total;
}
function MapMarkerInner({ name, visited, isSelected, photoUri }: MapMarkerProps) {
  const { colors } = useTheme();
  const size = isSelected ? MARKER_SIZE_SELECTED : MARKER_SIZE_BASE;
  // Visitado en salvia, pendiente en terracota; el seleccionado lleva el aro grueso de la marca.
  const ringColor = visited ? colors.visited : colors.primary;

  const shadow = Platform.select({
    ios: {
      shadowColor: colors['text-primary'],
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: isSelected ? 0.28 : MARKER_SHADOW_OPACITY,
      shadowRadius: isSelected ? 12 : MARKER_SHADOW_RADIUS,
    },
    android: {
      elevation: isSelected ? 12 : 6,
    },
  });

  const initial = name.trim().charAt(0).toUpperCase() || 'B';

  return (
    <View
      collapsable={false}
      style={[
        styles.container,
        {
          width: isSelected ? LABEL_WIDTH + PAD * 2 : size + PAD * 2,
          height: size + PAD * 2 + (isSelected ? LABEL_GAP + LABEL_HEIGHT : 0),
        },
      ]}
    >
      <View collapsable={false} style={[styles.inner, { marginTop: PAD }]}>
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
            ...shadow,
          }}
        >
          {isSelected ? (
            <View
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: colors.surface,
                borderWidth: 4,
                borderColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: size - 12, height: size - 12, borderRadius: (size - 12) / 2 }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={{ color: colors['text-primary'], fontWeight: '800', fontSize: 14 }}>
                  {initial}
                </Text>
              )}
            </View>
          ) : (
            <View
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: colors.surface,
                borderWidth: 2,
                borderColor: ringColor,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: size - 7, height: size - 7, borderRadius: (size - 7) / 2 }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={{ color: colors['text-primary'], fontWeight: '800', fontSize: 11 }}>
                  {initial}
                </Text>
              )}
            </View>
          )}
          <View
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              width: 11,
              height: 11,
              borderRadius: 5.5,
              backgroundColor: visited ? colors.visited : colors.primary,
              borderWidth: 1.5,
              borderColor: colors.surface,
            }}
          />
        </View>

        {isSelected && (
          <View pointerEvents="none" style={[styles.selectedLabel, { top: size + LABEL_GAP, backgroundColor: colors['text-primary'] }]}>
            <Text
              numberOfLines={1}
              style={{ color: colors.background, fontSize: 12, fontWeight: '700', lineHeight: 15 }}
            >
              {name}
            </Text>
            <Text style={{ color: colors['primary-light'], fontSize: 12, fontWeight: '800', marginTop: 1, lineHeight: 15 }}>
              Ver mas
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default memo(MapMarkerInner, (prev, next) =>
  prev.name === next.name &&
  prev.visited === next.visited &&
  prev.isSelected === next.isSelected &&
  prev.photoUri === next.photoUri,
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'visible',
  },
  inner: {
    overflow: 'visible',
    alignItems: 'center',
    position: 'relative',
  },
  selectedLabel: {
    position: 'absolute',
    minWidth: 90,
    maxWidth: LABEL_WIDTH,
    height: LABEL_HEIGHT,
    justifyContent: 'center',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
  },
});
