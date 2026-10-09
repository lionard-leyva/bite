import { View, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

export type FilterValue = 'all' | 'visited' | 'pending';

interface FilterButtonsProps {
  active: FilterValue;
  onSelect: (value: FilterValue) => void;
}

const FILTERS: { label: string; value: FilterValue; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Todos', value: 'all', icon: 'grid-outline' },
  { label: 'Visitados', value: 'visited', icon: 'checkmark-circle-outline' },
  { label: 'Pendientes', value: 'pending', icon: 'time-outline' },
];

export default function FilterButtons({
  active,
  onSelect,
}: FilterButtonsProps) {
  const { colors } = useTheme();
  return (
    <View className="flex-row gap-2">
      {FILTERS.map((f) => {
        const isActive = active === f.value;
        return (
          <Pressable
            key={f.value}
            className={`flex-row items-center gap-1.5 rounded-pill px-4 py-1.5 ${isActive ? 'bg-primary' : 'bg-surface border border-border'}`}
            onPress={() => onSelect(f.value)}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel={`Filtrar: ${f.label}`}
            accessibilityState={{ selected: isActive }}
          >
            <Ionicons
              name={f.icon}
              size={14}
              color={isActive ? colors['on-primary'] : colors['text-secondary']}
            />
            <Text
              className={`text-sm font-medium ${isActive ? 'text-on-primary' : 'text-text-secondary'}`}
            >
              {f.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
