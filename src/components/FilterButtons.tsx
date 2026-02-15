import { View, Pressable, Text } from 'react-native';

export type FilterValue = 'all' | 'visited' | 'pending';

interface FilterButtonsProps {
  active: FilterValue;
  onSelect: (value: FilterValue) => void;
}

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Visitados', value: 'visited' },
  { label: 'Pendientes', value: 'pending' },
];

export default function FilterButtons({
  active,
  onSelect,
}: FilterButtonsProps) {
  return (
    <View className="flex-row gap-2">
      {FILTERS.map((f) => {
        const isActive = active === f.value;
        return (
          <Pressable
            key={f.value}
            className={`rounded-full px-4 py-1.5 ${isActive ? 'bg-red-500' : 'bg-gray-100'}`}
            onPress={() => onSelect(f.value)}
            accessibilityRole="button"
            accessibilityLabel={`Filtrar: ${f.label}`}
            accessibilityState={{ selected: isActive }}
          >
            <Text
              className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-600'}`}
            >
              {f.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
