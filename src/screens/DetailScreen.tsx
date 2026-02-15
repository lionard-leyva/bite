import { useMemo, useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, Alert, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useRestaurants } from '../hooks/useRestaurants';
import { useAuth } from '../hooks/useAuth';
import { toggleVisited, deleteRestaurant } from '../services/restaurantService';
import { deleteLocalRestaurant, updateLocalRestaurantVisited } from '../services/localStorageService';
import StarRating from '../components/StarRating';
import ConfirmModal from '../components/ConfirmModal';
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
  const { restaurants, refreshLocal } = useRestaurants();
  const { skipMode } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const restaurant = useMemo(
    () => restaurants.find((r) => r.id === restaurantId),
    [restaurants, restaurantId],
  );

  if (!restaurant) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-body text-text-tertiary">Restaurante no encontrado</Text>
      </View>
    );
  }

  async function handleToggleVisited() {
    if (skipMode) {
      try {
        await updateLocalRestaurantVisited(restaurant!.id, !restaurant!.visited);
        refreshLocal();
      } catch {
        Alert.alert('Error', 'No se pudo actualizar el estado');
      }
      return;
    }
    toggleVisited(restaurant!.id, !restaurant!.visited);
  }

  async function handleConfirmDelete() {
    try {
      if (skipMode) {
        await deleteLocalRestaurant(restaurant!.id);
        refreshLocal();
      } else {
        await deleteRestaurant(restaurant!.id);
      }
      setShowDeleteModal(false);
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'No se pudo eliminar el restaurante');
    }
  }

  return (
    <ScrollView className="flex-1 bg-background">
      {/* Photo */}
      {restaurant.photoURL ? (
        <View className="relative">
          <Image
            source={{ uri: restaurant.photoURL }}
            className="h-72 w-full"
            resizeMode="cover"
          />
          <View className="absolute bottom-0 left-0 right-0 h-16" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }} />
        </View>
      ) : (
        <View className="h-56 w-full items-center justify-center bg-primary-light">
          <Ionicons name="restaurant-outline" size={56} color="#FF5A5F" />
        </View>
      )}

      <View className="px-5 pt-4 pb-8">
        {/* Name */}
        <Text className="text-title font-bold text-text-primary">
          {restaurant.name}
        </Text>

        {/* Stars */}
        <View className="mt-2">
          <StarRating rating={restaurant.rating} onRate={noop} size={24} />
        </View>

        {/* Address */}
        {restaurant.address ? (
          <View className="mt-2 flex-row items-center gap-1.5">
            <Ionicons name="location-outline" size={16} color="#717171" />
            <Text className="flex-1 text-body text-text-secondary">
              {restaurant.address}
            </Text>
          </View>
        ) : null}

        {/* Note */}
        {restaurant.note ? (
          <View className="mt-3 flex-row items-start gap-2 rounded-card bg-surface border border-border p-3">
            <Ionicons name="chatbubble-outline" size={14} color="#717171" style={{ marginTop: 2 }} />
            <Text className="flex-1 text-sm text-text-primary">
              "{restaurant.note}"
            </Text>
          </View>
        ) : null}

        {/* Time ago */}
        <Text className="mt-3 text-caption text-text-tertiary">
          {timeAgo(restaurant.createdAt)}
        </Text>

        {/* Visited toggle */}
        <Pressable
          className={`mt-4 flex-row items-center justify-center gap-2 rounded-button border py-3 ${
            restaurant.visited
              ? 'border-visited bg-visited/10'
              : 'border-warning bg-warning/10'
          }`}
          onPress={handleToggleVisited}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <Ionicons
            name={restaurant.visited ? 'checkmark-circle' : 'time-outline'}
            size={18}
            color={restaurant.visited ? '#66BB6A' : '#FFB400'}
          />
          <Text
            className={`text-sm font-medium ${
              restaurant.visited ? 'text-visited' : 'text-warning'
            }`}
          >
            {restaurant.visited ? 'Visitado' : 'Pendiente de ir'}
          </Text>
        </Pressable>

        {/* Directions */}
        <Pressable
          className="mt-3 flex-row items-center justify-center gap-2 rounded-button border-2 border-primary py-3"
          onPress={() =>
            openMaps(restaurant.latitude, restaurant.longitude, restaurant.name)
          }
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <Ionicons name="navigate-outline" size={18} color="#FF5A5F" />
          <Text className="text-sm font-semibold text-primary">
            Como llegar
          </Text>
        </Pressable>

        {/* Delete */}
        <Pressable
          className="mt-3 flex-row items-center justify-center gap-2 rounded-button border border-primary/30 py-3"
          onPress={() => setShowDeleteModal(true)}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <Ionicons name="trash-outline" size={16} color="#FF5A5F" />
          <Text className="text-sm font-medium text-primary">Eliminar</Text>
        </Pressable>
      </View>

      <ConfirmModal
        visible={showDeleteModal}
        title="Eliminar"
        message={`¿Seguro que quieres eliminar "${restaurant.name}"?`}
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </ScrollView>
  );
}
