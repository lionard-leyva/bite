import { View, TextInput, Pressable, Text } from 'react-native';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
}

export default function SearchBar({ value, onChangeText }: SearchBarProps) {
  return (
    <View className="flex-row items-center rounded-lg bg-gray-100 px-3 py-2">
      <Text className="mr-2 text-gray-400">&#x1F50D;</Text>
      <TextInput
        className="flex-1 text-base text-gray-900"
        placeholder="Buscar..."
        placeholderTextColor="#9ca3af"
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        accessibilityLabel="Buscar restaurantes"
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Limpiar busqueda"
        >
          <Text className="text-gray-400">&#x2715;</Text>
        </Pressable>
      )}
    </View>
  );
}
