// Acceptance: features/tema-activo.feature (UI-04 y UI-07 del plan E2E). ThemeProvider real; esquema de color simulado.
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
  test('Con el teléfono en oscuro, la app entrega los colores claros', ({ given, when, then, and }) => {
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
    then('las variables del tema llevan los colores del tema claro', () => {
      const entregadas = raiz.toJSON().props.style[1].entregadas;
      // Los canales RGB de cada color: "184 74 51" es el terracota claro, "227 116 90" el oscuro.
      expect(entregadas['--color-primary']).toBe('184 74 51');
      expect(entregadas['--color-background']).toBe('248 241 234');
      expect(JSON.stringify(entregadas)).not.toContain('227 116 90');
    });
    and('quien necesite un color suelto lo recibe del mismo tema', () => {
      expect(visto!.scheme).toBe('light');
      expect(visto!.colors.primary).toBe(palette.light.primary);
      expect(visto!.colors.background).toBe(palette.light.background);
    });
  });

  test('La app se declara siempre en claro', ({ given, when, then }) => {
    let configuracion: any;
    given('la configuración de la app Bite', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      configuracion = require('../../app.config.js').default({ config: {} });
    });
    let estilo: string;
    when('se lee cómo elige entre tema claro y oscuro', () => {
      estilo = configuracion.userInterfaceStyle;
    });
    then('usa siempre el tema claro', () => {
      expect(estilo).toBe('light');
    });
  });
});
