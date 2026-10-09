// Acceptance: features/busqueda-de-lugares.feature (ADD-03 del plan E2E). SaveScreen real; el buscador de Google se simula
// y se le provoca el fallo. Proyecto Jest "components". La clave de Google se lee al cargar el modulo, por eso cada
// escenario recarga SaveScreen (isolateModules) antes de montarla.
import { defineFeature, loadFeature } from 'jest-cucumber';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: require('react-native').View,
}));
jest.mock('expo-location', () => ({}));
jest.mock('expo-constants', () => ({ expoConfig: { extra: { GOOGLE_MAPS_API_KEY: 'clave-de-prueba' } } }));
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), getDoc: jest.fn() }));
jest.mock('../config/firebase', () => ({ db: {} }));
jest.mock('../hooks/useAuth', () => ({ useAuth: () => ({ userId: 'ana', listId: 'L1', skipMode: false }) }));
jest.mock('../hooks/useLocation', () => ({
  useLocation: () => ({ latitude: null, longitude: null, loading: false, error: null, refresh: jest.fn() }),
}));
jest.mock('../services/locationService', () => ({ reverseGeocode: jest.fn() }));
jest.mock('../services/shareService', () => ({ resolveSharedText: jest.fn() }));
jest.mock('../services/restaurantService', () => ({ saveRestaurant: jest.fn() }));
jest.mock('../services/localStorageService', () => ({
  saveLocalRestaurant: jest.fn(),
  updateLocalRestaurant: jest.fn(),
  getLocalRestaurants: jest.fn(async () => []),
}));
jest.mock('../components/PhotoPicker', () => () => null);
jest.mock('../components/PriceSlider', () => () => null);

// Buscador de Google simulado: un campo de texto que guarda sus props para poder provocar onFail.
let propsBuscador: any = null;
jest.mock('react-native-google-places-autocomplete', () => {
  const React = require('react');
  const { TextInput } = require('react-native');
  return {
    GooglePlacesAutocomplete: React.forwardRef((props: any, _ref: unknown) => {
      propsBuscador = props;
      return <TextInput testID="buscador-google" {...props.textInputProps} placeholder={props.placeholder} />;
    }),
  };
});

jest.setTimeout(30000);

const feature = loadFeature('features/busqueda-de-lugares.feature');

const lib = require('@testing-library/react-native') as typeof import('@testing-library/react-native');
const React = require('react');

// Solo se recarga SaveScreen (su clave de Google se fija al cargar); React y el renderer son los de arriba.
function abrirGuardar(claveDeGoogle: string) {
  let Pantalla: any;
  jest.isolateModules(() => {
    jest.doMock('react', () => React);
    jest.doMock('expo-constants', () => ({ expoConfig: { extra: { GOOGLE_MAPS_API_KEY: claveDeGoogle } } }));
    Pantalla = require('../screens/SaveScreen').default;
  });
  return { lib, pantalla: lib.render(React.createElement(Pantalla)) };
}

const NOMBRE_MANUAL = 'Nombre del restaurante';
const DIRECCION = 'Direccion del restaurante';
const AVISO = 'Ahora no podemos buscar sitios. Escribe el nombre y marca dónde está.';

defineFeature(feature, (test) => {
  let sesion: ReturnType<typeof abrirGuardar>;
  beforeEach(() => {
    propsBuscador = null;
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  const conClave = (given: (re: string, fn: () => void) => void) =>
    given('que Bite tiene la clave de Google configurada', () => {});
  const abierta = (step: (re: string, fn: () => void) => void) =>
    step('que Ana ha abierto la pantalla de guardar un restaurante', () => {
      sesion = abrirGuardar('clave-de-prueba');
    });
  const googleFalla = (step: (re: string, fn: () => void) => void) =>
    step('Google no responde por falta de red o de cuota', () => {
      sesion.lib.act(() => propsBuscador.onFail('OVER_QUERY_LIMIT'));
    });

  test('Con el buscador disponible se busca en Google', ({ given, when, then, and }) => {
    conClave(given);
    when('Ana abre la pantalla de guardar un restaurante', () => {
      sesion = abrirGuardar('clave-de-prueba');
    });
    then('Ana busca el restaurante con el buscador de Google', () => {
      expect(sesion.pantalla.getByTestId('buscador-google')).toBeTruthy();
    });
    and('no se le pide escribir el nombre a mano', () => {
      expect(sesion.pantalla.queryByPlaceholderText(NOMBRE_MANUAL)).toBeNull();
    });
  });

  test('Si Google falla, Bite pasa a escribir a mano y lo explica', ({ given, when, then, and }) => {
    conClave(given);
    abierta(and);
    googleFalla(when);
    then('Ana puede escribir el nombre del restaurante a mano', () => {
      expect(sesion.pantalla.getByPlaceholderText(NOMBRE_MANUAL)).toBeTruthy();
      expect(sesion.pantalla.queryByTestId('buscador-google')).toBeNull();
    });
    and('ve el aviso "Ahora no podemos buscar sitios. Escribe el nombre y marca dónde está."', () => {
      expect(sesion.pantalla.getByText(AVISO)).toBeTruthy();
      expect(sesion.pantalla.queryByText(/API|clave/i)).toBeNull();
    });
  });

  test('Lo que Ana ya había escrito no se pierde al pasar a mano', ({ given, when, then, and }) => {
    conClave(given);
    abierta(and);
    and('que Ana ha escrito "Casa Lu" en el buscador', () => {
      sesion.lib.act(() => propsBuscador.textInputProps.onChangeText('Casa Lu'));
    });
    googleFalla(when);
    then('el nombre a mano ya dice "Casa Lu"', () => {
      expect(sesion.pantalla.getByPlaceholderText(NOMBRE_MANUAL).props.value).toBe('Casa Lu');
    });
  });

  test('Si Google falla mientras Ana escribe, el resto del formulario sigue a la vista', ({ given, when, then, and }) => {
    conClave(given);
    abierta(and);
    and('que Ana está escribiendo en el buscador', () => {
      sesion.lib.act(() => propsBuscador.textInputProps.onFocus());
      // Mientras se busca, la pantalla esconde el resto del formulario para dejar sitio a las sugerencias.
      expect(sesion.pantalla.queryByPlaceholderText(DIRECCION)).toBeNull();
    });
    googleFalla(when);
    then('Ana ve el campo de la dirección', () => {
      expect(sesion.pantalla.getByPlaceholderText(DIRECCION)).toBeTruthy();
    });
  });

  test('Sin clave de Google se escribe a mano desde el principio', ({ given, when, then }) => {
    given('que Bite no tiene clave de Google', () => {});
    when('Ana abre la pantalla de guardar un restaurante', () => {
      sesion = abrirGuardar('');
    });
    then('Ana puede escribir el nombre del restaurante a mano', () => {
      expect(sesion.pantalla.getByPlaceholderText(NOMBRE_MANUAL)).toBeTruthy();
      expect(sesion.pantalla.queryByTestId('buscador-google')).toBeNull();
    });
  });
});
