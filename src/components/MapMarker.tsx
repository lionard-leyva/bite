import { memo } from 'react';
import { Text, View, Platform, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  MARKER_SHADOW_RADIUS,
  MARKER_SHADOW_OPACITY,
  MARKER_VISITED_ACCENT,
} from '../config/constants';

interface MapMarkerProps {
  name: string;
  visited: boolean;
  isSelected: boolean;
  photoUri?: string | null;
}

const MARKER_SIZE_BASE = 40;
const MARKER_SIZE_SELECTED = 54;
const RING_COLOR_ACTIVE = '#FF4D67';
const RING_COLOR_PENDING = '#D1D5DB';
const LABEL_BG = 'rgba(8, 12, 20, 0.95)';

function MapMarkerInner({ name, visited, isSelected, photoUri }: MapMarkerProps) {
  const size = isSelected ? MARKER_SIZE_SELECTED : MARKER_SIZE_BASE;
  const ringColor = isSelected
    ? RING_COLOR_ACTIVE
    : (visited ? MARKER_VISITED_ACCENT : RING_COLOR_PENDING);

  const shadow = Platform.select({
    ios: {
      shadowColor: '#000',
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
        { width: size + 16, height: size + 14, transform: [{ translateY: isSelected ? -8 : 0 }] },
      ]}
    >
      <View collapsable={false} style={styles.inner}>
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
            <LinearGradient
              colors={['#FFD76A', '#FF8A00', '#FF3366', '#B620E0']}
              start={{ x: 0.05, y: 0.15 }}
              end={{ x: 0.95, y: 0.85 }}
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: size - 4,
                  height: size - 4,
                  borderRadius: (size - 4) / 2,
                  backgroundColor: '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View
                  style={{
                    width: size - 8,
                    height: size - 8,
                    borderRadius: (size - 8) / 2,
                    backgroundColor: '#0F172A',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {photoUri ? (
                    <Image
                      source={{ uri: photoUri }}
                      style={{ width: size - 10, height: size - 10, borderRadius: (size - 10) / 2 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={{ color: '#F9FAFB', fontWeight: '800', fontSize: 16 }}>
                      {initial}
                    </Text>
                  )}
                </View>
              </View>
            </LinearGradient>
          ) : (
            <View
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: '#0F172A',
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
                <Text style={{ color: '#F9FAFB', fontWeight: '800', fontSize: 13 }}>
                  {initial}
                </Text>
              )}
            </View>
          )}
          <View
            style={{
              position: 'absolute',
              right: 2,
              bottom: 2,
              width: 11,
              height: 11,
              borderRadius: 5.5,
              backgroundColor: visited ? '#22C55E' : '#EF4444',
              borderWidth: 1.5,
              borderColor: '#FFFFFF',
            }}
          />
        </View>

        {isSelected && (
          <View pointerEvents="none" style={[styles.selectedLabel, { top: size + 7 }]}>
            <Text
              numberOfLines={1}
              style={{ color: '#F3F4F6', fontSize: 12, fontWeight: '700', lineHeight: 15 }}
            >
              {name}
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800', marginTop: 1, lineHeight: 15 }}>
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
    maxWidth: 148,
    borderRadius: 14,
    backgroundColor: LABEL_BG,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
  },
});
