import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { View } from 'react-native';
import { useColorScheme, vars } from 'nativewind';
import { palette, cssVars, type Colors, type Scheme } from './palette';

interface Theme {
  scheme: Scheme;
  colors: Colors;
}

const ThemeContext = createContext<Theme>({ scheme: 'light', colors: palette.light });

// Monta el tema una vez: las clases de Tailwind (bg-background, text-primary...) leen las variables que pone `vars`,
// y los estilos en linea (iconos, sombras) leen el mismo color con useTheme().
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { colorScheme } = useColorScheme();
  const scheme: Scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const theme = useMemo<Theme>(() => ({ scheme, colors: palette[scheme] }), [scheme]);
  const style = useMemo(() => vars(cssVars(palette[scheme])), [scheme]);
  return (
    <ThemeContext.Provider value={theme}>
      <View style={[{ flex: 1 }, style]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
