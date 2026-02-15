import { View, Pressable, Text, Image } from 'react-native';
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
          className="h-40 w-full rounded-lg"
          resizeMode="cover"
        />
        <Pressable onPress={onPhotoRemoved} accessibilityRole="button" accessibilityLabel="Quitar foto">
          <Text className="text-sm text-red-500">Quitar foto</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-row gap-3">
      <Pressable
        className="flex-1 items-center rounded-lg border border-gray-300 py-3"
        onPress={() => handlePick('camera')}
        accessibilityRole="button"
        accessibilityLabel="Tomar foto con camara"
      >
        <Text className="text-sm text-gray-600">Camara</Text>
      </Pressable>
      <Pressable
        className="flex-1 items-center rounded-lg border border-gray-300 py-3"
        onPress={() => handlePick('gallery')}
        accessibilityRole="button"
        accessibilityLabel="Elegir foto de galeria"
      >
        <Text className="text-sm text-gray-600">Galeria</Text>
      </Pressable>
    </View>
  );
}
