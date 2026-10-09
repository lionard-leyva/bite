import { useReducer, useEffect, useCallback, useState, useRef } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';
import { useLocation as useUserLocation } from '../hooks/useLocation';
import { getListInviteCode, getListMembers, leaveSharedList } from '../services/listService';
import { getLocalRestaurantCount } from '../services/localStorageService';
import { reverseGeocode } from '../services/locationService';
import ShareListModal from '../components/ShareListModal';
import ConfirmModal from '../components/ConfirmModal';
import KeyboardForm from '../components/KeyboardForm';
import { auth, db } from '../config/firebase';
import { pickImage, uploadAvatar } from '../services/imageService';
import { useTheme } from '../theme/ThemeProvider';

export default function ProfileScreen() {
  const { colors } = useTheme();
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
    displayName: string;
    bio: string;
    birthday: string;
    city: string;
    cityLat: number | null;
    cityLng: number | null;
    address: string;
    addressLat: number | null;
    addressLng: number | null;
    photoURL: string;
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
    displayName: '',
    bio: '',
    birthday: '',
    city: '',
    cityLat: null,
    cityLng: null,
    address: '',
    addressLat: null,
    addressLng: null,
    photoURL: '',
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
      const [code, mems, profileDoc] = await Promise.all([
        getListInviteCode(listId),
        getListMembers(listId),
        getDoc(doc(db, 'users', userId)),
      ]);
      const data = profileDoc.exists() ? profileDoc.data() : {};
      dispatch({
        type: 'patch',
        payload: {
          inviteCode: code,
          members: mems,
          displayName: typeof data.displayName === 'string' ? data.displayName : '',
          bio: typeof data.bio === 'string' ? data.bio : '',
          birthday: typeof data.birthday === 'string' ? data.birthday : '',
          city: typeof data.city === 'string' ? data.city : '',
          cityLat: typeof data.cityLat === 'number' ? data.cityLat : null,
          cityLng: typeof data.cityLng === 'number' ? data.cityLng : null,
          address: typeof data.address === 'string' ? data.address : '',
          addressLat: typeof data.addressLat === 'number' ? data.addressLat : null,
          addressLng: typeof data.addressLng === 'number' ? data.addressLng : null,
          photoURL: typeof data.photoURL === 'string' ? data.photoURL : '',
        },
      });
    } catch {
      // Ignore errors loading list info
    }
    dispatch({ type: 'patch', payload: { loadingProfile: false } });
  }, [listId, skipMode, userId]);

  useEffect(() => {
    loadListInfo();
  }, [loadListInfo]);

  const otherMembers = state.members.filter((m) => m.userId !== userId);
  const isShared = otherMembers.length > 0;
  const location = useUserLocation();

  const [editVisible, setEditVisible] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editBirthday, setEditBirthday] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editCityLat, setEditCityLat] = useState<number | null>(null);
  const [editCityLng, setEditCityLng] = useState<number | null>(null);
  const [editAddress, setEditAddress] = useState('');
  const [editAddressLat, setEditAddressLat] = useState<number | null>(null);
  const [editAddressLng, setEditAddressLng] = useState<number | null>(null);
  const [editAvatarUri, setEditAvatarUri] = useState<string | null>(null);
  const [addressGpsState, setAddressGpsState] = useState<'idle' | 'loading' | 'filled'>('idle');
  const nameRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const birthdayRef = useRef<TextInput>(null);
  const bioRef = useRef<TextInput>(null);

  function openEdit() {
    setEditName(state.displayName || user?.displayName || '');
    setEditBio(state.bio);
    setEditBirthday(state.birthday);
    setEditCity(state.city);
    setEditCityLat(state.cityLat);
    setEditCityLng(state.cityLng);
    setEditAddress(state.address);
    setEditAddressLat(state.addressLat);
    setEditAddressLng(state.addressLng);
    setEditAvatarUri(null);
    setEditVisible(true);
  }

  async function handlePickAvatar() {
    const uri = await pickImage('gallery');
    if (uri) setEditAvatarUri(uri);
  }

  async function handleSaveProfile() {
    if (!userId || skipMode) return;
    setSavingProfile(true);
    try {
      let photoURL = state.photoURL;
      if (editAvatarUri) {
        photoURL = await uploadAvatar(editAvatarUri, userId);
      }
      const payload: Record<string, unknown> = {
        displayName: editName.trim(),
        bio: editBio.trim(),
        birthday: editBirthday.trim(),
        city: editCity.trim(),
        address: editAddress.trim(),
        photoURL,
      };
      if (editCityLat != null && editCityLng != null) {
        payload.cityLat = editCityLat;
        payload.cityLng = editCityLng;
      }
      if (editAddressLat != null && editAddressLng != null) {
        payload.addressLat = editAddressLat;
        payload.addressLng = editAddressLng;
      }
      await setDoc(doc(db, 'users', userId), payload, { merge: true });
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: editName.trim() || undefined,
          photoURL: photoURL || undefined,
        });
      }
      dispatch({
        type: 'patch',
        payload: {
          displayName: editName.trim(),
          bio: editBio.trim(),
          birthday: editBirthday.trim(),
          city: editCity.trim(),
          cityLat: editCityLat,
          cityLng: editCityLng,
          address: editAddress.trim(),
          addressLat: editAddressLat,
          addressLng: editAddressLng,
          photoURL,
        },
      });
      setEditVisible(false);
    } catch (err) {
      Alert.alert('Error', 'No se pudo actualizar el perfil');
    } finally {
      setSavingProfile(false);
    }
  }

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

  async function handleAddressGpsFill() {
    if (!location.latitude || !location.longitude) return;
    setAddressGpsState('loading');
    try {
      const addr = await reverseGeocode(location.latitude, location.longitude);
      if (addr) {
        setEditAddress(addr);
        setEditAddressLat(location.latitude);
        setEditAddressLng(location.longitude);
        setAddressGpsState('filled');
      } else {
        setAddressGpsState('idle');
      }
    } catch {
      setAddressGpsState('idle');
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
        <ActivityIndicator size="large" color={colors['primary']} />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="items-center pt-12 pb-6">
        {/* Avatar */}
        {state.photoURL ? (
          <Image
            source={{ uri: state.photoURL }}
            style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 12 }}
          />
        ) : (
          <View className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-primary/15">
            <Ionicons name="person" size={36} color={colors['primary']} />
          </View>
        )}
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
              {state.displayName || user?.displayName || user?.email?.split('@')[0] || 'Usuario'}
            </Text>
            <Text className="text-sm text-text-tertiary">{user?.email}</Text>
            {(state.city || state.birthday || state.bio) && (
              <View className="mt-2 items-center">
                {state.city ? (
                  <Text className="text-xs text-text-tertiary">{state.city}</Text>
                ) : null}
                {state.birthday ? (
                  <Text className="text-xs text-text-tertiary">Cumple: {state.birthday}</Text>
                ) : null}
                {state.bio ? (
                  <Text className="mt-1 text-center text-xs text-text-secondary">{state.bio}</Text>
                ) : null}
              </View>
            )}
            <Pressable
              className="mt-3 rounded-pill border border-border px-3 py-1.5"
              onPress={openEdit}
            >
              <Text className="text-xs font-medium text-text-secondary">Editar perfil</Text>
            </Pressable>
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
                  <Ionicons name="people" size={14} color={colors['visited']} />
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
                  Lista personal. Comparte con tu pareja o grupo para ver restaurantes juntos.
                </Text>
              </View>
            )}

              <Pressable
                className="mt-3 flex-row items-center justify-center gap-2 rounded-button bg-primary py-3"
                onPress={() => dispatch({ type: 'patch', payload: { shareModalVisible: true } })}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
              >
              <Ionicons name="people-outline" size={16} color={colors['on-primary']} />
              <Text className="text-sm font-semibold text-on-primary">
                {isShared ? 'Gestionar lista compartida' : 'Compartir con pareja o grupo'}
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
            <Ionicons name="alert-circle-outline" size={20} color={colors['warning']} style={{ marginTop: 2 }} />
            <View className="flex-1">
              <Text className="mb-1 text-sm font-medium text-text-primary">
                Modo sin cuenta
              </Text>
              <Text className="mb-3 text-caption text-text-secondary">
                {state.localCount > 0
                  ? `Tienes ${state.localCount} restaurante${state.localCount > 1 ? 's' : ''} guardado${state.localCount > 1 ? 's' : ''} localmente. Crea una cuenta para sincronizar y compartir.`
                  : 'Crea una cuenta para sincronizar entre dispositivos y compartir con tu pareja.'}
              </Text>
              <Pressable
                className="items-center rounded-button bg-primary py-3"
                onPress={() => dispatch({ type: 'patch', payload: { createAccountModalVisible: true } })}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
              >
                <Text className="text-sm font-semibold text-on-primary">
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
            <Ionicons name="log-out-outline" size={18} color={colors['text-secondary']} />
            <Text className="text-sm font-medium text-text-secondary">
              Cerrar sesion
            </Text>
          </Pressable>
        )}
      </View>

      {/* Share modal */}
      <Modal visible={editVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardForm
          containerClassName="flex-1 bg-background"
          scrollClassName="flex-1 px-6 pt-6"
          keyboardVerticalOffset={90}
        >
            <View className="mb-6 flex-row items-center justify-between">
              <Text className="text-title font-display text-text-primary">Editar perfil</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={8}
                className="h-8 w-8 items-center justify-center rounded-full bg-border"
                onPress={() => setEditVisible(false)}
              >
                <Ionicons name="close" size={18} color={colors['text-primary']} />
              </Pressable>
            </View>

            <View className="items-center mb-4">
              <Pressable onPress={handlePickAvatar} className="items-center">
                {editAvatarUri ? (
                  <Image source={{ uri: editAvatarUri }} style={{ width: 84, height: 84, borderRadius: 42 }} />
                ) : state.photoURL ? (
                  <Image source={{ uri: state.photoURL }} style={{ width: 84, height: 84, borderRadius: 42 }} />
                ) : (
                  <View className="h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                    <Ionicons name="person" size={32} color={colors['primary']} />
                  </View>
                )}
                <Text className="mt-2 text-xs text-text-tertiary">
                  {editAvatarUri || state.photoURL ? 'Cambiar foto' : 'Agregar foto'}
                </Text>
              </Pressable>
            </View>

            <TextInput
              ref={nameRef}
              className="rounded-input border border-border bg-surface px-4 py-3 text-text-primary"
              placeholder="Nombre"
              placeholderTextColor={colors['text-tertiary']}
              value={editName}
              onChangeText={setEditName}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => addressRef.current?.focus()}
              style={{ fontSize: 16, minHeight: 48 }}
            />
            <View className="h-3" />
            <View className="mb-2">
              <TextInput
                className="rounded-input border border-border bg-surface px-4 py-3 text-text-primary"
                placeholder="Ciudad"
                placeholderTextColor={colors['text-tertiary']}
                value={editCity}
                onChangeText={(text) => {
                  setEditCity(text);
                  setEditCityLat(null);
                  setEditCityLng(null);
                }}
                autoCapitalize="words"
                style={{ fontSize: 16, minHeight: 48 }}
              />
              <Pressable
                className="mt-2 flex-row items-center gap-2"
                onPress={() => {
                  if (location.city && location.latitude && location.longitude) {
                    setEditCity(location.city);
                    setEditCityLat(location.latitude);
                    setEditCityLng(location.longitude);
                  }
                }}
              >
                <Ionicons name="locate" size={14} color={colors['text-secondary']} />
                <Text className="text-xs text-text-tertiary">Usar ubicacion actual</Text>
              </Pressable>
            </View>
            <View className="h-3" />
            <View style={{ position: 'relative' }}>
            <TextInput
              ref={addressRef}
              className="rounded-input border border-border bg-surface px-4 py-3 text-text-primary"
              placeholder="Direccion"
              placeholderTextColor={colors['text-tertiary']}
              value={editAddress}
              onChangeText={(text) => {
                setEditAddress(text);
                setEditAddressLat(null);
                setEditAddressLng(null);
                if (addressGpsState === 'filled') setAddressGpsState('idle');
              }}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => birthdayRef.current?.focus()}
              style={{ fontSize: 16, minHeight: 48, textAlignVertical: 'center', paddingRight: 48 }}
            />
              <Pressable
                onPress={handleAddressGpsFill}
                disabled={addressGpsState === 'loading' || !location.latitude}
                hitSlop={8}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  borderWidth: addressGpsState === 'filled' ? 0 : 1.5,
                  borderColor: colors['text-tertiary'],
                  backgroundColor: addressGpsState === 'filled' ? colors['visited'] : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                accessibilityRole="button"
                accessibilityLabel="Rellenar direccion con GPS"
              >
                {addressGpsState === 'loading' ? (
                  <ActivityIndicator size={14} color={colors['text-secondary']} />
                ) : (
                  <Ionicons
                    name="locate"
                    size={16}
                    color={addressGpsState === 'filled' ? colors['on-visited'] : colors['text-secondary']}
                  />
                )}
              </Pressable>
            </View>
            <View className="h-3" />
            <TextInput
              ref={birthdayRef}
              className="rounded-input border border-border bg-surface px-4 py-3 text-text-primary"
              placeholder="Cumpleaños (DD/MM/AAAA)"
              placeholderTextColor={colors['text-tertiary']}
              value={editBirthday}
              onChangeText={setEditBirthday}
              keyboardType="numbers-and-punctuation"
              returnKeyType="next"
              onSubmitEditing={() => bioRef.current?.focus()}
              style={{ fontSize: 16, minHeight: 48 }}
            />
            <View className="h-3" />
            <TextInput
              ref={bioRef}
              className="rounded-input border border-border bg-surface px-4 py-3 text-text-primary"
              placeholder="Bio (opcional)"
              placeholderTextColor={colors['text-tertiary']}
              value={editBio}
              onChangeText={setEditBio}
              multiline
              maxLength={180}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={handleSaveProfile}
              style={{ fontSize: 16, minHeight: 90, textAlignVertical: 'top' }}
            />

            <Pressable
              className={`mt-6 items-center rounded-button py-4 ${savingProfile ? 'bg-border' : 'bg-primary'}`}
              onPress={handleSaveProfile}
              disabled={savingProfile}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              {savingProfile ? (
                <ActivityIndicator color={colors['text-secondary']} />
              ) : (
                <Text className="text-body font-semibold text-on-primary">Guardar cambios</Text>
              )}
            </Pressable>
        </KeyboardForm>
      </Modal>

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
