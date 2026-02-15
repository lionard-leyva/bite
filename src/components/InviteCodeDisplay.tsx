import { View, Text, Pressable, Alert, Share } from 'react-native';

interface InviteCodeDisplayProps {
  code: string;
}

export default function InviteCodeDisplay({ code }: InviteCodeDisplayProps) {
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
    <View className="items-center gap-3">
      <Text className="text-xs text-gray-400">Tu codigo de invitacion</Text>
      <Text className="text-3xl font-bold tracking-widest text-gray-900">
        {formatted}
      </Text>
      <Pressable
        className="rounded-full bg-gray-100 px-5 py-2"
        onPress={handleShare}
      >
        <Text className="text-sm font-medium text-gray-600">Compartir codigo</Text>
      </Pressable>
    </View>
  );
}
