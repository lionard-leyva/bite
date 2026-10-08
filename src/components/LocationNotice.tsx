import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LocationNoticeContent } from '../utils/locationNotice';
import { useTheme } from '../theme/ThemeProvider';

interface LocationNoticeProps {
  notice: LocationNoticeContent;
  onDismiss: () => void;
}

export default function LocationNotice({ notice, onDismiss }: LocationNoticeProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.banner, { backgroundColor: colors.surface, shadowColor: colors['text-primary'] }]}
      accessibilityRole="alert"
    >
      <Text style={[styles.message, { color: colors['text-primary'] }]}>{notice.message}</Text>
      <View style={styles.actions}>
        {notice.actionLabel && (
          <Pressable
            style={[styles.action, { backgroundColor: colors.primary }]}
            onPress={() => {
              Linking.openSettings().catch(() => {});
            }}
            accessibilityRole="button"
            accessibilityLabel={notice.actionLabel}
          >
            <Text style={[styles.actionText, { color: colors['on-primary'] }]}>{notice.actionLabel}</Text>
          </Pressable>
        )}
        <Pressable
          style={styles.close}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Cerrar aviso de ubicacion"
        >
          <Ionicons name="close" size={16} color={colors['text-secondary']} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  message: { flex: 1, fontSize: 13 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  action: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  actionText: { fontSize: 12, fontWeight: '700' },
  close: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
