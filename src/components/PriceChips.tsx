import { View, Pressable, Text } from 'react-native';
import { PRICE_VALUES, PRICE_LABELS } from '../config/constants';
import { priceSymbols } from '../utils/price';
import { useTheme } from '../theme/ThemeProvider';

interface PriceChipsProps {
  value: number;
  onChange: (value: number) => void;
}

// Precio por persona en cinco opciones (€ a €€€€€), la elegida en tinta como los filtros.
export default function PriceChips({ value, onChange }: PriceChipsProps) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {PRICE_VALUES.map((price, i) => {
        const selected = price === value;
        return (
          <Pressable
            key={price}
            onPress={() => onChange(price)}
            accessibilityRole="button"
            accessibilityLabel={`${priceSymbols(price)}, ${PRICE_LABELS[i]}`}
            accessibilityState={{ selected }}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? colors['text-primary'] : colors.surface,
              borderWidth: selected ? 0 : 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontFamily: 'Figtree_700Bold', fontSize: 14, color: selected ? colors.surface : colors['text-primary'] }}>
              {priceSymbols(price)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
