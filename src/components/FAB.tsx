import { useRef } from 'react';
import { Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FAB_SIZE } from '../config/constants';
import { useTheme } from '../theme/ThemeProvider';

interface FABProps {
  onPress: () => void;
  bottomOffset?: number;
}

export default function FAB({ onPress, bottomOffset = 32 }: FABProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { colors } = useTheme();

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
      style={{
        position: 'absolute',
        bottom: bottomOffset,
        right: 20,
        transform: [{ scale: scaleAnim }],
      }}
    >
      <Pressable
        style={{
          width: FAB_SIZE,
          height: FAB_SIZE,
          borderRadius: FAB_SIZE / 2,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 12,
          elevation: 8,
        }}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel="Guardar restaurante"
      >
        <Ionicons name="add" size={32} color={colors["on-primary"]} />
      </Pressable>
    </Animated.View>
  );
}
