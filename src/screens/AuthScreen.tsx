import { useReducer, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useLocation as useUserLocation } from '../hooks/useLocation';
import { pickImage } from '../services/imageService';
import { reverseGeocode } from '../services/locationService';
import KeyboardForm from '../components/KeyboardForm';

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
    address: string;
    addressLat: number | null;
    addressLng: number | null;
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
    address: '',
    addressLat: null,
    addressLng: null,
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
  const [addressGpsState, setAddressGpsState] = useState<'idle' | 'loading' | 'filled'>('idle');
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const birthdayRef = useRef<TextInput>(null);
  const bioRef = useRef<TextInput>(null);
  const inviteRef = useRef<TextInput>(null);

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

  async function handleAddressGpsFill() {
    if (!location.latitude || !location.longitude) return;
    setAddressGpsState('loading');
    try {
      const addr = await reverseGeocode(location.latitude, location.longitude);
      if (addr) {
        dispatch({
          type: 'patch',
          payload: {
            address: addr,
            addressLat: location.latitude,
            addressLng: location.longitude,
          },
        });
        setAddressGpsState('filled');
      } else {
        setAddressGpsState('idle');
      }
    } catch {
      setAddressGpsState('idle');
    }
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
          address: state.address,
          addressLat: state.addressLat,
          addressLng: state.addressLng,
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
    <>
      <KeyboardForm
        containerClassName="flex-1 bg-background"
        scrollClassName="px-6"
        contentContainerStyle={{ flexGrow: 1, paddingTop: 24, paddingBottom: 32 }}
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
          ref={emailRef}
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
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
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
            ref={passwordRef}
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
            returnKeyType={state.tab === 'login' ? 'done' : 'next'}
            onSubmitEditing={() => {
              if (state.tab === 'login') {
                void handleSubmit();
              } else {
                nameRef.current?.focus();
              }
            }}
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
              ref={nameRef}
              className="rounded-input border border-border bg-surface px-4 py-3 text-text-primary"
              placeholder="Nombre"
              placeholderTextColor="#A0A0A0"
              value={state.name}
              onChangeText={(text) => dispatch({ type: 'patch', payload: { name: text } })}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => addressRef.current?.focus()}
              style={{ fontSize: 16, minHeight: 48, lineHeight: 20 }}
            />
            <View className="h-3" />
            <View style={{ position: 'relative' }}>
              <TextInput
                ref={addressRef}
                className="rounded-input border border-border bg-surface px-4 py-3 text-text-primary"
                placeholder="Direccion"
                placeholderTextColor="#A0A0A0"
                value={state.address}
                onChangeText={(text) => {
                  dispatch({ type: 'patch', payload: { address: text, addressLat: null, addressLng: null } });
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
                  borderColor: '#D1D5DB',
                  backgroundColor: addressGpsState === 'filled' ? '#00A699' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                accessibilityRole="button"
                accessibilityLabel="Rellenar direccion con GPS"
              >
                {addressGpsState === 'loading' ? (
                  <ActivityIndicator size={14} color="#6B7280" />
                ) : (
                  <Ionicons
                    name="locate"
                    size={16}
                    color={addressGpsState === 'filled' ? '#FFFFFF' : '#9CA3AF'}
                  />
                )}
              </Pressable>
            </View>
            <View className="h-3" />
            <TextInput
              ref={birthdayRef}
              className="rounded-input border border-border bg-surface px-4 py-3 text-text-primary"
              placeholder="Cumpleaños (DD/MM/AAAA)"
              placeholderTextColor="#A0A0A0"
              value={state.birthday}
              onChangeText={(text) => dispatch({ type: 'patch', payload: { birthday: text } })}
              keyboardType="numbers-and-punctuation"
              returnKeyType="next"
              onSubmitEditing={() => bioRef.current?.focus()}
              style={{ fontSize: 16, minHeight: 48, lineHeight: 20 }}
            />
            <View className="h-3" />
            <TextInput
              ref={bioRef}
              className="rounded-input border border-border bg-surface px-4 py-3 text-text-primary"
              placeholder="Bio (opcional)"
              placeholderTextColor="#A0A0A0"
              value={state.bio}
              onChangeText={(text) => dispatch({ type: 'patch', payload: { bio: text } })}
              multiline
              maxLength={180}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => inviteRef.current?.focus()}
              style={{ fontSize: 16, minHeight: 80, textAlignVertical: 'top' }}
            />
            <View className="h-3" />
            <TextInput
              ref={inviteRef}
              className="rounded-input border border-border bg-surface px-4 py-3 text-text-primary"
              placeholder="Codigo para unirme a pareja o grupo (opcional)"
              placeholderTextColor="#A0A0A0"
              value={state.inviteCode}
              onChangeText={(text) => dispatch({ type: 'patch', payload: { inviteCode: text } })}
              autoCapitalize="characters"
              maxLength={7}
              returnKeyType="done"
              onSubmitEditing={() => void handleSubmit()}
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
      </KeyboardForm>

    </>
  );
}
