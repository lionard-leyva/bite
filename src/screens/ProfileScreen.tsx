import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { getListInviteCode, getListMembers, leaveSharedList } from '../services/listService';
import { getLocalRestaurantCount } from '../services/localStorageService';
import ShareListModal from '../components/ShareListModal';

export default function ProfileScreen() {
  const {
    user,
    userId,
    listId,
    skipMode,
    logout,
    refreshListId,
  } = useAuth();

  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [members, setMembers] = useState<{ userId: string; email: string; displayName: string }[]>([]);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [localCount, setLocalCount] = useState(0);

  const loadListInfo = useCallback(async () => {
    if (skipMode || !listId || listId === 'local') {
      const count = await getLocalRestaurantCount();
      setLocalCount(count);
      setLoadingProfile(false);
      return;
    }

    try {
      const [code, mems] = await Promise.all([
        getListInviteCode(listId),
        getListMembers(listId),
      ]);
      setInviteCode(code);
      setMembers(mems);
    } catch {
      // Ignore errors loading list info
    }
    setLoadingProfile(false);
  }, [listId, skipMode]);

  useEffect(() => {
    loadListInfo();
  }, [loadListInfo]);

  const otherMembers = members.filter((m) => m.userId !== userId);
  const isShared = otherMembers.length > 0;

  async function handleLogout() {
    Alert.alert('Cerrar sesion', '¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesion', style: 'destructive', onPress: () => logout() },
    ]);
  }

  function handleCreateAccount() {
    Alert.alert(
      'Crear cuenta',
      localCount > 0
        ? `Tienes ${localCount} restaurante${localCount > 1 ? 's' : ''} guardado${localCount > 1 ? 's' : ''}. Al crear cuenta podras sincronizarlos y compartir.`
        : 'Crea una cuenta para sincronizar y compartir tu lista.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          onPress: async () => {
            // Navigate to auth - logout from skip mode triggers AuthScreen
            await logout();
          },
        },
      ],
    );
  }

  function handleLeaveList() {
    Alert.alert(
      'Dejar de compartir',
      'Volveras a tener una lista personal. Los restaurantes que guardaste seguiran en la lista compartida.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Dejar de compartir',
          style: 'destructive',
          onPress: async () => {
            try {
              const newListId = await leaveSharedList(userId, listId);
              refreshListId(newListId);
              setInviteCode(null);
              setMembers([]);
              loadListInfo();
            } catch {
              Alert.alert('Error', 'No se pudo dejar la lista compartida');
            }
          },
        },
      ],
    );
  }

  function handleJoined(newListId: string) {
    refreshListId(newListId);
    setShareModalVisible(false);
    loadListInfo();
  }

  if (loadingProfile) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#e63946" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="items-center pt-12 pb-6">
        <View className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-gray-100">
          <Text className="text-3xl">&#x1F464;</Text>
        </View>
        {skipMode ? (
          <>
            <Text className="text-lg font-semibold text-gray-900">
              Modo sin cuenta
            </Text>
            <Text className="text-sm text-gray-400">
              Datos guardados solo en este dispositivo
            </Text>
          </>
        ) : (
          <>
            <Text className="text-lg font-semibold text-gray-900">
              {user?.displayName || user?.email?.split('@')[0] || 'Usuario'}
            </Text>
            <Text className="text-sm text-gray-400">{user?.email}</Text>
          </>
        )}
      </View>

      <View className="px-4">
        {/* List section - only for logged in users */}
        {!skipMode && (
          <View className="mb-6 rounded-xl bg-gray-50 p-4">
            <Text className="mb-3 text-xs font-medium uppercase text-gray-400">
              Mi lista
            </Text>

            {isShared ? (
              <View className="gap-2">
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm text-green-600">Compartiendo con:</Text>
                </View>
                {otherMembers.map((m) => (
                  <Text key={m.userId} className="text-sm font-medium text-gray-900">
                    {m.displayName || m.email}
                  </Text>
                ))}
                {inviteCode && (
                  <View className="mt-2">
                    <Text className="text-xs text-gray-400">
                      Codigo: {inviteCode.slice(0, 3)}-{inviteCode.slice(3)}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View className="gap-2">
                <Text className="text-sm text-gray-500">
                  Lista personal. Comparte con tu pareja para ver restaurantes juntos.
                </Text>
              </View>
            )}

            <Pressable
              className="mt-3 items-center rounded-lg border border-red-200 bg-red-50 py-3"
              onPress={() => setShareModalVisible(true)}
            >
              <Text className="text-sm font-medium text-red-600">
                {isShared ? 'Gestionar lista compartida' : 'Compartir con pareja'}
              </Text>
            </Pressable>

            {isShared && (
              <Pressable
                className="mt-2 items-center py-2"
                onPress={handleLeaveList}
              >
                <Text className="text-xs text-gray-400">Dejar de compartir</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Skip mode info */}
        {skipMode && (
          <View className="mb-6 rounded-xl bg-amber-50 p-4">
            <Text className="mb-1 text-sm font-medium text-amber-700">
              Modo sin cuenta
            </Text>
            <Text className="mb-3 text-xs text-amber-600">
              {localCount > 0
                ? `Tienes ${localCount} restaurante${localCount > 1 ? 's' : ''} guardado${localCount > 1 ? 's' : ''} localmente. Crea una cuenta para sincronizar y compartir.`
                : 'Crea una cuenta para sincronizar entre dispositivos y compartir con tu pareja.'}
            </Text>
            <Pressable
              className="items-center rounded-lg bg-red-500 py-3"
              onPress={handleCreateAccount}
            >
              <Text className="text-sm font-semibold text-white">
                Crear cuenta
              </Text>
            </Pressable>
          </View>
        )}

        {/* Logout */}
        {!skipMode && (
          <Pressable
            className="items-center rounded-xl border border-gray-200 py-4"
            onPress={handleLogout}
          >
            <Text className="text-sm font-medium text-gray-500">
              Cerrar sesion
            </Text>
          </Pressable>
        )}
      </View>

      {/* Share modal */}
      <ShareListModal
        visible={shareModalVisible}
        inviteCode={inviteCode}
        onClose={() => setShareModalVisible(false)}
        onJoined={handleJoined}
      />
    </ScrollView>
  );
}
