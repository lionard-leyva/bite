import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RATING_MAX } from '../config/constants';

interface StarRatingProps {
  rating: number;
  onRate: (value: number) => void;
  size?: number;
}

export default function StarRating({
  rating,
  onRate,
  size = 36,
}: StarRatingProps) {
  return (
    <View className="flex-row items-center gap-1">
      {Array.from({ length: RATING_MAX }, (_, i) => {
        const value = i + 1;
        const filled = value <= rating;
        return (
          <Pressable
            key={value}
            onPress={() => onRate(value)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`${value} estrella${value > 1 ? 's' : ''}`}
          >
            <Ionicons
              name={filled ? 'star' : 'star-outline'}
              size={size}
              color={filled ? '#FFB400' : '#EBEBEB'}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
