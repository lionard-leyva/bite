import { useState, useMemo, useCallback } from 'react';
import { View, FlatList, Text, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRestaurants } from '../hooks/useRestaurants';
import { useAuth } from '../hooks/useAuth';
import { useListMembers } from '../hooks/useListMembers';
import { otherAuthorName } from '../utils/savedBy';
import SearchBar from '../components/SearchBar';
import FilterButtons, { type FilterValue } from '../components/FilterButtons';
import RestaurantCard from '../components/RestaurantCard';
import type { RootStackParamList } from '../navigation/types';
import type { Restaurant } from '../types';
import { useTheme } from '../theme/ThemeProvider';
import { matchesQuery } from '../utils/searchMatch';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ListScreen() {
  const navigation = useNavigation<Nav>();
  const { restaurants, loading, error, loadMore, loadingMore, hasMore } = useRestaurants({ mode: 'paged' });
  const insets = useSafeAreaInsets();
  const { skipMode, userId, listId } = useAuth();
  const members = useListMembers(listId, !skipMode);
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterValue>('all');

  const filtered = useMemo(() => {
    let list = restaurants;

    if (filter === 'visited') list = list.filter((r) => r.visited);
    else if (filter === 'pending') list = list.filter((r) => !r.visited);

    if (search.trim()) {
      list = list.filter((r) => matchesQuery(r, search));
    }

    return list;
  }, [restaurants, filter, search]);

  const renderItem = useCallback(({ item }: { item: Restaurant }) => {
    return (
      <View className="px-5 mb-4">
        <RestaurantCard
          restaurant={item}
          author={otherAuthorName(item.createdBy, members, userId)}
          onPress={() => navigation.navigate('Detail', { restaurantId: item.id })}
        />
      </View>
    );
  }, [navigation, members, userId]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="bg-surface px-5 pb-3 gap-3 border-b border-border" style={{ paddingTop: insets.top + 8 }}>
        <Text className="text-title font-bold text-text-primary">Tu lista</Text>
        <SearchBar value={search} onChangeText={setSearch} />
        <FilterButtons active={filter} onSelect={setFilter} />
      </View>

      {error ? (
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <Ionicons name="warning-outline" size={40} color={colors.danger} />
          <Text className="text-center text-body text-danger">
            Error cargando restaurantes. Revisa tu conexion o reinicia la app.
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3">
          <Ionicons
            name={restaurants.length === 0 ? 'restaurant-outline' : 'search-outline'}
            size={40}
            color={colors["text-tertiary"]}
          />
          <Text className="text-body text-text-tertiary">
            {restaurants.length === 0
              ? 'No tienes restaurantes guardados'
              : 'Sin resultados'}
          </Text>
          {restaurants.length === 0 && (
            <Text className="text-caption text-text-tertiary">
              Toca + en el mapa para agregar uno
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasMore && !loadingMore) {
              void loadMore();
            }
          }}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
