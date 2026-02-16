import { memo, useRef, useEffect } from 'react';
import { Animated, Text, View } from 'react-native';
import {
  PIN_PENDING,
  PIN_VISITED,
} from '../config/constants';

interface MapMarkerProps {
  rating: number;
  visited: boolean;
  isSelected: boolean;
  /** True when another marker is selected (dims this one) */
  dimmed: boolean;
}

function MapMarkerInner({ rating, visited, isSelected, dimmed }: MapMarkerProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: isSelected ? 1.18 : dimmed ? 0.85 : 1,
        useNativeDriver: true,
        friction: 7,
        tension: 120,
      }),
      Animated.timing(opacity, {
        toValue: dimmed ? 0.45 : 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isSelected, dimmed, scale, opacity]);

  const color = visited ? PIN_VISITED : PIN_PENDING;

  return (
    <Animated.View
      style={{
        transform: [{ scale }],
        opacity,
        backgroundColor: color,
        paddingHorizontal: 8,
        paddingTop: 6,
        paddingBottom: 5,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: isSelected ? 2.5 : 2,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: isSelected ? 3 : 1 },
        shadowOpacity: isSelected ? 0.35 : 0.25,
        shadowRadius: isSelected ? 5 : 2,
        elevation: isSelected ? 8 : 3,
        minWidth: 36,
      }}
    >
      <Text style={{ fontSize: 16, lineHeight: 18 }}>
        {'\u{1F374}'}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1 }}>
        <Text style={{ fontSize: 10, lineHeight: 12, color: '#fff', fontWeight: '800' }}>
          {'\u{2B50}'}{rating}
        </Text>
      </View>
    </Animated.View>
  );
}

export default memo(MapMarkerInner, (prev, next) =>
  prev.rating === next.rating &&
  prev.visited === next.visited &&
  prev.isSelected === next.isSelected &&
  prev.dimmed === next.dimmed,
);
