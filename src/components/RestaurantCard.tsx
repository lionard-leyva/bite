import { memo, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { timeAgo } from '../utils/timeAgo';
import { getPrimaryPhoto } from '../types';
import { useTheme } from '../theme/ThemeProvider';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { Restaurant } from '../types';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onPress: () => void;
  /** Nombre de quien lo guardo, solo si es otra persona de la lista. */
  author?: string | null;
}

function MiniStars({ rating }: { rating: number }) {
  const { colors } = useTheme();
  return (
    <View className="flex-row items-center gap-1">
      <View className="flex-row">
        {[0, 1, 2, 3, 4].map((k) => (
          <Ionicons
            key={`star-${k}`}
            name={k < rating ? 'star' : 'star-outline'}
            size={12}
            color={k < rating ? colors.star : colors.border}
          />
        ))}
      </View>
      <Text className="text-caption font-semibold text-text-secondary">{rating}</Text>
    </View>
  );
}

export default memo(function RestaurantCard({
  restaurant,
  onPress,
  author,
}: RestaurantCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  function onPressIn() {
    if (reducedMotion) return;
    Animated.spring(scaleAnim, {
      toValue: 0.97,
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
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, { shadowColor: colors['text-primary'], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3 }]}>
      <Pressable
        className="overflow-hidden rounded-card bg-surface"
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={`${restaurant.name}, ${restaurant.rating} ${restaurant.rating === 1 ? 'estrella' : 'estrellas'}${restaurant.visited ? ', visitado' : ', pendiente'}`}
      >
        {/* Photo hero */}
        <View className="relative">
          {getPrimaryPhoto(restaurant) ? (
            <Image
              source={{ uri: getPrimaryPhoto(restaurant)! }}
              style={{ height: 176, width: '100%' }}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
              placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            />
          ) : (
            <View
              className="h-44 w-full items-center justify-center bg-primary-light"
              testID="photo-placeholder"
            >
              <Ionicons name="restaurant-outline" size={40} color={colors.primary} />
            </View>
          )}

          {/* Visited/Pending pill badge */}
          <View
            className={`absolute top-3 left-3 flex-row items-center gap-1 rounded-pill px-2.5 py-1 ${
              restaurant.visited ? 'bg-visited' : 'bg-primary'
            }`}
          >
            <Ionicons
              name={restaurant.visited ? 'checkmark-circle' : 'time-outline'}
              size={12}
              color={restaurant.visited ? colors['on-visited'] : colors['on-primary']}
            />
            <Text className={`text-xs font-semibold ${restaurant.visited ? 'text-on-visited' : 'text-on-primary'}`}>
              {restaurant.visited ? 'Visitado' : 'Pendiente'}
            </Text>
          </View>
        </View>

        {/* Info */}
        <View className="px-3 py-2.5">
          <Text className="text-subtitle font-bold text-text-primary" numberOfLines={1}>
            {restaurant.name}
          </Text>

          <View className="mt-1 flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <MiniStars rating={restaurant.rating} />
              {restaurant.pricePerPerson ? (
                <View className="rounded bg-primary-light px-1.5 py-px">
                  <Text className="text-label font-semibold text-text-secondary">
                    {'\u20AC'}{restaurant.pricePerPerson}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text className="text-caption text-text-tertiary">
              {author ? `${author} · ${timeAgo(restaurant.createdAt)}` : timeAgo(restaurant.createdAt)}
            </Text>
          </View>

          {restaurant.address ? (
            <View className="mt-1 flex-row items-center gap-1">
              <Ionicons name="location-outline" size={12} color={colors["text-secondary"]} />
              <Text className="flex-1 text-caption text-text-secondary" numberOfLines={1}>
                {restaurant.address}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
});
