import { View, Text, TouchableOpacity, Pressable, Modal } from 'react-native';
import { initialWindowMetrics } from 'react-native-safe-area-context';
import DragHandle from './DragHandle';
import { useTheme } from '../theme/ThemeProvider';
import { withAlpha } from '../theme/color';

const BOTTOM_INSET = initialWindowMetrics?.insets.bottom ?? 34;

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* Backdrop */}
        <Pressable
          style={{ flex: 1, backgroundColor: withAlpha(colors['text-primary'], 0.5) }}
          onPress={onCancel}
        />

        {/* Sheet */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: 24,
            paddingBottom: BOTTOM_INSET + 20,
          }}
        >
          <DragHandle />

          <Text
            style={{
              marginTop: 12,
              marginBottom: 8,
              fontSize: 18,
              fontWeight: '700',
              color: colors['text-primary'],
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              marginBottom: 24,
              fontSize: 15,
              color: colors['text-secondary'],
              lineHeight: 22,
            }}
          >
            {message}
          </Text>

          {/* Confirm button — full width, on top */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onConfirm()}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              paddingVertical: 16,
              backgroundColor: destructive ? colors.danger : colors['text-primary'],
              marginBottom: 10,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: destructive ? colors['on-danger'] : colors.background }}>
              {confirmLabel}
            </Text>
          </TouchableOpacity>

          {/* Cancel button — full width, below */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onCancel()}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              paddingVertical: 16,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '500', color: colors['text-secondary'] }}>
              {cancelLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
