import { useMemo, useCallback } from 'react';
import { View, Text, Image, ScrollView, Pressable, Alert, Linking, Platform } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useRestaurants } from '../hooks/useRestaurants';
import { useAuth } from '../hooks/useAuth';
import { toggleVisited, deleteRestaurant } from '../services/restaurantService';
import StarRating from '../components/StarRating';
import { timeAgo } from '../utils/timeAgo';
import type { RootStackParamList } from '../navigation/types';

type DetailRoute = RouteProp<RootStackParamList, 'Detail'>;

const noop = () => {};

function openMaps(lat: number, lng: number, name: string) {
  const label = encodeURIComponent(name);
  const url = Platform.select({
    ios: `maps:0,0?q=${label}&ll=${lat},${lng}`,
    android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
  });
  if (url) Linking.openURL(url);
}

export default function DetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<DetailRoute>();
  const { restaurantId } = route.params;
  const { restaurants } = useRestaurants();
  const { skipMode } = useAuth();

  const restaurant = useMemo(
    () => restaurants.find((r) => r.id === restaurantId),
    [restaurants, restaurantId],
  );

  if (!restaurant) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-base text-gray-400">Restaurante no encontrado</Text>
      </View>
    );
  }

  function handleToggleVisited() {
    if (skipMode) return;
    toggleVisited(restaurant!.id, !restaurant!.visited);
  }

  function handleDelete() {
    Alert.alert(
      'Eliminar',
      `¿Seguro que quieres eliminar "${restaurant!.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteRestaurant(restaurant!.id);
            navigation.goBack();
          },
        },
      ],
    );
  }

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Photo */}
      {restaurant.photoURL ? (
        <Image
          source={{ uri: restaurant.photoURL }}
          className="h-64 w-full"
          resizeMode="cover"
        />
      ) : (
        <View className="h-48 w-full items-center justify-center bg-gray-100">
          <Text className="text-5xl">&#x1F37D;</Text>
        </View>
      )}

      <View className="px-4 pt-4 pb-8">
        {/* Name */}
        <Text className="text-2xl font-bold text-gray-900">
          {restaurant.name}
        </Text>

        {/* Stars */}
        <View className="mt-2">
          <StarRating rating={restaurant.rating} onRate={noop} size={24} />
        </View>

        {/* Address */}
        {restaurant.address ? (
          <Text className="mt-2 text-sm text-gray-500">
            {restaurant.address}
          </Text>
        ) : null}

        {/* Note */}
        {restaurant.note ? (
          <View className="mt-3 rounded-lg bg-gray-50 p-3">
            <Text className="text-sm text-gray-700">
              "{restaurant.note}"
            </Text>
          </View>
        ) : null}

        {/* Time ago */}
        <Text className="mt-3 text-xs text-gray-400">
          {timeAgo(restaurant.createdAt)}
        </Text>

        {/* Visited toggle */}
        <Pressable
          className={`mt-4 items-center rounded-lg border py-3 ${
            restaurant.visited
              ? 'border-green-500 bg-green-50'
              : 'border-orange-400 bg-orange-50'
          }`}
          onPress={handleToggleVisited}
        >
          <Text
            className={`text-sm font-medium ${
              restaurant.visited ? 'text-green-700' : 'text-orange-600'
            }`}
          >
            {restaurant.visited ? 'Visitado' : 'Pendiente de ir'}
          </Text>
        </Pressable>

        {/* Directions */}
        <Pressable
          className="mt-3 items-center rounded-lg bg-blue-500 py-3"
          onPress={() =>
            openMaps(restaurant.latitude, restaurant.longitude, restaurant.name)
          }
        >
          <Text className="text-sm font-semibold text-white">
            Como llegar
          </Text>
        </Pressable>

        {/* Delete */}
        <Pressable
          className="mt-3 items-center rounded-lg border border-red-200 py-3"
          onPress={handleDelete}
        >
          <Text className="text-sm font-medium text-red-500">Eliminar</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
