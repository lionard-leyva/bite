import { View, Text, Pressable, Platform, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import DragHandle from './DragHandle';
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
  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: CARD_BOTTOM_POSITION,
        left: CARD_HORIZONTAL_MARGIN,
        right: CARD_HORIZONTAL_MARGIN,
        backgroundColor: '#FFFFFF',
        borderRadius: CARD_BORDER_RADIUS,
        zIndex: Z_CARD,
        transform: [{ translateY }],
        ...(Platform.OS === 'android'
          ? { elevation: 6 }
          : { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 8 }),
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
      <Pressable
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
          backgroundColor: 'rgba(0,0,0,0.5)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="close" size={18} color="#fff" />
      </Pressable>

      {/* Info */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
        <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: '700', color: '#1F2937' }}>
          {restaurant.name}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <Text style={{ fontSize: 13 }}>{'\u{2B50}'.repeat(restaurant.rating)}</Text>
          <View style={{ backgroundColor: restaurant.visited ? '#E6F7F5' : '#FFEEEE', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: restaurant.visited ? '#00A699' : '#FF5A5F' }}>
              {restaurant.visited ? 'Visitado' : 'Pendiente'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          {etaLoading ? (
            <ActivityIndicator size={10} color="#9CA3AF" />
          ) : (
            <Text style={{ fontSize: 13, color: '#6B7280' }}>
              {(() => {
                const parts = metaLine.split(' \u00B7 ');
                const dist = parts[0] ?? '';
                const rest = parts.slice(1).join(' \u00B7 ');
                return (
                  <>
                    <Text style={{ fontWeight: '700', color: '#111827' }}>{dist}</Text>
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
            backgroundColor: '#ef4444',
            paddingVertical: 10,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 6,
            minHeight: 44,
          }}
        >
          <Ionicons name="information-circle-outline" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Ver detalle</Text>
        </Pressable>

        <Pressable
          onPress={onNavigate}
          style={{
            flex: 1,
            backgroundColor: '#3b82f6',
            paddingVertical: 10,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 6,
            minHeight: 44,
          }}
        >
          <Ionicons name="navigate" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Ir ahora</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}
