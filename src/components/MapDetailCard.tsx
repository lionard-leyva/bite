import { View, Text, Pressable, Platform, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import DragHandle from './DragHandle';
import { useTheme } from '../theme/ThemeProvider';
import { withAlpha } from '../theme/color';
import { getPrimaryPhoto } from '../types';
import type { Restaurant } from '../types';
import {
  CARD_BOTTOM_POSITION,
  CARD_HORIZONTAL_MARGIN,
  CARD_BORDER_RADIUS,
  CARD_PHOTO_HEIGHT,
  Z_CARD,
} from '../config/constants';

interface MapDetailCardProps {
  restaurant: Restaurant;
  translateY: Animated.Value;
  onClose: () => void;
  onDetail: () => void;
  onNavigate: () => void;
  metaLine: string;
  etaLoading: boolean;
}

export default function MapDetailCard({
  restaurant,
  translateY,
  onClose,
  onDetail,
  onNavigate,
  metaLine,
  etaLoading,
}: MapDetailCardProps) {
  const { colors } = useTheme();
  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: CARD_BOTTOM_POSITION,
        left: CARD_HORIZONTAL_MARGIN,
        right: CARD_HORIZONTAL_MARGIN,
        backgroundColor: colors.surface,
        borderRadius: CARD_BORDER_RADIUS,
        zIndex: Z_CARD,
        transform: [{ translateY }],
        ...(Platform.OS === 'android'
          ? { elevation: 6 }
          : { shadowColor: colors['text-primary'], shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 10 }),
      }}
    >
      <DragHandle />

      {/* Photo */}
      {getPrimaryPhoto(restaurant) ? (
        <View style={{ borderRadius: CARD_BORDER_RADIUS - 4, overflow: 'hidden', height: 140, marginHorizontal: 4 }}>
          <Image
            source={{ uri: getPrimaryPhoto(restaurant)! }}
            style={{ width: '100%', height: 140 }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
          />
        </View>
      ) : null}

      {/* Close */}
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar tarjeta"
        onPress={onClose}
        hitSlop={12}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 20,
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: withAlpha(colors['text-primary'], 0.6),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="close" size={18} color={colors.background} />
      </Pressable>

      {/* Info */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
        <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: '700', color: colors['text-primary'] }}>
          {restaurant.name}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <View style={{ flexDirection: 'row' }}>
            {[0, 1, 2, 3, 4].map((k) => (
              <Ionicons
                key={`star-${k}`}
                name={k < restaurant.rating ? 'star' : 'star-outline'}
                size={14}
                color={k < restaurant.rating ? colors.star : colors.border}
              />
            ))}
          </View>
          <View style={{ backgroundColor: restaurant.visited ? colors['visited-light'] : colors['primary-light'], paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: restaurant.visited ? colors.visited : colors['text-secondary'] }}>
              {restaurant.visited ? 'Visitado' : 'Pendiente'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          {etaLoading ? (
            <ActivityIndicator size={10} color={colors['text-tertiary']} />
          ) : (
            <Text style={{ fontSize: 13, color: colors['text-secondary'] }}>
              {(() => {
                const parts = metaLine.split(' \u00B7 ');
                const dist = parts[0] ?? '';
                const rest = parts.slice(1).join(' \u00B7 ');
                return (
                  <>
                    <Text style={{ fontWeight: '700', color: colors['text-primary'] }}>{dist}</Text>
                    {rest ? <Text>{` \u00B7 ${rest}`}</Text> : null}
                  </>
                );
              })()}
            </Text>
          )}
        </View>
      </View>

      {/* Buttons */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10, marginTop: 2 }}>
        <Pressable
          onPress={onDetail}
          style={{
            flex: 1,
            backgroundColor: colors.primary,
            paddingVertical: 10,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 6,
            minHeight: 44,
          }}
        >
          <Ionicons name="information-circle-outline" size={16} color={colors['on-primary']} />
          <Text style={{ color: colors['on-primary'], fontWeight: '700', fontSize: 14 }}>Ver detalle</Text>
        </Pressable>

        <Pressable
          onPress={onNavigate}
          style={{
            flex: 1,
            backgroundColor: colors.visited,
            paddingVertical: 10,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 6,
            minHeight: 44,
          }}
        >
          <Ionicons name="navigate" size={16} color={colors['on-visited']} />
          <Text style={{ color: colors['on-visited'], fontWeight: '700', fontSize: 14 }}>Ir ahora</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}
