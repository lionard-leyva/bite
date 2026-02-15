import { memo } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { timeAgo } from '../utils/timeAgo';
import type { Restaurant } from '../types';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onPress: () => void;
}

function Stars({ rating }: { rating: number }) {
  return (
    <Text className="text-sm">
      {Array.from({ length: 5 }, (_, i) =>
        i < rating ? '\u2605' : '\u2606',
      ).join('')}
    </Text>
  );
}

export default memo(function RestaurantCard({
  restaurant,
  onPress,
}: RestaurantCardProps) {
  return (
    <Pressable
      className="flex-row overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${restaurant.name}, ${restaurant.rating} estrellas${restaurant.visited ? ', visitado' : ', pendiente'}`}
    >
      {restaurant.photoURL ? (
        <Image
          source={{ uri: restaurant.photoURL }}
          className="h-24 w-24"
          resizeMode="cover"
        />
      ) : (
        <View className="h-24 w-24 items-center justify-center bg-gray-100">
          <Text className="text-2xl">&#x1F37D;</Text>
        </View>
      )}

      <View className="flex-1 justify-center px-3 py-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
            {restaurant.name}
          </Text>
          <Text className="text-xs text-gray-400">
            {restaurant.visited ? '\u2713' : '\u25CB'}
          </Text>
        </View>

        <View className="mt-0.5 flex-row items-center gap-2">
          <Stars rating={restaurant.rating} />
          <Text className="text-xs text-gray-400">
            {timeAgo(restaurant.createdAt)}
          </Text>
        </View>

        {restaurant.address ? (
          <Text className="mt-0.5 text-xs text-gray-500" numberOfLines={1}>
            {restaurant.address}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});
