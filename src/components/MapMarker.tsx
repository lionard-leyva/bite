import { memo, useRef, useEffect } from 'react';
import { View, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  MARKER_SIZE_DEFAULT,
  PIN_PENDING,
  PIN_VISITED,
} from '../config/constants';

interface MapMarkerProps {
  visited: boolean;
  isSelected: boolean;
}

function MapMarkerInner({ visited, isSelected }: MapMarkerProps) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isSelected ? 1.22 : 1,
      useNativeDriver: true,
      friction: 6,
    }).start();
  }, [isSelected, scale]);

  const color = visited ? PIN_VISITED : PIN_PENDING;
  const size = MARKER_SIZE_DEFAULT;
  const half = size / 2;

  return (
    <Animated.View
      style={{
        transform: [{ scale }],
        width: size,
        height: size,
        borderRadius: half,
        backgroundColor: color,
        borderWidth: 2.5,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: isSelected ? 3 : 1 },
        shadowOpacity: isSelected ? 0.35 : 0.25,
        shadowRadius: isSelected ? 4 : 2,
        elevation: isSelected ? 8 : 3,
      }}
    >
      <Ionicons name="restaurant" size={18} color="#fff" />
    </Animated.View>
  );
}

export default memo(MapMarkerInner, (prev, next) =>
  prev.visited === next.visited && prev.isSelected === next.isSelected,
);
