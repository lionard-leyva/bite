import { View, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
}

export default function SearchBar({ value, onChangeText }: SearchBarProps) {
  return (
    <View className="flex-row items-center rounded-pill bg-background border border-border px-4 py-2.5">
      <Ionicons name="search" size={18} color="#B0B0B0" style={{ marginRight: 8 }} />
      <TextInput
        className="flex-1 text-body text-text-primary"
        placeholder="Buscar..."
        placeholderTextColor="#B0B0B0"
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
          <Ionicons name="close-circle" size={18} color="#B0B0B0" />
        </Pressable>
      )}
    </View>
  );
}
