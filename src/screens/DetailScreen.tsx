import { useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert, useWindowDimensions, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRestaurants } from '../hooks/useRestaurants';
import { useAuth } from '../hooks/useAuth';
import { toggleVisited, deleteRestaurant } from '../services/restaurantService';
import { deleteLocalRestaurant, updateLocalRestaurantVisited } from '../services/localStorageService';
import { openNativeNavigation } from '../services/navigationService';
import StarRating from '../components/StarRating';
import ConfirmModal from '../components/ConfirmModal';
import { timeAgo } from '../utils/timeAgo';
import { PRICE_VALUES, PRICE_LABELS } from '../config/constants';
import type { RootStackParamList } from '../navigation/types';

type DetailRoute = RouteProp<RootStackParamList, 'Detail'>;
type DetailNav = NativeStackNavigationProp<RootStackParamList, 'Detail'>;

const noop = () => {};

export default function DetailScreen() {
  const navigation = useNavigation<DetailNav>();
  const route = useRoute<DetailRoute>();
  const { restaurantId } = route.params;
  const { restaurants, refreshLocal } = useRestaurants({ mode: 'all' });
  const { skipMode } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const { width: screenWidth } = useWindowDimensions();

  const restaurant = useMemo(
    () => restaurants.find((r) => r.id === restaurantId),
    [restaurants, restaurantId],
  );

  const photos = useMemo(() => {
    if (restaurant?.photoURLs?.length) return restaurant.photoURLs;
    if (restaurant?.photoURL) return [restaurant.photoURL];
    return [];
  }, [restaurant?.photoURLs, restaurant?.photoURL]);

  const handlePhotoScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    setActivePhotoIndex(index);
  }, [screenWidth]);

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
      {/* Photo carousel */}
      {photos.length > 0 ? (
        <View style={{ position: 'relative' }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handlePhotoScroll}
          >
            {photos.map((uri, i) => (
              <Image
                key={uri ? `photo-${uri}` : `photo-${i}`}
                source={{ uri }}
                style={{ height: 288, width: screenWidth }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
                placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
              />
            ))}
          </ScrollView>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 64, backgroundColor: 'rgba(0,0,0,0.1)' }} />
          {photos.length > 1 && (
            <View style={{ position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
              {photos.map((uri, i) => (
                <View
                  key={uri ? `dot-${uri}` : `dot-${i}`}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: i === activePhotoIndex ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                  }}
                />
              ))}
            </View>
          )}
        </View>
      ) : (
        <View className="h-56 w-full items-center justify-center bg-primary-light">
          <Ionicons name="restaurant-outline" size={56} color="#FF5A5F" />
        </View>
      )}

      <View className="px-5 pt-4 pb-8">
        {/* Name + Edit icon */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Text className="text-title font-bold text-text-primary" style={{ flex: 1, marginRight: 8 }}>
            {restaurant.name}
          </Text>
          <Pressable
            onPress={() => navigation.navigate('Save', { restaurantId: restaurant.id })}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: pressed ? '#F3F4F6' : '#FFFFFF',
              borderWidth: 1,
              borderColor: '#E5E7EB',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 2,
            })}
            accessibilityRole="button"
            accessibilityLabel="Editar restaurante"
          >
            <Ionicons name="pencil-outline" size={16} color="#484848" />
          </Pressable>
        </View>

        {/* Rating */}
        <View className="mt-2 flex-row items-center gap-2">
          <Ionicons name="star" size={16} color="#FFB400" />
          <Text className="text-sm font-semibold text-text-primary">
            {restaurant.rating}/5
          </Text>
        </View>

        {/* Mini gallery (if multiple photos) */}
        {photos.length > 1 && (
          <View className="mt-3">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {photos.map((uri, i) => (
                <Pressable key={uri ? `thumb-${uri}` : `thumb-${i}`} onPress={() => setActivePhotoIndex(i)}>
                  <Image
                    source={{ uri }}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 10,
                      borderWidth: i === activePhotoIndex ? 2 : 1,
                      borderColor: i === activePhotoIndex ? '#FF5A5F' : '#E5E7EB',
                    }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Details block */}
        <Text className="mt-4 text-caption font-semibold uppercase tracking-wider text-text-tertiary">
          Info
        </Text>
        <View style={{ marginTop: 6, gap: 6 }}>
          {/* Price */}
          {restaurant.pricePerPerson ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="wallet-outline" size={14} color="#EA580C" />
              <Text className="text-sm text-text-secondary">
                {'\u20AC'}{restaurant.pricePerPerson} por persona · {PRICE_VALUES.indexOf(restaurant.pricePerPerson as (typeof PRICE_VALUES)[number]) >= 0 ? PRICE_LABELS[PRICE_VALUES.indexOf(restaurant.pricePerPerson as (typeof PRICE_VALUES)[number])] : ''}
              </Text>
            </View>
          ) : null}

          {/* Address */}
          {restaurant.address ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
              <Ionicons name="location-outline" size={14} color="#717171" style={{ marginTop: 2 }} />
              <Text className="flex-1 text-sm text-text-secondary">
                {restaurant.address}
              </Text>
            </View>
          ) : null}

          {/* Note */}
          {restaurant.note ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
              <Ionicons name="chatbubble-outline" size={14} color="#717171" style={{ marginTop: 2 }} />
              <Text numberOfLines={3} className="flex-1 text-sm text-text-secondary">
                {restaurant.note}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Time ago */}
        <Text className="mt-3 text-caption text-text-tertiary">
          {timeAgo(restaurant.createdAt)}
        </Text>

        <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' }} />
        <Text className="mt-3 text-caption font-semibold uppercase tracking-wider text-text-tertiary">
          Acciones
        </Text>

        {/* Visited toggle */}
        <Pressable
          className={`mt-3 flex-row items-center justify-center gap-2 rounded-button border py-2.5 ${
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
          className="mt-3 flex-row items-center justify-center gap-2 rounded-button border border-border py-2.5"
          onPress={() =>
            openNativeNavigation(restaurant.latitude, restaurant.longitude, restaurant.name)
          }
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <Ionicons name="navigate-outline" size={18} color="#111827" />
          <Text className="text-sm font-semibold text-text-primary">
            Como llegar
          </Text>
        </Pressable>

        {/* Delete */}
        <Pressable
          className="mt-3 flex-row items-center justify-center gap-2 rounded-button border border-border py-2.5"
          onPress={() => setShowDeleteModal(true)}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <Ionicons name="trash-outline" size={16} color="#B91C1C" />
          <Text className="text-sm font-medium text-red-700">Eliminar</Text>
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
