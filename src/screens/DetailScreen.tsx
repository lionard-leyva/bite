import { useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert, useWindowDimensions, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRestaurants } from '../hooks/useRestaurants';
import { useAuth } from '../hooks/useAuth';
import { useListMembers } from '../hooks/useListMembers';
import { savedByLabel } from '../utils/savedBy';
import { toggleVisited, deleteRestaurant } from '../services/restaurantService';
import { deleteLocalRestaurant, updateLocalRestaurantVisited } from '../services/localStorageService';
import { openNativeNavigation } from '../services/navigationService';
import StarRating from '../components/StarRating';
import ConfirmModal from '../components/ConfirmModal';
import { timeAgo } from '../utils/timeAgo';
import { PRICE_VALUES, PRICE_LABELS } from '../config/constants';
import type { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { withAlpha } from '../theme/color';

type DetailRoute = RouteProp<RootStackParamList, 'Detail'>;
type DetailNav = NativeStackNavigationProp<RootStackParamList, 'Detail'>;

const noop = () => {};

export default function DetailScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<DetailNav>();
  const route = useRoute<DetailRoute>();
  const { restaurantId } = route.params;
  const { restaurants, refreshLocal } = useRestaurants({ mode: 'all' });
  const { skipMode, userId, listId } = useAuth();
  const members = useListMembers(listId, !skipMode);
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

  const savedBy = savedByLabel(restaurant.createdBy, members, userId);

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
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 64, backgroundColor: withAlpha(colors['text-primary'], 0.12) }} />
          {photos.length > 1 && (
            <View style={{ position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
              {photos.map((uri, i) => (
                <View
                  key={uri ? `dot-${uri}` : `dot-${i}`}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: i === activePhotoIndex ? colors.surface : withAlpha(colors.surface, 0.55),
                  }}
                />
              ))}
            </View>
          )}
        </View>
      ) : (
        <View className="h-56 w-full items-center justify-center bg-primary-light">
          <Ionicons name="restaurant-outline" size={56} color={colors.primary} />
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
              backgroundColor: pressed ? colors['primary-light'] : colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 2,
            })}
            accessibilityRole="button"
            accessibilityLabel="Editar restaurante"
          >
            <Ionicons name="pencil-outline" size={16} color={colors['text-primary']} />
          </Pressable>
        </View>

        {/* Rating */}
        <View className="mt-2 flex-row items-center gap-2">
          <Ionicons name="star" size={16} color={colors.star} />
          <Text className="text-sm font-semibold text-text-primary">
            {restaurant.rating}/5
          </Text>
        </View>

        {savedBy ? (
          <Text className="mt-1 text-caption text-text-secondary">{savedBy}</Text>
        ) : null}

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
                      borderColor: i === activePhotoIndex ? colors.primary : colors.border,
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
              <Ionicons name="wallet-outline" size={14} color={colors['text-secondary']} />
              <Text className="text-sm text-text-secondary">
                {'\u20AC'}{restaurant.pricePerPerson} por persona · {PRICE_VALUES.indexOf(restaurant.pricePerPerson as (typeof PRICE_VALUES)[number]) >= 0 ? PRICE_LABELS[PRICE_VALUES.indexOf(restaurant.pricePerPerson as (typeof PRICE_VALUES)[number])] : ''}
              </Text>
            </View>
          ) : null}

          {/* Address */}
          {restaurant.address ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
              <Ionicons name="location-outline" size={14} color={colors['text-secondary']} style={{ marginTop: 2 }} />
              <Text className="flex-1 text-sm text-text-secondary">
                {restaurant.address}
              </Text>
            </View>
          ) : null}

          {/* Note */}
          {restaurant.note ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
              <Ionicons name="chatbubble-outline" size={14} color={colors['text-secondary']} style={{ marginTop: 2 }} />
              <Text className="flex-1 text-sm text-text-secondary">
                {restaurant.note}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Time ago */}
        <Text className="mt-3 text-caption text-text-tertiary">
          {timeAgo(restaurant.createdAt)}
        </Text>

        <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border }} />
        <Text className="mt-3 text-caption font-semibold uppercase tracking-wider text-text-tertiary">
          Acciones
        </Text>

        {/* Visited toggle */}
        <Pressable
          className={`mt-3 flex-row items-center justify-center gap-2 rounded-button border py-2.5 ${
            restaurant.visited
              ? 'border-visited bg-visited/10'
              : 'border-primary bg-primary/10'
          }`}
          onPress={handleToggleVisited}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <Ionicons
            name={restaurant.visited ? 'checkmark-circle' : 'time-outline'}
            size={18}
            color={restaurant.visited ? colors.visited : colors.primary}
          />
          <Text
            className={`text-sm font-medium ${
              restaurant.visited ? 'text-visited' : 'text-text-secondary'
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
          <Ionicons name="navigate-outline" size={18} color={colors['text-primary']} />
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
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
          <Text className="text-sm font-medium text-danger">Eliminar</Text>
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
