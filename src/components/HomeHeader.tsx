import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SearchBar from './SearchBar';
import FilterButtons, { type FilterValue } from './FilterButtons';

interface HomeHeaderProps {
  city: string;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  activeFilter: FilterValue;
  onFilterChange: (value: FilterValue) => void;
  onProfilePress: () => void;
}

export default function HomeHeader({
  city,
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  onProfilePress,
}: HomeHeaderProps) {
  return (
    <View style={layoutStyles.header}>
      {/* Row 1: city + profile avatar */}
      <View style={layoutStyles.headerTop}>
        <View>
          <Text style={layoutStyles.headerEyebrow}>Explorando</Text>
          <Text style={layoutStyles.headerCity}>{city}</Text>
        </View>
        <Pressable style={layoutStyles.avatarButton} onPress={onProfilePress}>
          <Ionicons name="person-outline" size={18} color="#484848" />
        </Pressable>
      </View>

      {/* Row 2: search bar */}
      <SearchBar value={searchQuery} onChangeText={onSearchChange} />

      {/* Row 3: filter pills */}
      <View style={{ marginTop: 8 }}>
        <FilterButtons active={activeFilter} onSelect={onFilterChange} />
      </View>
    </View>
  );
}

const layoutStyles = {
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#FFFFFF',
  },
  headerTop: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  headerEyebrow: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  headerCity: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#222222',
    marginTop: 1,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
};
