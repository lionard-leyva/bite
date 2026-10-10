import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeProvider';
import { getPrimaryPhoto, type Restaurant } from '../types';

// Cabecera de las tarjetas del diseno Terracota: la foto (o un degradado calido si no hay) con la insignia de estado.
export default function PhotoHeader({ restaurant, height, radius }: { restaurant: Restaurant; height: number; radius: number }) {
  const { colors } = useTheme();
  const photo = getPrimaryPhoto(restaurant);
  const tone = restaurant.visited
    ? ([colors['visited-light'], colors.visited] as const)
    : ([colors['primary-light'], colors.primary] as const);
  return (
    <View style={{ height, borderRadius: radius, overflow: 'hidden' }}>
      {photo ? (
        <Image
          source={{ uri: photo }}
          style={{ width: '100%', height }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={200}
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
        />
      ) : (
        <LinearGradient
          testID="photo-placeholder"
          colors={tone}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: '100%', height }}
        />
      )}
      <View
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: colors.surface,
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 4,
        }}
      >
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: restaurant.visited ? colors.visited : colors.primary }} />
        <Text style={{ fontFamily: 'Figtree_700Bold', fontSize: 11, color: colors['text-primary'] }}>
          {restaurant.visited ? 'Visitado' : 'Pendiente'}
        </Text>
      </View>
    </View>
  );
}
