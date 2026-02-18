import { View, Pressable, Text, Image, ScrollView } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { pickImage } from '../services/imageService';
import { PHOTO_MAX_COUNT } from '../config/constants';

interface PhotoPickerProps {
  photoUris: string[];
  onPhotoAdded: (uri: string) => void;
  onPhotoRemoved: (index: number) => void;
}

export default function PhotoPicker({
  photoUris,
  onPhotoAdded,
  onPhotoRemoved,
}: PhotoPickerProps) {
  const [picking, setPicking] = useState(false);

  async function handlePick(source: 'camera' | 'gallery') {
    if (picking) return;
    setPicking(true);
    try {
      const uri = await pickImage(source);
      if (uri) onPhotoAdded(uri);
    } finally {
      setPicking(false);
    }
  }

  const canAddMore = photoUris.length < PHOTO_MAX_COUNT;
  const hasPhotos = photoUris.length > 0;
  const disabled = picking || !canAddMore;

  return (
    <View>
      {/* Counter */}
      {photoUris.length > 0 && (
        <Text
          style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}
        >
          {photoUris.length}/{PHOTO_MAX_COUNT}
        </Text>
      )}

      {hasPhotos ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, alignItems: 'center', paddingVertical: 4, paddingHorizontal: 2 }}
        >
          {/* Thumbnails */}
          {photoUris.map((uri, index) => (
            <View key={`${uri}-${index}`} style={{ position: 'relative' }}>
              <Image
                source={{ uri }}
                style={{ width: 80, height: 80, borderRadius: 12 }}
                resizeMode="cover"
              />
              <Pressable
                onPress={() => onPhotoRemoved(index)}
                hitSlop={6}
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: '#FF5A5F',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                accessibilityRole="button"
                accessibilityLabel={`Quitar foto ${index + 1}`}
              >
                <Ionicons name="close" size={14} color="white" />
              </Pressable>
            </View>
          ))}

        </ScrollView>
      ) : (
        <View />
      )}

      {/* Add buttons (full width, stacked) */}
      {canAddMore && (
        <View style={{ gap: 10, marginTop: hasPhotos ? 10 : 0 }}>
          <Pressable
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: '#E0E0E0',
              paddingVertical: 12,
              paddingHorizontal: 14,
              opacity: disabled ? 0.6 : 1,
            }}
            onPress={() => handlePick('camera')}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Tomar foto con camara"
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#FFF1F2',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="camera-outline" size={20} color="#FF5A5F" />
            </View>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>Tomar foto</Text>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>Abre la camara</Text>
            </View>
          </Pressable>

          <Pressable
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: '#E0E0E0',
              paddingVertical: 12,
              paddingHorizontal: 14,
              opacity: disabled ? 0.6 : 1,
            }}
            onPress={() => handlePick('gallery')}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Elegir foto de galeria"
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#EEF2FF',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="images-outline" size={20} color="#6366F1" />
            </View>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>Elegir de galeria</Text>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>Fotos guardadas</Text>
            </View>
          </Pressable>
        </View>
      )}
    </View>
  );
}
