import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { initialOf } from '../utils/initialOf';

// Circulos con la inicial de cada persona, uno medio encima de otro.
export default function AvatarStack({ names, size = 32 }: { names: string[]; size?: number }) {
  const { colors } = useTheme();
  const fondos = [colors['primary-light'], colors['visited-light']];
  return (
    <View style={{ flexDirection: 'row' }}>
      {names.map((name, i) => (
        <View
          key={`${name}-${i}`}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            marginLeft: i === 0 ? 0 : -size / 4,
            backgroundColor: fondos[i % fondos.length],
            borderWidth: 2,
            borderColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text testID="avatar" style={{ color: colors['text-primary'], fontWeight: '700', fontSize: size * 0.4 }}>
            {initialOf(name)}
          </Text>
        </View>
      ))}
    </View>
  );
}
