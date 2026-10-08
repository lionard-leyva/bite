import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { PRICE_VALUES, PRICE_LABELS } from '../config/constants';
import { useTheme } from '../theme/ThemeProvider';

interface PriceSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export default function PriceSlider({ value, onChange }: PriceSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const { colors } = useTheme();
  const activeIndex = PRICE_VALUES.indexOf(value as (typeof PRICE_VALUES)[number]);
  const idx = activeIndex >= 0 ? activeIndex : 1; // fallback to index 1 (€20)

  const segmentWidth = trackWidth / (PRICE_VALUES.length - 1);

  return (
    <View>
      {/* Big centered price + label */}
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 32, fontWeight: '700', color: colors['text-primary'] }}>
          {'\u20AC'}{PRICE_VALUES[idx]}
        </Text>
        <Text style={{ fontSize: 14, color: colors['text-secondary'], marginTop: 2 }}>
          {PRICE_LABELS[idx]}
        </Text>
      </View>

      {/* Track */}
      <View
        style={{ height: 40, justifyContent: 'center', paddingHorizontal: 10 }}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width - 20)}
      >
        {/* Background track */}
        <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.border }} />

        {/* Active track */}
        {trackWidth > 0 && (
          <View
            style={{
              position: 'absolute',
              left: 10,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.primary,
              width: idx * segmentWidth,
            }}
          />
        )}

        {/* Markers */}
        {trackWidth > 0 &&
          PRICE_VALUES.map((price, i) => {
            const isActive = i === idx;
            const isPast = i <= idx;
            const size = isActive ? 20 : 14;
            return (
              <Pressable
                key={price}
                onPress={() => onChange(price)}
                hitSlop={12}
                style={{
                  position: 'absolute',
                  left: 10 + i * segmentWidth - size / 2,
                  top: (40 - size) / 2,
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: isPast ? colors.primary : colors['text-tertiary'],
                  borderWidth: isActive ? 3 : 0,
                  borderColor: colors.surface,
                }}
              />
            );
          })}
      </View>

      {/* Labels under track */}
      {trackWidth > 0 && (
        <View style={{ flexDirection: 'row', paddingHorizontal: 10, marginTop: 4 }}>
          {PRICE_VALUES.map((price, i) => (
            <Text
              key={price}
              style={{
                position: 'absolute',
                left: 10 + i * segmentWidth - 16,
                width: 32,
                textAlign: 'center',
                fontSize: 11,
                color: i === idx ? colors['text-primary'] : colors['text-secondary'],
                fontWeight: i === idx ? '600' : '400',
              }}
            >
              {'\u20AC'}{price}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}
