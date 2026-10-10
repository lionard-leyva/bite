import { View, Text, Pressable, Platform, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DragHandle from './DragHandle';
import PhotoHeader from './PhotoHeader';
import AvatarStack from './AvatarStack';
import { useTheme } from '../theme/ThemeProvider';
import { withAlpha } from '../theme/color';
import type { Restaurant } from '../types';
import { CARD_BOTTOM_POSITION, CARD_HORIZONTAL_MARGIN, Z_CARD } from '../config/constants';

interface MapDetailCardProps {
  restaurant: Restaurant;
  translateY: Animated.Value;
  onClose: () => void;
  onDetail: () => void;
  onNavigate: () => void;
  /** Precio y distancia o tiempo, ya unidos con " · ". */
  metaLine: string;
  etaLoading: boolean;
  /** "Guardado por Ana" en una lista compartida; nada en una lista personal. */
  savedBy?: string | null;
  avatarNames?: string[];
}

const RADIUS = 18;

// Hoja inferior del diseno Terracota: foto con estado, nombre en serif, "★ 4 · €€ · a 6 min", quien lo guardo y las
// dos acciones (Ver detalle en terracota, Ir ahora con contorno).
export default function MapDetailCard({
  restaurant,
  translateY,
  onClose,
  onDetail,
  onNavigate,
  metaLine,
  etaLoading,
  savedBy,
  avatarNames = [],
}: MapDetailCardProps) {
  const { colors } = useTheme();
  const rating = Math.max(0, Math.min(5, Math.round(restaurant.rating)));
  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: CARD_BOTTOM_POSITION,
        left: CARD_HORIZONTAL_MARGIN,
        right: CARD_HORIZONTAL_MARGIN,
        backgroundColor: colors.surface,
        borderRadius: RADIUS,
        padding: 8,
        paddingBottom: 12,
        zIndex: Z_CARD,
        transform: [{ translateY }],
        ...(Platform.OS === 'android'
          ? { elevation: 8 }
          : { shadowColor: colors['text-primary'], shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.18, shadowRadius: 28 }),
      }}
    >
      <DragHandle />

      <View>
        <PhotoHeader restaurant={restaurant} height={112} radius={12} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar tarjeta"
          onPress={onClose}
          hitSlop={12}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: withAlpha(colors['text-primary'], 0.35),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="close" size={16} color={colors.surface} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 6, paddingTop: 10, gap: 4 }}>
        <Text numberOfLines={1} style={{ fontSize: 21, fontFamily: 'YoungSerif_400Regular', color: colors['text-primary'] }}>
          {restaurant.name}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontFamily: 'Figtree_400Regular', fontSize: 13.5, color: colors['text-secondary'] }}>
            <Text style={{ color: colors.star }}>★</Text> <Text>{rating}</Text>
            {!etaLoading && metaLine ? ` · ${metaLine}` : ''}
          </Text>
          {etaLoading && <ActivityIndicator size={10} color={colors['text-tertiary']} />}
        </View>

        {savedBy ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
            {avatarNames.length > 0 && <AvatarStack names={avatarNames} size={22} filled />}
            <Text style={{ fontFamily: 'Figtree_400Regular', fontSize: 13, color: colors['text-secondary'] }}>{savedBy}</Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <Pressable
            onPress={onDetail}
            accessibilityRole="button"
            style={{
              flex: 1,
              minHeight: 46,
              borderRadius: 12,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors['on-primary'], fontFamily: 'Figtree_700Bold', fontSize: 15 }}>Ver detalle</Text>
          </Pressable>
          <Pressable
            onPress={onNavigate}
            accessibilityRole="button"
            style={{
              flex: 1,
              minHeight: 46,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors['text-primary'], fontFamily: 'Figtree_700Bold', fontSize: 15 }}>Ir ahora</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}
