import { View, Pressable, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pickImage } from '../services/imageService';

interface PhotoPickerProps {
  photoUri: string | null;
  onPhotoPicked: (uri: string) => void;
  onPhotoRemoved: () => void;
}

export default function PhotoPicker({
  photoUri,
  onPhotoPicked,
  onPhotoRemoved,
}: PhotoPickerProps) {
  async function handlePick(source: 'camera' | 'gallery') {
    const uri = await pickImage(source);
    if (uri) onPhotoPicked(uri);
  }

  if (photoUri) {
    return (
      <View className="items-center gap-2">
        <Image
          source={{ uri: photoUri }}
          className="h-40 w-full rounded-card"
          resizeMode="cover"
        />
        <Pressable
          className="flex-row items-center gap-1.5 rounded-pill bg-primary/10 px-4 py-2"
          onPress={onPhotoRemoved}
          accessibilityRole="button"
          accessibilityLabel="Quitar foto"
        >
          <Ionicons name="trash-outline" size={14} color="#FF5A5F" />
          <Text className="text-sm font-medium text-primary">Quitar foto</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-row gap-3">
      <Pressable
        className="flex-1 items-center gap-1.5 rounded-card border border-dashed border-border py-4"
        onPress={() => handlePick('camera')}
        accessibilityRole="button"
        accessibilityLabel="Tomar foto con camara"
      >
        <Ionicons name="camera-outline" size={24} color="#717171" />
        <Text className="text-sm text-text-secondary">Camara</Text>
      </Pressable>
      <Pressable
        className="flex-1 items-center gap-1.5 rounded-card border border-dashed border-border py-4"
        onPress={() => handlePick('gallery')}
        accessibilityRole="button"
        accessibilityLabel="Elegir foto de galeria"
      >
        <Ionicons name="images-outline" size={24} color="#717171" />
        <Text className="text-sm text-text-secondary">Galeria</Text>
      </Pressable>
    </View>
  );
}
