import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LocationNoticeContent } from '../utils/locationNotice';

interface LocationNoticeProps {
  notice: LocationNoticeContent;
  onDismiss: () => void;
}

export default function LocationNotice({ notice, onDismiss }: LocationNoticeProps) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.message}>{notice.message}</Text>
      <View style={styles.actions}>
        {notice.actionLabel && (
          <Pressable
            style={styles.action}
            onPress={() => {
              Linking.openSettings().catch(() => {});
            }}
            accessibilityRole="button"
            accessibilityLabel={notice.actionLabel}
          >
            <Text style={styles.actionText}>{notice.actionLabel}</Text>
          </Pressable>
        )}
        <Pressable
          style={styles.close}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Cerrar aviso de ubicacion"
        >
          <Ionicons name="close" size={16} color="#E5E7EB" />
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
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255, 90, 95, 0.55)',
  },
  message: { flex: 1, color: '#F3F4F6', fontSize: 13 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  action: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#FF5A5F' },
  actionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  close: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
