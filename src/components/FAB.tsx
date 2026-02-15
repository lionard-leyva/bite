import { useRef } from 'react';
import { Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FABProps {
  onPress: () => void;
}

export default function FAB({ onPress }: FABProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  function onPressIn() {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  }

  function onPressOut() {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }

  return (
    <Animated.View
      className="absolute bottom-8 right-5"
      style={{ transform: [{ scale: scaleAnim }] }}
    >
      <Pressable
        className="h-16 w-16 items-center justify-center rounded-full bg-primary"
        style={{ elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 }}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel="Guardar restaurante"
      >
        <Ionicons name="add" size={32} color="white" />
      </Pressable>
    </Animated.View>
  );
}
