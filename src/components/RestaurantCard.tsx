import { memo, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import PhotoHeader from './PhotoHeader';
import { useTheme } from '../theme/ThemeProvider';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { priceSymbols } from '../utils/price';
import type { Restaurant } from '../types';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onPress: () => void;
  /** "Guardado por Bea" en una lista compartida (utils/savedBy); nada en una lista personal. */
  savedBy?: string | null;
}

// Tarjeta de la Lista del diseno Terracota: foto grande con el estado, nombre en serif, "★ 4 · €€ · direccion" y quien
// lo guardo.
export default memo(function RestaurantCard({ restaurant, onPress, savedBy }: RestaurantCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const price = priceSymbols(restaurant.pricePerPerson);

  function onPressIn() {
    if (reducedMotion) return;
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  }

  function onPressOut() {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  }

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        { shadowColor: colors['text-primary'], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 2 },
      ]}
    >
      <Pressable
        style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 6, paddingBottom: 12 }}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={`${restaurant.name}, ${restaurant.rating} ${restaurant.rating === 1 ? 'estrella' : 'estrellas'}${restaurant.visited ? ', visitado' : ', pendiente'}`}
      >
        <PhotoHeader restaurant={restaurant} height={140} radius={12} />

        <View style={{ paddingHorizontal: 6, paddingTop: 10, gap: 3 }}>
          <Text numberOfLines={1} style={{ fontFamily: 'YoungSerif_400Regular', fontSize: 19, color: colors['text-primary'] }}>
            {restaurant.name}
          </Text>
          <Text numberOfLines={1} style={{ fontFamily: 'Figtree_400Regular', fontSize: 13, color: colors['text-secondary'] }}>
            ★ <Text>{restaurant.rating}</Text>
            {price ? ` · ${price}` : ''}
            {restaurant.address ? ' · ' : ''}
            {restaurant.address ? <Text>{restaurant.address}</Text> : null}
          </Text>
          {savedBy ? (
            <Text style={{ fontFamily: 'Figtree_400Regular', fontSize: 12, color: colors['text-tertiary'] }}>{savedBy}</Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
});
