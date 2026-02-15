import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { joinListByCode } from '../services/listService';
import InviteCodeDisplay from './InviteCodeDisplay';

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
      Alert.alert('Error', e.message ?? 'No se pudo unir');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-white px-6 pt-6">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-xl font-bold text-gray-900">
            Compartir lista
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text className="text-base text-gray-400">Cerrar</Text>
          </Pressable>
        </View>

        {/* Tabs */}
        <View className="mb-6 flex-row rounded-lg bg-gray-100 p-1">
          <Pressable
            className={`flex-1 items-center rounded-md py-2.5 ${tab === 'create' ? 'bg-white shadow-sm' : ''}`}
            onPress={() => setTab('create')}
          >
            <Text
              className={`text-sm font-medium ${tab === 'create' ? 'text-gray-900' : 'text-gray-500'}`}
            >
              Mi codigo
            </Text>
          </Pressable>
          <Pressable
            className={`flex-1 items-center rounded-md py-2.5 ${tab === 'join' ? 'bg-white shadow-sm' : ''}`}
            onPress={() => setTab('join')}
          >
            <Text
              className={`text-sm font-medium ${tab === 'join' ? 'text-gray-900' : 'text-gray-500'}`}
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
                <Text className="mb-6 text-center text-sm text-gray-500">
                  Comparte este codigo con tu pareja para que se una a tu lista
                </Text>
                <InviteCodeDisplay code={inviteCode} />
              </>
            ) : (
              <Text className="text-sm text-gray-400">
                Cargando codigo...
              </Text>
            )}
          </View>
        ) : (
          <View className="pt-4">
            <Text className="mb-4 text-sm text-gray-500">
              Introduce el codigo que te compartieron
            </Text>
            <TextInput
              className="mb-4 rounded-lg border border-gray-300 px-4 py-3 text-center text-xl font-bold tracking-widest"
              placeholder="ABC-123"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              maxLength={7}
            />
            <Pressable
              className={`items-center rounded-xl py-4 ${loading ? 'bg-gray-300' : 'bg-red-500'}`}
              onPress={handleJoin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-base font-semibold text-white">
                  Unirme
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}
