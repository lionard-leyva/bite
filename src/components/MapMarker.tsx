import { memo } from 'react';
import { Text, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  MARKER_PIN_SIZE,
  MARKER_PIN_ICON_SIZE,
  MARKER_PIN_TAIL_WIDTH,
  MARKER_PIN_TAIL_HEIGHT,
  MARKER_SHADOW_RADIUS,
  MARKER_SHADOW_OPACITY,
  MARKER_BG_DEFAULT,
  MARKER_BG_SELECTED,
  MARKER_SELECTED_SCALE,
  MARKER_VISITED_ACCENT,
  MARKER_PENDING_ACCENT,
} from '../config/constants';

interface MapMarkerProps {
  name: string;
  rating: number;
  visited: boolean;
  isSelected: boolean;
}

const BORDER_W = 2;

function MapMarkerInner({ name, rating, visited, isSelected }: MapMarkerProps) {
  const bg = isSelected ? MARKER_BG_SELECTED : MARKER_BG_DEFAULT;
  const borderColor = bg;
  const scale = isSelected ? MARKER_SELECTED_SCALE : 1;
  const accentColor = visited ? MARKER_VISITED_ACCENT : MARKER_PENDING_ACCENT;

  const iconColor = isSelected ? '#FFFFFF' : accentColor;

  const shadow = Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: isSelected ? 0.28 : MARKER_SHADOW_OPACITY,
      shadowRadius: isSelected ? 10 : MARKER_SHADOW_RADIUS,
    },
    android: {
      elevation: isSelected ? 10 : 5,
    },
  });

  // Outer (border) triangle is slightly larger than inner (fill) triangle.
  // Use a container with explicit height so Android marker snapshots include the tail.
  const outerHalf = (MARKER_PIN_TAIL_WIDTH / 2) + BORDER_W;
  const outerH = MARKER_PIN_TAIL_HEIGHT + BORDER_W;
  const innerHalf = MARKER_PIN_TAIL_WIDTH / 2;
  const innerH = MARKER_PIN_TAIL_HEIGHT;
  const tailContainerH = MARKER_PIN_TAIL_HEIGHT + BORDER_W;

  return (
    <View style={{ alignItems: 'center', transform: [{ scale }] }}>
      <View style={{ alignItems: 'center', paddingBottom: tailContainerH }}>
        {/* Round pin head */}
        <View
          style={{
            width: MARKER_PIN_SIZE,
            height: MARKER_PIN_SIZE,
            borderRadius: MARKER_PIN_SIZE / 2,
            backgroundColor: bg,
            borderWidth: BORDER_W,
            borderColor,
            alignItems: 'center',
            justifyContent: 'center',
            ...shadow,
          }}
        >
          {/* Bite logo */}
          <Ionicons
            name="restaurant"
            size={MARKER_PIN_ICON_SIZE}
            color={iconColor}
          />

          {/* Rating: "3 ★" */}
          <Text
            style={{
              fontSize: 9,
              fontWeight: '800',
              color: '#FFFFFF',
              marginTop: 1,
            }}
          >
            {rating} {'\u2605'}
          </Text>
        </View>

        {/* Bordered pointy tail — outer (border color) + inner (fill) stacked */}
        <View style={{ position: 'absolute', bottom: 0, alignItems: 'center', height: tailContainerH }}>
          {/* Outer triangle (border) */}
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: outerHalf,
              borderRightWidth: outerHalf,
              borderTopWidth: outerH,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: borderColor,
            }}
          />
          {/* Inner triangle (fill) overlaid on top */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              width: 0,
              height: 0,
              borderLeftWidth: innerHalf,
              borderRightWidth: innerHalf,
              borderTopWidth: innerH,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: bg,
            }}
          />
        </View>
      </View>
    </View>
  );
}

export default memo(MapMarkerInner, (prev, next) =>
  prev.name === next.name &&
  prev.rating === next.rating &&
  prev.visited === next.visited &&
  prev.isSelected === next.isSelected,
);
