import { View, Text, Pressable, Modal } from 'react-native';

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
    <Modal visible={visible} transparent animationType="fade">
      <Pressable
        className="flex-1 items-center justify-center bg-black/50"
        onPress={onCancel}
      >
        <Pressable
          className="mx-8 w-full max-w-sm rounded-modal bg-surface p-6"
          onPress={(e) => e.stopPropagation()}
        >
          <Text className="mb-2 text-subtitle font-bold text-text-primary">
            {title}
          </Text>
          <Text className="mb-6 text-body text-text-secondary">
            {message}
          </Text>
          <View className="flex-row gap-3">
            <Pressable
              className="flex-1 items-center rounded-button border border-border py-3"
              onPress={onCancel}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <Text className="text-sm font-medium text-text-secondary">
                {cancelLabel}
              </Text>
            </Pressable>
            <Pressable
              className={`flex-1 items-center rounded-button py-3 ${destructive ? 'bg-primary' : 'bg-text-primary'}`}
              onPress={onConfirm}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <Text className="text-sm font-semibold text-white">
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
