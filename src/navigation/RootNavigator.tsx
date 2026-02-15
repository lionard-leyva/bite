import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import TabNavigator from './TabNavigator';
import AuthScreen from '../screens/AuthScreen';
import SaveScreen from '../screens/SaveScreen';
import DetailScreen from '../screens/DetailScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function LoadingScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' }}>
      <ActivityIndicator size="large" color="#FF5A5F" />
    </View>
  );
}

export default function RootNavigator() {
  const { user, skipMode, isLoading, pendingMigration, migrateLocalData, dismissMigration } = useAuth();
  const migrationShown = useRef(false);

  useEffect(() => {
    if (pendingMigration && !migrationShown.current) {
      migrationShown.current = true;
      Alert.alert(
        'Migrar restaurantes',
        'Tienes restaurantes guardados en este dispositivo. ¿Migrarlos a tu cuenta?',
        [
          {
            text: 'Ahora no',
            style: 'cancel',
            onPress: () => dismissMigration(),
          },
          {
            text: 'Migrar',
            onPress: async () => {
              const count = await migrateLocalData();
              if (count > 0) {
                Alert.alert('Listo', `${count} restaurante${count > 1 ? 's' : ''} migrado${count > 1 ? 's' : ''} a tu cuenta.`);
              }
            },
          },
        ],
      );
    }
    if (!pendingMigration) {
      migrationShown.current = false;
    }
  }, [pendingMigration, migrateLocalData, dismissMigration]);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoading ? (
        <Stack.Screen name="Loading" component={LoadingScreen} />
      ) : user === null && !skipMode ? (
        <Stack.Screen name="Auth" component={AuthScreen} />
      ) : (
        <>
          <Stack.Screen name="Tabs" component={TabNavigator} />
          <Stack.Screen
            name="Save"
            component={SaveScreen}
            options={{
              presentation: 'modal',
              headerShown: true,
              title: 'Guardar restaurante',
              headerStyle: { backgroundColor: '#FAFAFA' },
              headerTintColor: '#222222',
            }}
          />
          <Stack.Screen
            name="Detail"
            component={DetailScreen}
            options={{
              headerShown: true,
              title: '',
              headerStyle: { backgroundColor: '#FAFAFA' },
              headerTintColor: '#222222',
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
