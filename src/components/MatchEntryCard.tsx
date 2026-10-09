import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

interface MatchEntryCardProps {
  pendingCount: number;
  onPress: () => void;
  bottomOffset: number;
}

export default function MatchEntryCard({ pendingCount, onPress, bottomOffset }: MatchEntryCardProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      style={[
        styles.card,
        {
          bottom: bottomOffset,
          backgroundColor: colors.surface,
          shadowColor: colors['text-primary'],
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`¿Dónde cenamos hoy? ${pendingCount} pendientes`}
    >
      <View style={[styles.icon, { backgroundColor: colors['primary-light'] }]}>
        <Text style={styles.emoji}>🍽</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors['text-primary'] }]}>¿Dónde cenamos hoy?</Text>
        <Text style={[styles.subtitle, { color: colors['text-secondary'] }]} numberOfLines={1}>Descubrid dónde coincidís ❤</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors['text-secondary']} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 16,
    right: 92,
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 18 },
  title: { fontSize: 15, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 1 },
});
