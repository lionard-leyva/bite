import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';

type Tab = 'login' | 'register';

export default function AuthScreen() {
  const { login, register, skipLogin } = useAuth();

  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert('Email', 'Introduce un email valido');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Password', 'La contraseña debe tener al menos 6 caracteres');
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password);
      }
    } catch (e: any) {
      const msg =
        e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password'
          ? 'Email o contraseña incorrectos'
          : e.code === 'auth/email-already-in-use'
            ? 'Este email ya esta registrado'
            : e.message ?? 'Error de autenticacion';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleSkip() {
    await skipLogin();
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-1 justify-center px-6">
        {/* Header */}
        <Text className="mb-2 text-center text-3xl font-bold text-gray-900">
          Bite
        </Text>
        <Text className="mb-8 text-center text-base text-gray-500">
          Guarda tus restaurantes favoritos
        </Text>

        {/* Tabs */}
        <View className="mb-6 flex-row rounded-lg bg-gray-100 p-1">
          <Pressable
            className={`flex-1 items-center rounded-md py-2 ${tab === 'login' ? 'bg-white shadow-sm' : ''}`}
            onPress={() => setTab('login')}
          >
            <Text
              className={`text-sm font-medium ${tab === 'login' ? 'text-gray-900' : 'text-gray-500'}`}
            >
              Iniciar sesion
            </Text>
          </Pressable>
          <Pressable
            className={`flex-1 items-center rounded-md py-2 ${tab === 'register' ? 'bg-white shadow-sm' : ''}`}
            onPress={() => setTab('register')}
          >
            <Text
              className={`text-sm font-medium ${tab === 'register' ? 'text-gray-900' : 'text-gray-500'}`}
            >
              Registrarse
            </Text>
          </Pressable>
        </View>

        {/* Form */}
        <TextInput
          className="mb-3 rounded-lg border border-gray-300 px-4 py-3 text-base"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextInput
          className="mb-4 rounded-lg border border-gray-300 px-4 py-3 text-base"
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
        />

        {/* Submit */}
        <Pressable
          className={`mb-4 items-center rounded-xl py-4 ${loading ? 'bg-gray-300' : 'bg-red-500'}`}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-base font-semibold text-white">
              {tab === 'login' ? 'Iniciar sesion' : 'Crear cuenta'}
            </Text>
          )}
        </Pressable>

        {/* Divider */}
        <View className="mb-4 flex-row items-center">
          <View className="flex-1 border-b border-gray-200" />
          <Text className="mx-3 text-sm text-gray-400">o</Text>
          <View className="flex-1 border-b border-gray-200" />
        </View>

        {/* Skip */}
        <Pressable
          className="items-center rounded-xl border border-gray-300 py-4"
          onPress={handleSkip}
        >
          <Text className="text-base font-medium text-gray-600">
            Continuar sin cuenta
          </Text>
        </Pressable>

        <Text className="mt-3 text-center text-xs text-gray-400">
          Podras crear cuenta despues para sincronizar y compartir
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
