import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { Marker } from 'react-native-maps';
import {
  USER_DOT_COLOR,
  USER_DOT_OUTER_SIZE,
  USER_DOT_INNER_SIZE,
  USER_DOT_PULSE_SCALE,
  USER_DOT_PULSE_DURATION,
  Z_USER_LOCATION,
} from '../config/constants';

interface UserLocationMarkerProps {
  latitude: number;
  longitude: number;
}

export default function UserLocationMarker({ latitude, longitude }: UserLocationMarkerProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.4)).current;
  const [trackChanges, setTrackChanges] = useState(true);

  useEffect(() => {
    // Stop tracking bitmap changes after initial render — animation uses native driver
    const timer = setTimeout(() => setTrackChanges(false), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: USER_DOT_PULSE_SCALE,
            duration: USER_DOT_PULSE_DURATION / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: USER_DOT_PULSE_DURATION / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0.1,
            duration: USER_DOT_PULSE_DURATION / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.4,
            duration: USER_DOT_PULSE_DURATION / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim, opacityAnim]);

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={trackChanges}
      zIndex={Z_USER_LOCATION}
    >
      <View
        style={{
          width: USER_DOT_OUTER_SIZE,
          height: USER_DOT_OUTER_SIZE,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Pulsing outer ring */}
        <Animated.View
          style={{
            position: 'absolute',
            width: USER_DOT_OUTER_SIZE,
            height: USER_DOT_OUTER_SIZE,
            borderRadius: USER_DOT_OUTER_SIZE / 2,
            backgroundColor: USER_DOT_COLOR,
            opacity: opacityAnim,
            transform: [{ scale: pulseAnim }],
          }}
        />
        {/* Inner solid dot */}
        <View
          style={{
            width: USER_DOT_INNER_SIZE,
            height: USER_DOT_INNER_SIZE,
            borderRadius: USER_DOT_INNER_SIZE / 2,
            backgroundColor: USER_DOT_COLOR,
            borderWidth: 2,
            borderColor: '#FFFFFF',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            elevation: 3,
          }}
        />
      </View>
    </Marker>
  );
}
