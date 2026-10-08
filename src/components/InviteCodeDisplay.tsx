import { View, Text, Pressable, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

interface InviteCodeDisplayProps {
  code: string;
}

export default function InviteCodeDisplay({ code }: InviteCodeDisplayProps) {
  const { colors } = useTheme();
  const formatted =
    code.length === 6
      ? `${code.slice(0, 3)}-${code.slice(3)}`
      : code;

  async function handleShare() {
    await Share.share({
      message: `Unite a mi lista en Bite con el codigo: ${formatted}`,
    });
  }

  return (
    <View className="items-center gap-4 rounded-card border border-border bg-surface p-6">
      <Text className="text-caption text-text-secondary">Tu codigo de invitacion</Text>
      <Text className="text-hero font-bold tracking-widest text-text-primary">
        {formatted}
      </Text>
      <Pressable
        className="flex-row items-center gap-2 rounded-pill bg-primary px-6 py-3"
        onPress={handleShare}
      >
        <Ionicons name="share-outline" size={18} color={colors['on-primary']} />
        <Text className="text-sm font-semibold text-on-primary">Compartir codigo</Text>
      </Pressable>
    </View>
  );
}
