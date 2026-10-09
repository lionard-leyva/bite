import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AvatarStack from './AvatarStack';
import { useTheme } from '../theme/ThemeProvider';

interface MatchEntryCardProps {
  pendingCount: number;
  onPress: () => void;
  /** Iniciales de la pareja; sin pareja no se dibujan. */
  avatarNames?: string[];
}

// Tarjeta terracota de la Lista (diseno Terracota): abre "¿Dónde cenamos hoy?".
export default function MatchEntryCard({ pendingCount, onPress, avatarNames = [] }: MatchEntryCardProps) {
  const { colors } = useTheme();
  const pendientes = `${pendingCount} ${pendingCount === 1 ? 'pendiente' : 'pendientes'}`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`¿Dónde cenamos hoy? ${pendientes}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: 18,
        backgroundColor: colors.primary,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      {avatarNames.length > 0 && <AvatarStack names={avatarNames} size={28} />}
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'YoungSerif_400Regular', fontSize: 19, color: colors['on-primary'] }}>¿Dónde cenamos hoy?</Text>
        <Text style={{ fontFamily: 'Figtree_400Regular', fontSize: 13, color: colors['on-primary'], opacity: 0.9, marginTop: 2 }}>
          {`${pendientes} · votad sin ver lo del otro`}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors['on-primary']} />
    </Pressable>
  );
}
