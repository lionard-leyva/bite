import { useReducer, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAuth } from '../hooks/useAuth';
import { useLocation as useUserLocation } from '../hooks/useLocation';
import { pickImage } from '../services/imageService';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

const MAPS_KEY =
  Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY ??
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
  '';

type Tab = 'login' | 'register';

export default function AuthScreen() {
  const { login, register, skipLogin } = useAuth();

  interface AuthFormState {
    tab: Tab;
    email: string;
    password: string;
    loading: boolean;
    emailError: string;
    passwordError: string;
    showPassword: boolean;
    name: string;
    bio: string;
    birthday: string;
    city: string;
    cityLat: number | null;
    cityLng: number | null;
    inviteCode: string;
  }

  type AuthFormAction =
    | { type: 'patch'; payload: Partial<AuthFormState> }
    | { type: 'reset' };

  const initialState: AuthFormState = {
    tab: 'login',
    email: '',
    password: '',
    loading: false,
    emailError: '',
    passwordError: '',
    showPassword: false,
    name: '',
    bio: '',
    birthday: '',
    city: '',
    cityLat: null,
    cityLng: null,
    inviteCode: '',
  };

  function reducer(state: AuthFormState, action: AuthFormAction): AuthFormState {
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
  const location = useUserLocation();
  const [cityModalVisible, setCityModalVisible] = useState(false);

  function handleEmailChange(text: string) {
    dispatch({ type: 'patch', payload: { email: text, emailError: '' } });
  }

  function handlePasswordChange(text: string) {
    dispatch({ type: 'patch', payload: { password: text, passwordError: '' } });
  }

  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  async function handlePickAvatar() {
    const uri = await pickImage('gallery');
    if (uri) setAvatarUri(uri);
  }

  function validate(): boolean {
    let valid = true;
    const trimmed = state.email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      dispatch({ type: 'patch', payload: { emailError: 'Introduce un email valido' } });
      valid = false;
    }
    if (state.password.length < 6) {
      dispatch({ type: 'patch', payload: { passwordError: 'Al menos 6 caracteres' } });
      valid = false;
    }
    return valid;
  }

  async function handleSubmit() {
    if (!validate()) return;
    dispatch({ type: 'patch', payload: { loading: true } });
    try {
      if (state.tab === 'login') {
        await login(state.email.trim(), state.password);
      } else {
        await register(state.email.trim(), state.password, {
          name: state.name,
          bio: state.bio,
          birthday: state.birthday,
          city: state.city,
          cityLat: state.cityLat,
          cityLng: state.cityLng,
          avatarUri,
          inviteCode: state.inviteCode,
        });
      }
      // Success — keep spinner until onAuthStateChanged finishes setup
      // and this screen unmounts. Don't call setLoading(false) here.
    } catch (e: any) {
      const msg =
        e.code === 'auth/user-not-found' ||
        e.code === 'auth/wrong-password' ||
        e.code === 'auth/invalid-credential'
          ? 'Email o contraseña incorrectos'
          : e.code === 'auth/email-already-in-use'
            ? 'Este email ya esta registrado'
            : e.code === 'auth/invalid-email'
              ? 'Email invalido'
              : e.code === 'auth/too-many-requests'
                ? 'Demasiados intentos. Intenta mas tarde.'
                : e.code === 'auth/user-disabled'
                  ? 'Usuario deshabilitado'
                  : e.code === 'auth/network-request-failed'
                    ? 'Sin conexion. Revisa tu internet.'
                    : e.message ?? 'Error de autenticacion';
      Alert.alert('Error', msg);
      dispatch({ type: 'patch', payload: { loading: false } });
    }
  }

  async function handleSkip() {
    await skipLogin();
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 20}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: 24 }}
        className="px-6"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Brand icon */}
        <View className="items-center mb-3">
          <View className="h-20 w-20 items-center justify-center rounded-3xl bg-primary/10">
            <Ionicons name="restaurant" size={40} color="#FF5A5F" />
          </View>
        </View>

        {/* Header */}
        <Text className="mb-2 text-center font-bold text-text-primary" style={{ fontSize: 36 }}>
          Bite
        </Text>
        <Text className="mb-10 text-center text-body text-text-secondary">
          Guarda tus restaurantes favoritos
        </Text>

        {/* Pill tab switcher */}
        <View className="mb-6 flex-row rounded-pill bg-border p-1">
          <Pressable
            className={`flex-1 items-center rounded-pill py-2.5 ${state.tab === 'login' ? 'bg-text-primary' : ''}`}
            onPress={() => dispatch({ type: 'patch', payload: { tab: 'login' } })}
          >
            <Text
              className={`text-sm font-medium ${state.tab === 'login' ? 'text-white' : 'text-text-secondary'}`}
            >
              Iniciar sesion
            </Text>
          </Pressable>
          <Pressable
            className={`flex-1 items-center rounded-pill py-2.5 ${state.tab === 'register' ? 'bg-text-primary' : ''}`}
            onPress={() => dispatch({ type: 'patch', payload: { tab: 'register' } })}
          >
            <Text
              className={`text-sm font-medium ${state.tab === 'register' ? 'text-white' : 'text-text-secondary'}`}
            >
              Registrarse
            </Text>
          </Pressable>
        </View>

        {/* Form */}
        <TextInput
          className={`rounded-input border bg-surface px-4 py-3 text-text-primary ${state.emailError ? 'border-primary' : 'border-border'}`}
          placeholder="Email"
          placeholderTextColor="#A0A0A0"
          value={state.email}
          onChangeText={handleEmailChange}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          style={{ fontSize: 16, minHeight: 48, lineHeight: 20 }}
        />
        {state.emailError ? (
          <Text className="mt-1 text-caption text-primary">{state.emailError}</Text>
        ) : null}
        <View className="h-3" />
        <View
          className={`flex-row items-center rounded-input border bg-surface ${state.passwordError ? 'border-primary' : 'border-border'}`}
          style={{ minHeight: 48 }}
        >
          <TextInput
            className="flex-1 px-4 py-3 text-text-primary"
            placeholder="Contraseña"
            placeholderTextColor="#A0A0A0"
            value={state.password}
            onChangeText={handlePasswordChange}
            secureTextEntry={!state.showPassword}
            textContentType="password"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
            autoComplete="password"
            style={{ fontSize: 16, lineHeight: 20 }}
          />
          <Pressable
            onPress={() => dispatch({ type: 'patch', payload: { showPassword: !state.showPassword } })}
            hitSlop={8}
            style={{ paddingRight: 14 }}
          >
            <Ionicons
              name={state.showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#A0A0A0"
            />
          </Pressable>
        </View>
        {state.passwordError ? (
          <Text className="mt-1 text-caption text-primary">{state.passwordError}</Text>
        ) : null}
        <View className="h-4" />

        {state.tab === 'register' && (
          <>
            {/* Avatar */}
            <View className="items-center mb-4">
              <Pressable
                onPress={handlePickAvatar}
                className="items-center"
              >
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={{ width: 84, height: 84, borderRadius: 42 }}
                  />
                ) : (
                  <View className="h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                    <Ionicons name="person" size={32} color="#FF5A5F" />
                  </View>
                )}
                <Text className="mt-2 text-xs text-text-tertiary">
                  {avatarUri ? 'Cambiar foto' : 'Agregar foto'}
                </Text>
              </Pressable>
            </View>

            <TextInput
              className="rounded-input border border-border bg-surface px-4 py-3 text-text-primary"
              placeholder="Nombre"
              placeholderTextColor="#A0A0A0"
              value={state.name}
              onChangeText={(text) => dispatch({ type: 'patch', payload: { name: text } })}
              autoCapitalize="words"
              style={{ fontSize: 16, minHeight: 48, lineHeight: 20 }}
            />
            <View className="h-3" />
            {MAPS_KEY ? (
              <View className="mb-2">
                <Pressable
                  onPress={() => setCityModalVisible(true)}
                  className="rounded-input border border-border bg-surface px-4 py-3"
                  style={{ minHeight: 48, justifyContent: 'center' }}
                >
                  <Text className={`text-base ${state.city ? 'text-text-primary' : 'text-text-tertiary'}`}>
                    {state.city || 'Ciudad'}
                  </Text>
                </Pressable>
                <Pressable
                  className="mt-2 flex-row items-center gap-2"
                  onPress={() => {
                    if (location.city && location.latitude && location.longitude) {
                      dispatch({
                        type: 'patch',
                        payload: {
                          city: location.city,
                          cityLat: location.latitude,
                          cityLng: location.longitude,
                        },
                      });
                    }
                  }}
                >
                  <Ionicons name="locate" size={14} color="#9CA3AF" />
                  <Text className="text-xs text-text-tertiary">Usar ubicacion actual</Text>
                </Pressable>
              </View>
            ) : (
              <TextInput
                className="rounded-input border border-border bg-surface px-4 py-3 text-text-primary"
                placeholder="Ciudad"
                placeholderTextColor="#A0A0A0"
                value={state.city}
                onChangeText={(text) =>
                  dispatch({ type: 'patch', payload: { city: text, cityLat: null, cityLng: null } })
                }
                autoCapitalize="words"
                style={{ fontSize: 16, minHeight: 48, lineHeight: 20 }}
              />
            )}
            <View className="h-3" />
            <TextInput
              className="rounded-input border border-border bg-surface px-4 py-3 text-text-primary"
              placeholder="Cumpleaños (DD/MM/AAAA)"
              placeholderTextColor="#A0A0A0"
              value={state.birthday}
              onChangeText={(text) => dispatch({ type: 'patch', payload: { birthday: text } })}
              keyboardType="numbers-and-punctuation"
              style={{ fontSize: 16, minHeight: 48, lineHeight: 20 }}
            />
            <View className="h-3" />
            <TextInput
              className="rounded-input border border-border bg-surface px-4 py-3 text-text-primary"
              placeholder="Bio (opcional)"
              placeholderTextColor="#A0A0A0"
              value={state.bio}
              onChangeText={(text) => dispatch({ type: 'patch', payload: { bio: text } })}
              multiline
              maxLength={180}
              style={{ fontSize: 16, minHeight: 80, textAlignVertical: 'top' }}
            />
            <View className="h-3" />
            <TextInput
              className="rounded-input border border-border bg-surface px-4 py-3 text-text-primary"
              placeholder="Codigo para unirme a pareja o grupo (opcional)"
              placeholderTextColor="#A0A0A0"
              value={state.inviteCode}
              onChangeText={(text) => dispatch({ type: 'patch', payload: { inviteCode: text } })}
              autoCapitalize="characters"
              maxLength={7}
              style={{ fontSize: 16, minHeight: 48, lineHeight: 20 }}
            />
            <View className="h-4" />
          </>
        )}

        {/* Submit */}
        <Pressable
          className={`mb-4 items-center rounded-button py-4 ${state.loading ? 'bg-border' : 'bg-primary'}`}
          onPress={handleSubmit}
          disabled={state.loading}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          {state.loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-body font-semibold text-white">
              {state.tab === 'login' ? 'Iniciar sesion' : 'Crear cuenta'}
            </Text>
          )}
        </Pressable>

        {/* Divider */}
        <View className="mb-4 flex-row items-center">
          <View className="flex-1 border-b border-border" />
          <Text className="mx-3 text-sm text-text-tertiary">o</Text>
          <View className="flex-1 border-b border-border" />
        </View>

        {/* Skip */}
        <Pressable
          className="items-center rounded-button border border-border bg-surface py-4"
          onPress={handleSkip}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <Text className="text-body font-medium text-text-secondary">
            Continuar sin cuenta
          </Text>
        </Pressable>

        <Text className="mt-3 text-center text-caption text-text-tertiary">
          Podras crear cuenta despues para sincronizar y compartir
        </Text>
      </ScrollView>

      <Modal visible={cityModalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          className="flex-1 bg-background"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={90}
        >
          <View className="flex-1 px-6 pt-6">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-title font-bold text-text-primary">Selecciona ciudad</Text>
              <Pressable
                className="h-8 w-8 items-center justify-center rounded-full bg-border"
                onPress={() => setCityModalVisible(false)}
              >
                <Ionicons name="close" size={18} color="#222222" />
              </Pressable>
            </View>

            <GooglePlacesAutocomplete
              placeholder="Ciudad"
              fetchDetails
              onPress={(data, details) => {
                const cityName =
                  details?.address_components?.find((c: any) =>
                    c.types?.includes('locality'),
                  )?.long_name ||
                  details?.address_components?.find((c: any) =>
                    c.types?.includes('administrative_area_level_1'),
                  )?.long_name ||
                  data?.description ||
                  '';
                const cityLat = details?.geometry?.location?.lat ?? null;
                const cityLng = details?.geometry?.location?.lng ?? null;
                dispatch({
                  type: 'patch',
                  payload: { city: cityName, cityLat, cityLng },
                });
                setCityModalVisible(false);
              }}
              query={{
                key: MAPS_KEY,
                language: 'es',
                types: '(cities)',
                components: 'country:es',
                location:
                  location.latitude != null && location.longitude != null
                    ? `${location.latitude},${location.longitude}`
                    : undefined,
                radius: 30000,
                strictbounds: true,
              }}
              nearbyPlacesAPI="GoogleReverseGeocoding"
              currentLocation={false}
              styles={{
                container: { flex: 0 },
                textInput: {
                  borderWidth: 1,
                  borderColor: '#F0EDED',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  minHeight: 48,
                  fontSize: 16,
                  lineHeight: 24,
                  backgroundColor: '#FFFFFF',
                  color: '#2D2D2D',
                  textAlignVertical: 'center',
                },
                listView: {
                  marginTop: 8,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#EFEFEF',
                  overflow: 'hidden',
                },
                row: { paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#FFFFFF' },
                separator: { height: 1, backgroundColor: '#F2F2F2' },
                description: { color: '#1F2937', fontSize: 14 },
                poweredContainer: { display: 'none' },
              }}
              textInputProps={{ placeholderTextColor: '#A0A0A0' }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}
