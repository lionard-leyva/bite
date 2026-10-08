import './global.css';
import { useMemo } from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import AuthProvider from './src/contexts/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';

// Dentro del ThemeProvider: navegacion y barra de estado toman el color del tema activo.
function Shell() {
  const { scheme, colors } = useTheme();
  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors['text-primary'],
        border: colors.border,
      },
    };
  }, [scheme, colors]);

  return (
    <NavigationContainer theme={navigationTheme}>
      <RootNavigator />
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </ThemeProvider>
  );
}
