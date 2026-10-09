import { useState, useMemo, useCallback } from 'react';
import { View, FlatList, Text, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRestaurants } from '../hooks/useRestaurants';
import { useAuth } from '../hooks/useAuth';
import { useListMembers } from '../hooks/useListMembers';
import { savedByLabel, nameOf } from '../utils/savedBy';
import SearchBar from '../components/SearchBar';
import FilterButtons, { type FilterValue } from '../components/FilterButtons';
import RestaurantCard from '../components/RestaurantCard';
import MatchEntryCard from '../components/MatchEntryCard';
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
      <View style={{ paddingHorizontal: 16, marginBottom: 14 }}>
        <RestaurantCard
          restaurant={item}
          savedBy={savedByLabel(item.createdBy, members, userId)}
          onPress={() => navigation.navigate('Detail', { restaurantId: item.id })}
        />
      </View>
    );
  }, [navigation, members, userId]);

  const shared = members.length > 1;
  const pendingCount = useMemo(() => restaurants.filter((r) => !r.visited).length, [restaurants]);
  const header = (
    <View style={{ paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 14, gap: 12 }}>
      <Text style={{ fontFamily: 'YoungSerif_400Regular', fontSize: 30, color: colors['text-primary'] }}>
        {shared ? 'Vuestra lista' : 'Tu lista'}
      </Text>
      {pendingCount > 0 && (
        <MatchEntryCard
          pendingCount={pendingCount}
          avatarNames={shared ? members.map(nameOf) : []}
          onPress={() => navigation.navigate('Match')}
        />
      )}
      <SearchBar value={search} onChangeText={setSearch} />
      <FilterButtons active={filter} onSelect={setFilter} />
    </View>
  );

  const empty = (
    <View className="flex-1 items-center justify-center gap-3" style={{ paddingVertical: 48 }}>
      <Ionicons
        name={restaurants.length === 0 ? 'restaurant-outline' : 'search-outline'}
        size={40}
        color={colors['text-tertiary']}
      />
      {restaurants.length === 0 && (
        <Text className="text-subtitle font-display text-text-primary">Aquí aparecerán vuestros sitios</Text>
      )}
      <Text className="text-body text-text-tertiary">
        {restaurants.length === 0 ? 'No tienes restaurantes guardados' : 'Sin resultados'}
      </Text>
      {restaurants.length === 0 && (
        <Text className="text-caption text-text-tertiary">Toca + en el mapa para agregar uno</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">

      {error ? (
        <View className="flex-1 items-center justify-center gap-3 px-8" style={{ paddingTop: insets.top }}>
          <Ionicons name="warning-outline" size={40} color={colors.danger} />
          <Text className="text-center text-body text-danger">
            Error cargando restaurantes. Revisa tu conexion o reinicia la app.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          // Siempre la misma FlatList: si el vacio fuera otra vista, el buscador se volveria a montar y cerraria el teclado.
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
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
