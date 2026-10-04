import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MatchEntryCardProps {
  pendingCount: number;
  onPress: () => void;
  bottomOffset: number;
}

export default function MatchEntryCard({ pendingCount, onPress, bottomOffset }: MatchEntryCardProps) {
  return (
    <Pressable
      style={[styles.card, { bottom: bottomOffset }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`¿Dónde cenamos hoy? ${pendingCount} pendientes`}
    >
      <View style={styles.icon}>
        <Text style={styles.emoji}>🍽</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>¿Dónde cenamos hoy?</Text>
        <Text style={styles.subtitle} numberOfLines={1}>Descubrid dónde coincidís ❤</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#E5E7EB" />
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
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 103, 0.55)',
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 77, 103, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 18 },
  title: { color: '#F9FAFB', fontSize: 15, fontWeight: '800' },
  subtitle: { color: '#CBD5E1', fontSize: 12, marginTop: 1 },
});
