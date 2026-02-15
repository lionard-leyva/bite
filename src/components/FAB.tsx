import { Pressable, Text } from 'react-native';

interface FABProps {
  onPress: () => void;
}

export default function FAB({ onPress }: FABProps) {
  return (
    <Pressable
      className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-red-500 shadow-lg"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Guardar restaurante"
    >
      <Text className="text-2xl font-bold text-white">+</Text>
    </Pressable>
  );
}
