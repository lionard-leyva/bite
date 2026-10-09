import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { View } from 'react-native';
import { vars } from 'nativewind';
import { palette, cssVars, type Colors, type Scheme } from './palette';

interface Theme {
  scheme: Scheme;
  colors: Colors;
}

const LIGHT: Theme = { scheme: 'light', colors: palette.light };
const ThemeContext = createContext<Theme>(LIGHT);

// Bite se ve siempre en claro, como el diseno Terracota elegido (UI-07), aunque el telefono este en oscuro.
// Las clases de Tailwind (bg-background, text-primary...) leen las variables que pone `vars`, y los estilos en linea
// (iconos, sombras) leen el mismo color con useTheme().
export function ThemeProvider({ children }: { children: ReactNode }) {
  const style = useMemo(() => vars(cssVars(palette.light)), []);
  return (
    <ThemeContext.Provider value={LIGHT}>
      <View style={[{ flex: 1 }, style]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
