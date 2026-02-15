import { useState, useMemo, useCallback } from 'react';
import { View, FlatList, Text, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRestaurants } from '../hooks/useRestaurants';
import SearchBar from '../components/SearchBar';
import FilterButtons, { type FilterValue } from '../components/FilterButtons';
import RestaurantCard from '../components/RestaurantCard';
import type { RootStackParamList } from '../navigation/types';
import type { Restaurant } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ListScreen() {
  const navigation = useNavigation<Nav>();
  const { restaurants, loading } = useRestaurants();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterValue>('all');

  const filtered = useMemo(() => {
    let list = restaurants;

    if (filter === 'visited') list = list.filter((r) => r.visited);
    else if (filter === 'pending') list = list.filter((r) => !r.visited);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q),
      );
    }

    return list;
  }, [restaurants, filter, search]);

  const renderItem = useCallback(({ item }: { item: Restaurant }) => {
    return (
      <View className="px-4 mb-3">
        <RestaurantCard
          restaurant={item}
          onPress={() => navigation.navigate('Detail', { restaurantId: item.id })}
        />
      </View>
    );
  }, [navigation]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#e63946" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pb-3 pt-4 gap-3">
        <SearchBar value={search} onChangeText={setSearch} />
        <FilterButtons active={filter} onSelect={setFilter} />
      </View>

      {filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-base text-gray-400">
            {restaurants.length === 0
              ? 'No tienes restaurantes guardados'
              : 'Sin resultados'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
        />
      )}
    </View>
  );
}
