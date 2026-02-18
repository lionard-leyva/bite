import { memo, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { timeAgo } from '../utils/timeAgo';
import { getPrimaryPhoto } from '../types';
import type { Restaurant } from '../types';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onPress: () => void;
}

function MiniStars({ rating }: { rating: number }) {
  return (
    <View className="flex-row items-center gap-1">
      <View className="flex-row">
        {[0, 1, 2, 3, 4].map((k) => (
          <Ionicons
            key={`star-${k}`}
            name={k < rating ? 'star' : 'star-outline'}
            size={12}
            color={k < rating ? '#FFB400' : '#EBEBEB'}
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
}: RestaurantCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  function onPressIn() {
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
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }]}>
      <Pressable
        className="overflow-hidden rounded-card bg-surface border border-border"
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={`${restaurant.name}, ${restaurant.rating} estrellas${restaurant.visited ? ', visitado' : ', pendiente'}`}
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
              <Ionicons name="restaurant-outline" size={40} color="#FF5A5F" />
            </View>
          )}

          {/* Bottom photo overlay */}
          <View className="absolute bottom-0 left-0 right-0 h-12" style={{ backgroundColor: 'rgba(0,0,0,0.08)' }} />

          {/* Visited/Pending pill badge */}
          <View
            className={`absolute top-3 left-3 flex-row items-center gap-1 rounded-pill px-2.5 py-1 ${
              restaurant.visited ? 'bg-visited' : 'bg-primary'
            }`}
          >
            <Ionicons
              name={restaurant.visited ? 'checkmark-circle' : 'time-outline'}
              size={12}
              color="white"
            />
            <Text className="text-xs font-semibold text-white">
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
                <View style={{ backgroundColor: '#FFF7ED', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#EA580C' }}>
                    {'\u20AC'}{restaurant.pricePerPerson}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text className="text-caption text-text-tertiary">
              {timeAgo(restaurant.createdAt)}
            </Text>
          </View>

          {restaurant.address ? (
            <View className="mt-1 flex-row items-center gap-1">
              <Ionicons name="location-outline" size={12} color="#6B6B6B" />
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
