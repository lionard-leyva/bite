import { View, Pressable, Text } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export type FilterValue = 'all' | 'visited' | 'pending';

interface FilterButtonsProps {
  active: FilterValue;
  onSelect: (value: FilterValue) => void;
  /** Sobre el mapa los filtros flotan con sombra; en la Lista van planos. */
  floating?: boolean;
}

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Pendientes', value: 'pending' },
  { label: 'Visitados', value: 'visited' },
];

// Diseno Terracota: pildoras blancas y la elegida en tinta (no en terracota, que queda para las acciones).
export default function FilterButtons({ active, onSelect, floating = false }: FilterButtonsProps) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {FILTERS.map((f) => {
        const isActive = active === f.value;
        return (
          <Pressable
            key={f.value}
            onPress={() => onSelect(f.value)}
            accessibilityRole="button"
            accessibilityLabel={`Filtrar: ${f.label}`}
            accessibilityState={{ selected: isActive }}
            style={{
              minHeight: 34,
              paddingHorizontal: 14,
              borderRadius: 999,
              justifyContent: 'center',
              backgroundColor: isActive ? colors['text-primary'] : colors.surface,
              ...(floating
                ? { shadowColor: colors['text-primary'], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 }
                : { borderWidth: isActive ? 0 : 1, borderColor: colors.border }),
            }}
          >
            <Text style={{ fontFamily: 'Figtree_600SemiBold', fontSize: 13, color: isActive ? colors.surface : colors['text-primary'] }}>
              {f.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
