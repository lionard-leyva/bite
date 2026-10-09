import { useEffect, useRef } from 'react';
import { Animated, Easing, View, useWindowDimensions } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';

const PIEZAS = ['🎉', '✨', '❤', '🍽'];
const CANTIDAD = 12;

function Pieza({ indice }: { indice: number }) {
  const { height } = useWindowDimensions();
  const caida = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.timing(caida, {
      toValue: 1,
      duration: 1800 + (indice % 4) * 250,
      delay: (indice % 6) * 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [caida, indice]);
  return (
    <Animated.Text
      testID="confeti"
      style={{
        position: 'absolute',
        top: -30,
        left: `${(indice * 83) % 92}%`,
        fontSize: 18 + (indice % 3) * 4,
        opacity: caida.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateY: caida.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.7] }) },
          { rotate: caida.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(indice % 2 ? 1 : -1) * 120}deg`] }) },
        ],
      }}
    >
      {PIEZAS[indice % PIEZAS.length]}
    </Animated.Text>
  );
}

// Celebracion del match: lluvia corta de emojis. Con "reducir movimiento" no se dibuja nada.
export default function Confetti() {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {Array.from({ length: CANTIDAD }, (_, i) => (
        <Pieza key={i} indice={i} />
      ))}
    </View>
  );
}
