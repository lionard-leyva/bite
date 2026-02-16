import { memo } from 'react';
import { View, Text, Image, ActivityIndicator } from 'react-native';
import { Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import {
  CALLOUT_WIDTH,
  CALLOUT_PHOTO_SIZE,
  CALLOUT_BORDER_RADIUS,
} from '../config/constants';

interface MapCalloutProps {
  name: string;
  rating: number;
  photoURL: string | null;
  createdAt: string;
  distanceText: string | null;
  visited: boolean;
  onPress: () => void;
  /** Combined "1.2km · 8 min" when available, or Haversine-only fallback */
  etaInfoText?: string | null;
  /** Whether ETA is loading from Directions API */
  etaLoading?: boolean;
  /** Callback to open native maps navigation */
  onNavigate?: () => void;
}

function MiniStars({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={10}
          color="#FFB800"
        />
      ))}
    </View>
  );
}

function MapCalloutInner({
  name,
  rating,
  photoURL,
  createdAt,
  distanceText,
  visited,
  onPress,
  etaInfoText,
  etaLoading,
  onNavigate,
}: MapCalloutProps) {
  // Use ETA info if available, otherwise fall back to Haversine distance
  const navigationLine = etaInfoText ?? distanceText;

  return (
    <Callout tooltip onPress={onNavigate ?? onPress}>
      <View style={{ alignItems: 'center' }}>
        {/* Card */}
        <View
          style={{
            width: CALLOUT_WIDTH,
            backgroundColor: '#fff',
            borderRadius: CALLOUT_BORDER_RADIUS,
            padding: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.18,
            shadowRadius: 8,
            elevation: 5,
          }}
        >
          <View style={{ flexDirection: 'row' }}>
            {/* Photo or placeholder */}
            <View
              style={{
                width: CALLOUT_PHOTO_SIZE,
                height: CALLOUT_PHOTO_SIZE,
                borderRadius: 10,
                backgroundColor: '#F3F4F6',
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
              }}
            >
              {photoURL ? (
                <Image
                  source={{ uri: photoURL }}
                  style={{ width: CALLOUT_PHOTO_SIZE, height: CALLOUT_PHOTO_SIZE }}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="restaurant" size={24} color="#9CA3AF" />
              )}
            </View>

            {/* Info */}
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: '#1F2937',
                  marginBottom: 3,
                }}
              >
                {name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <MiniStars rating={rating} />
                <View
                  style={{
                    backgroundColor: visited ? '#E6F7F5' : '#FFEEEE',
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    borderRadius: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: '600',
                      color: visited ? '#00A699' : '#FF5A5F',
                    }}
                  >
                    {visited ? 'Visitado' : 'Pendiente'}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 10, color: '#9CA3AF' }}>{createdAt}</Text>
                {etaLoading ? (
                  <ActivityIndicator size={8} color="#9CA3AF" />
                ) : navigationLine ? (
                  <Text style={{ fontSize: 10, color: '#6B7280', fontWeight: '500' }}>
                    {navigationLine}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* "Ir ahora" button — only shows when onNavigate is provided */}
          {onNavigate && (
            <View
              style={{
                marginTop: 8,
                backgroundColor: '#FF5A5F',
                borderRadius: 8,
                paddingVertical: 6,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <Ionicons name="navigate" size={13} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                Ir ahora
              </Text>
            </View>
          )}
        </View>

        {/* Triangle arrow */}
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: 10,
            borderRightWidth: 10,
            borderTopWidth: 10,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: '#fff',
          }}
        />
      </View>
    </Callout>
  );
}

export default memo(MapCalloutInner);
