import { useReducer, useEffect, useCallback } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { getListInviteCode, getListMembers, leaveSharedList } from '../services/listService';
import { getLocalRestaurantCount } from '../services/localStorageService';
import ShareListModal from '../components/ShareListModal';
import ConfirmModal from '../components/ConfirmModal';

export default function ProfileScreen() {
  const {
    user,
    userId,
    listId,
    skipMode,
    logout,
    refreshListId,
  } = useAuth();

  interface ProfileState {
    inviteCode: string | null;
    members: { userId: string; email: string; displayName: string }[];
    shareModalVisible: boolean;
    logoutModalVisible: boolean;
    createAccountModalVisible: boolean;
    leaveListModalVisible: boolean;
    loadingProfile: boolean;
    localCount: number;
  }

  type ProfileAction =
    | { type: 'patch'; payload: Partial<ProfileState> }
    | { type: 'reset' };

  const initialState: ProfileState = {
    inviteCode: null,
    members: [],
    shareModalVisible: false,
    logoutModalVisible: false,
    createAccountModalVisible: false,
    leaveListModalVisible: false,
    loadingProfile: true,
    localCount: 0,
  };

  function reducer(state: ProfileState, action: ProfileAction): ProfileState {
    switch (action.type) {
      case 'patch':
        return { ...state, ...action.payload };
      case 'reset':
        return initialState;
      default:
        return state;
    }
  }

  const [state, dispatch] = useReducer(reducer, initialState);

  const loadListInfo = useCallback(async () => {
    if (skipMode || !listId || listId === 'local') {
      const count = await getLocalRestaurantCount();
      dispatch({ type: 'patch', payload: { localCount: count, loadingProfile: false } });
      return;
    }

    try {
      const [code, mems] = await Promise.all([
        getListInviteCode(listId),
        getListMembers(listId),
      ]);
      dispatch({ type: 'patch', payload: { inviteCode: code, members: mems } });
    } catch {
      // Ignore errors loading list info
    }
    dispatch({ type: 'patch', payload: { loadingProfile: false } });
  }, [listId, skipMode]);

  useEffect(() => {
    loadListInfo();
  }, [loadListInfo]);

  const otherMembers = state.members.filter((m) => m.userId !== userId);
  const isShared = otherMembers.length > 0;

  async function handleConfirmLogout() {
    dispatch({ type: 'patch', payload: { logoutModalVisible: false } });
    await logout();
  }

  async function handleConfirmCreateAccount() {
    dispatch({ type: 'patch', payload: { createAccountModalVisible: false } });
    await logout();
  }

  async function handleConfirmLeaveList() {
    dispatch({ type: 'patch', payload: { leaveListModalVisible: false } });
    try {
      const newListId = await leaveSharedList(userId, listId);
      refreshListId(newListId);
      dispatch({ type: 'patch', payload: { inviteCode: null, members: [] } });
      loadListInfo();
    } catch {
      Alert.alert('Error', 'No se pudo dejar la lista compartida');
    }
  }

  function handleJoined(newListId: string) {
    refreshListId(newListId);
    dispatch({ type: 'patch', payload: { shareModalVisible: false } });
    loadListInfo();
  }

  if (state.loadingProfile) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#FF5A5F" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="items-center pt-12 pb-6">
        {/* Avatar */}
        <View className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-primary/15">
          <Ionicons name="person" size={36} color="#FF5A5F" />
        </View>
        {skipMode ? (
          <>
            <Text className="text-subtitle font-semibold text-text-primary">
              Modo sin cuenta
            </Text>
            <Text className="text-sm text-text-tertiary">
              Datos guardados solo en este dispositivo
            </Text>
          </>
        ) : (
          <>
            <Text className="text-subtitle font-semibold text-text-primary">
              {user?.displayName || user?.email?.split('@')[0] || 'Usuario'}
            </Text>
            <Text className="text-sm text-text-tertiary">{user?.email}</Text>
          </>
        )}
      </View>

      <View className="px-5">
        {/* List section - only for logged in users */}
        {!skipMode && (
          <View className="mb-6 rounded-modal bg-surface border border-border p-4">
            <Text className="mb-3 text-label font-medium uppercase tracking-wider text-text-tertiary">
              Mi lista
            </Text>

            {isShared ? (
              <View className="gap-2">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="people" size={14} color="#00A699" />
                  <Text className="text-sm text-success">Compartiendo con:</Text>
                </View>
                {otherMembers.map((m) => (
                  <Text key={m.userId} className="text-sm font-medium text-text-primary">
                    {m.displayName || m.email}
                  </Text>
                ))}
                {state.inviteCode && (
                  <View className="mt-2">
                    <Text className="text-caption text-text-tertiary">
                      Codigo: {state.inviteCode.slice(0, 3)}-{state.inviteCode.slice(3)}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View className="gap-2">
                <Text className="text-sm text-text-secondary">
                  Lista personal. Comparte con tu pareja para ver restaurantes juntos.
                </Text>
              </View>
            )}

              <Pressable
                className="mt-3 flex-row items-center justify-center gap-2 rounded-button bg-primary py-3"
                onPress={() => dispatch({ type: 'patch', payload: { shareModalVisible: true } })}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
              >
              <Ionicons name="heart-outline" size={16} color="white" />
              <Text className="text-sm font-semibold text-white">
                {isShared ? 'Gestionar lista compartida' : 'Compartir con pareja'}
              </Text>
            </Pressable>

            {isShared && (
              <Pressable
                className="mt-2 items-center py-2"
                onPress={() => dispatch({ type: 'patch', payload: { leaveListModalVisible: true } })}
              >
                <Text className="text-caption text-text-tertiary">Dejar de compartir</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Skip mode info */}
        {skipMode && (
          <View className="mb-6 flex-row gap-3 rounded-modal bg-warning/10 border border-warning/30 p-4">
            <Ionicons name="alert-circle-outline" size={20} color="#FFB400" style={{ marginTop: 2 }} />
            <View className="flex-1">
              <Text className="mb-1 text-sm font-medium text-text-primary">
                Modo sin cuenta
              </Text>
              <Text className="mb-3 text-caption text-text-secondary">
                {localCount > 0
                  ? `Tienes ${state.localCount} restaurante${state.localCount > 1 ? 's' : ''} guardado${state.localCount > 1 ? 's' : ''} localmente. Crea una cuenta para sincronizar y compartir.`
                  : 'Crea una cuenta para sincronizar entre dispositivos y compartir con tu pareja.'}
              </Text>
              <Pressable
                className="items-center rounded-button bg-primary py-3"
                onPress={() => dispatch({ type: 'patch', payload: { createAccountModalVisible: true } })}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
              >
                <Text className="text-sm font-semibold text-white">
                  Crear cuenta
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Logout */}
        {!skipMode && (
          <Pressable
            className="flex-row items-center justify-center gap-2 rounded-button border border-border py-4"
            onPress={() => dispatch({ type: 'patch', payload: { logoutModalVisible: true } })}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
            <Ionicons name="log-out-outline" size={18} color="#717171" />
            <Text className="text-sm font-medium text-text-secondary">
              Cerrar sesion
            </Text>
          </Pressable>
        )}
      </View>

      {/* Share modal */}
      <ShareListModal
        visible={state.shareModalVisible}
        inviteCode={state.inviteCode}
        onClose={() => dispatch({ type: 'patch', payload: { shareModalVisible: false } })}
        onJoined={handleJoined}
      />

      <ConfirmModal
        visible={state.logoutModalVisible}
        title="Cerrar sesion"
        message="¿Seguro que quieres cerrar sesion?"
        confirmLabel="Cerrar sesion"
        destructive
        onConfirm={handleConfirmLogout}
        onCancel={() => dispatch({ type: 'patch', payload: { logoutModalVisible: false } })}
      />

      <ConfirmModal
        visible={state.createAccountModalVisible}
        title="Crear cuenta"
        message={
          state.localCount > 0
            ? `Tienes ${state.localCount} restaurante${state.localCount > 1 ? 's' : ''} guardado${state.localCount > 1 ? 's' : ''}. Al crear cuenta podras sincronizarlos y compartir.`
            : 'Crea una cuenta para sincronizar y compartir tu lista.'
        }
        confirmLabel="Continuar"
        onConfirm={handleConfirmCreateAccount}
        onCancel={() => dispatch({ type: 'patch', payload: { createAccountModalVisible: false } })}
      />

      <ConfirmModal
        visible={state.leaveListModalVisible}
        title="Dejar de compartir"
        message="Volveras a tener una lista personal. Los restaurantes que guardaste seguiran en la lista compartida."
        confirmLabel="Dejar de compartir"
        destructive
        onConfirm={handleConfirmLeaveList}
        onCancel={() => dispatch({ type: 'patch', payload: { leaveListModalVisible: false } })}
      />
    </ScrollView>
  );
}
