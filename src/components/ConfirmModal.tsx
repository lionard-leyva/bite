import { View, Text, Pressable, Modal } from 'react-native';
import DragHandle from './DragHandle';

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
  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}
        onPress={onCancel}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 24,
              paddingBottom: 34,
            }}
          >
            <DragHandle />

            <Text
              style={{
                marginTop: 12,
                marginBottom: 8,
                fontSize: 18,
                fontWeight: '700',
                color: '#1F2937',
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                marginBottom: 24,
                fontSize: 15,
                color: '#6B7280',
                lineHeight: 22,
              }}
            >
              {message}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                style={({ pressed }) => ({
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  paddingVertical: 14,
                  opacity: pressed ? 0.85 : 1,
                })}
                onPress={onCancel}
              >
                <Text style={{ fontSize: 15, fontWeight: '500', color: '#6B7280' }}>
                  {cancelLabel}
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => ({
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  paddingVertical: 14,
                  backgroundColor: destructive ? '#FF5A5F' : '#1F2937',
                  opacity: pressed ? 0.85 : 1,
                })}
                onPress={onConfirm}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>
                  {confirmLabel}
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
