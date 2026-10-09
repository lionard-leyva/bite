import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { initialOf } from '../utils/initialOf';

// Circulos con la inicial de cada persona, uno medio encima de otro. `filled`: como en el diseno Terracota, la primera
// persona en terracota y la segunda en salvia, con la inicial en blanco.
export default function AvatarStack({ names, size = 32, filled = false }: { names: string[]; size?: number; filled?: boolean }) {
  const { colors } = useTheme();
  const fondos = filled ? [colors.primary, colors.visited] : [colors['primary-light'], colors['visited-light']];
  const tintas = filled ? [colors['on-primary'], colors['on-visited']] : [colors['text-primary'], colors['text-primary']];
  return (
    <View style={{ flexDirection: 'row' }}>
      {names.map((name, i) => (
        <View
          key={`${name}-${i}`}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            marginLeft: i === 0 ? 0 : -size / 3,
            backgroundColor: fondos[i % fondos.length],
            borderWidth: 2,
            borderColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text testID="avatar" style={{ color: tintas[i % tintas.length], fontFamily: 'Figtree_700Bold', fontSize: size * 0.42 }}>
            {initialOf(name)}
          </Text>
        </View>
      ))}
    </View>
  );
}
