import { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';

type Tab = 'login' | 'register';

export default function AuthScreen() {
  const { login, register, skipLogin } = useAuth();

  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  function handleEmailChange(text: string) {
    setEmail(text);
    if (emailError) setEmailError('');
  }

  function handlePasswordChange(text: string) {
    setPassword(text);
    if (passwordError) setPasswordError('');
  }

  function validate(): boolean {
    let valid = true;
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setEmailError('Introduce un email valido');
      valid = false;
    }
    if (password.length < 6) {
      setPasswordError('Al menos 6 caracteres');
      valid = false;
    }
    return valid;
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
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        className="px-6"
        keyboardShouldPersistTaps="handled"
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
            className={`flex-1 items-center rounded-pill py-2.5 ${tab === 'login' ? 'bg-text-primary' : ''}`}
            onPress={() => setTab('login')}
          >
            <Text
              className={`text-sm font-medium ${tab === 'login' ? 'text-white' : 'text-text-secondary'}`}
            >
              Iniciar sesion
            </Text>
          </Pressable>
          <Pressable
            className={`flex-1 items-center rounded-pill py-2.5 ${tab === 'register' ? 'bg-text-primary' : ''}`}
            onPress={() => setTab('register')}
          >
            <Text
              className={`text-sm font-medium ${tab === 'register' ? 'text-white' : 'text-text-secondary'}`}
            >
              Registrarse
            </Text>
          </Pressable>
        </View>

        {/* Form */}
        <TextInput
          className={`rounded-input border bg-surface px-4 py-3 text-body text-text-primary ${emailError ? 'border-primary' : 'border-border'}`}
          placeholder="Email"
          placeholderTextColor="#A0A0A0"
          value={email}
          onChangeText={handleEmailChange}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          style={{ minHeight: 48, textAlignVertical: 'center' }}
        />
        {emailError ? (
          <Text className="mt-1 text-caption text-primary">{emailError}</Text>
        ) : null}
        <View className="h-3" />
        <TextInput
          className={`rounded-input border bg-surface px-4 py-3 text-body text-text-primary ${passwordError ? 'border-primary' : 'border-border'}`}
          placeholder="Contraseña"
          placeholderTextColor="#A0A0A0"
          value={password}
          onChangeText={handlePasswordChange}
          secureTextEntry
          textContentType="password"
          style={{ minHeight: 48, textAlignVertical: 'center' }}
        />
        {passwordError ? (
          <Text className="mt-1 text-caption text-primary">{passwordError}</Text>
        ) : null}
        <View className="h-4" />

        {/* Submit */}
        <Pressable
          className={`mb-4 items-center rounded-button py-4 ${loading ? 'bg-border' : 'bg-primary'}`}
          onPress={handleSubmit}
          disabled={loading}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-body font-semibold text-white">
              {tab === 'login' ? 'Iniciar sesion' : 'Crear cuenta'}
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
    </KeyboardAvoidingView>
  );
}
