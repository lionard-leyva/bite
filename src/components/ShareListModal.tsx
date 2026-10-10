import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { joinListByCode } from '../services/listService';
import InviteCodeDisplay from './InviteCodeDisplay';
import DragHandle from './DragHandle';
import { useTheme } from '../theme/ThemeProvider';
import { friendlyMessage } from '../utils/userError';

type Tab = 'create' | 'join';

interface ShareListModalProps {
  visible: boolean;
  inviteCode: string | null;
  onClose: () => void;
  onJoined: (listId: string) => void;
}

export default function ShareListModal({
  visible,
  inviteCode,
  onClose,
  onJoined,
}: ShareListModalProps) {
  const { userId } = useAuth();
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('create');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    const trimmed = code.trim();
    if (trimmed.length < 4) {
      Alert.alert('Codigo', 'Introduce un codigo valido');
      return;
    }

    setLoading(true);
    try {
      const { listId, ownerName } = await joinListByCode(userId, trimmed.replace('-', ''));
      Alert.alert('Conectado', `Conectado con ${ownerName}!`);
      onJoined(listId);
    } catch (e: any) {
      Alert.alert('No se pudo unir', friendlyMessage(e, 'Revisa el código e inténtalo de nuevo.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
      <ScrollView
        className="flex-1 bg-background px-6 pt-0"
        keyboardShouldPersistTaps="handled"
      >
        <DragHandle />

        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-title font-display text-text-primary">
            Compartir lista
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar"
            className="h-8 w-8 items-center justify-center rounded-full bg-border"
            onPress={onClose}
            hitSlop={12}
          >
            <Ionicons name="close" size={18} color={colors['text-primary']} />
          </Pressable>
        </View>

        {/* Pill tab toggle */}
        <View className="mb-6 flex-row rounded-pill bg-border p-1">
          <Pressable
            className={`flex-1 items-center rounded-pill py-2.5 ${tab === 'create' ? 'bg-text-primary' : ''}`}
            onPress={() => setTab('create')}
          >
            <Text
              className={`text-sm font-medium ${tab === 'create' ? 'text-background' : 'text-text-secondary'}`}
            >
              Mi codigo
            </Text>
          </Pressable>
          <Pressable
            className={`flex-1 items-center rounded-pill py-2.5 ${tab === 'join' ? 'bg-text-primary' : ''}`}
            onPress={() => setTab('join')}
          >
            <Text
              className={`text-sm font-medium ${tab === 'join' ? 'text-background' : 'text-text-secondary'}`}
            >
              Unirme con codigo
            </Text>
          </Pressable>
        </View>

        {/* Content */}
        {tab === 'create' ? (
          <View className="flex-1 items-center pt-8">
            {inviteCode ? (
              <>
                <Text className="mb-6 text-center text-sm text-text-secondary">
                  Comparte este codigo con tu pareja o grupo para que se una a tu lista
                </Text>
                <InviteCodeDisplay code={inviteCode} />
              </>
            ) : (
              <Text className="text-sm text-text-tertiary">
                Cargando codigo...
              </Text>
            )}
          </View>
        ) : (
          <View className="pt-4">
            <Text className="mb-4 text-sm text-text-secondary">
              Introduce el codigo que te compartieron
            </Text>
            <TextInput
              className="mb-4 rounded-input border border-border px-4 py-3 text-center text-xl font-bold tracking-widest text-text-primary"
              placeholder="ABC-123"
              placeholderTextColor={colors['text-tertiary']}
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              maxLength={7}
              style={{ minHeight: 48, textAlignVertical: 'center' }}
            />
            <Pressable
              className={`items-center rounded-button py-4 ${loading ? 'bg-border' : 'bg-primary'}`}
              onPress={handleJoin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors['text-secondary']} />
              ) : (
                <Text className="text-body font-semibold text-on-primary">
                  Unirme
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
