// Acceptance: features/tema-activo.feature (UI-04 del plan E2E). ThemeProvider real; esquema de color simulado.
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { palette } from '../theme/palette';

let mockScheme: 'light' | 'dark' = 'light';
// vars() guarda las variables en un registro interno de NativeWind: se sustituye por un espia que conserva lo que
// ThemeProvider le entrega, que es lo que esta prueba comprueba.
jest.mock('nativewind', () => ({
  ...jest.requireActual('nativewind'),
  useColorScheme: () => ({ colorScheme: mockScheme }),
  vars: (variables: Record<string, string>) => ({ entregadas: variables }),
}));

import { ThemeProvider, useTheme } from '../theme/ThemeProvider';

const feature = loadFeature('features/tema-activo.feature');

defineFeature(feature, (test) => {
  test('El tema entrega a la app las variables de la paleta activa', ({ given, when, then, and }) => {
    let visto: ReturnType<typeof useTheme> | null = null;
    let raiz: any;

    function Sonda() {
      visto = useTheme();
      return <Text>sonda</Text>;
    }

    given('que el teléfono está en el tema "oscuro"', () => {
      mockScheme = 'dark';
    });
    when('la app monta su tema', () => {
      raiz = render(
        <ThemeProvider>
          <Sonda />
        </ThemeProvider>,
      );
    });
    then('las variables del tema llevan los colores del tema oscuro', () => {
      const entregadas = raiz.toJSON().props.style[1].entregadas;
      // Los canales RGB de cada color: "227 116 90" es el terracota oscuro, "184 74 51" el claro.
      expect(entregadas['--color-primary']).toBe('227 116 90');
      expect(entregadas['--color-background']).toBe('28 21 19');
      expect(JSON.stringify(entregadas)).not.toContain('184 74 51');
    });
    and('quien necesite un color suelto lo recibe del mismo tema', () => {
      expect(visto!.scheme).toBe('dark');
      expect(visto!.colors.primary).toBe(palette.dark.primary);
      expect(visto!.colors.background).toBe(palette.dark.background);
    });
  });
});
