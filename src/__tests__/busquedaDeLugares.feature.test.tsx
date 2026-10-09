// Acceptance: features/busqueda-de-lugares.feature (ADD-03 del plan E2E). SaveScreen real; el buscador de sitios
// (placesService) se simula fallando, igual que sin red o sin cuota. Proyecto Jest "components".
import { defineFeature, loadFeature } from 'jest-cucumber';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: require('react-native').View,
}));
jest.mock('expo-location', () => ({}));
jest.mock('expo-constants', () => ({ expoConfig: { extra: {} } }));
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), getDoc: jest.fn() }));
jest.mock('../config/firebase', () => ({ db: {}, auth: { currentUser: null } }));
jest.mock('../hooks/useAuth', () => ({ useAuth: () => ({ userId: 'ana', listId: 'L1', skipMode: false }) }));
let mockUbicacion: { latitude: number | null; longitude: number | null } = { latitude: null, longitude: null };
jest.mock('../hooks/useLocation', () => ({
  useLocation: () => ({ ...mockUbicacion, loading: false, error: null, refresh: async () => null }),
}));
jest.mock('../services/locationService', () => ({ reverseGeocode: jest.fn(async () => null) }));
jest.mock('../services/shareService', () => ({ resolveSharedText: jest.fn() }));
const mockSave = jest.fn(async (_r: any) => 'nuevo');
jest.mock('../services/restaurantService', () => ({ saveRestaurant: (r: any) => mockSave(r) }));
jest.mock('../services/localStorageService', () => ({
  saveLocalRestaurant: jest.fn(),
  updateLocalRestaurant: jest.fn(),
  getLocalRestaurants: jest.fn(async () => []),
}));
jest.mock('../components/PhotoPicker', () => () => null);
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => <View testID="mini-mapa" {...props} />,
    Marker: (props: any) => <View testID="pin-del-sitio" {...props} />,
  };
});
const mockSearchPlaces = jest.fn(async (..._a: unknown[]): Promise<unknown[]> => {
  throw new Error('places/autocomplete 503');
});
jest.mock('../services/placesService', () => ({
  searchPlaces: (...a: unknown[]) => mockSearchPlaces(...a),
  searchAddresses: async () => {
    throw new Error('places/autocomplete 503');
  },
  placeDetails: jest.fn(),
  newSessionToken: () => 's',
}));

jest.setTimeout(30000);

import SaveScreen from '../screens/SaveScreen';

const feature = loadFeature('features/busqueda-de-lugares.feature');
const MADRID = { latitude: 40.4168, longitude: -3.7038 };
const NOMBRE = 'Nombre del restaurante';

defineFeature(feature, (test) => {
  let p: ReturnType<typeof render>;
  beforeEach(() => {
    mockSave.mockClear();
    mockSearchPlaces.mockClear();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  const enMadrid = (given: any) =>
    given('que Ana está en Madrid y abre la pantalla de guardar un restaurante', () => {
      mockUbicacion = MADRID;
      p = render(<SaveScreen />);
    });
  const buscadorCaido = (when: any) =>
    when(/^escribe "(.*)" y el buscador de sitios no responde$/, async (texto: string) => {
      fireEvent.changeText(p.getByPlaceholderText(NOMBRE), texto);
      await waitFor(() => expect(mockSearchPlaces).toHaveBeenCalled());
      await act(async () => {});
    });
  const valora = (and: any) =>
    and('lo valora con 4 estrellas', () => fireEvent.press(p.getByLabelText('4 estrellas')));

  test('Si el buscador no responde, Bite pasa a escribir a mano y lo explica', ({ given, when, then, and }) => {
    enMadrid(given);
    buscadorCaido(when);
    then(/^ve el aviso "(.*)"$/, async (aviso: string) => {
      expect(await p.findByText(aviso)).toBeTruthy();
      expect(p.queryByText(/API|clave|503/i)).toBeNull();
    });
    and(/^el nombre a mano ya dice "(.*)"$/, (texto: string) => {
      expect(p.getByPlaceholderText(NOMBRE).props.value).toBe(texto);
      expect(p.getByPlaceholderText('Direccion del restaurante')).toBeTruthy();
    });
  });

  test('Sin buscador, el pin empieza donde está Ana y se puede guardar ahí', ({ given, when, then, and }) => {
    enMadrid(given);
    buscadorCaido(when);
    valora(and);
    then('ve el pin donde está ella', async () => {
      await waitFor(() => expect(p.getByTestId('pin-del-sitio').props.coordinate).toEqual(MADRID));
      expect(p.getByTestId('pin-del-sitio').props.draggable).toBe(true);
    });
    and(/^al guardar, se guarda "(.*)" donde está Ana$/, async (nombre: string) => {
      fireEvent.press(p.getByText('Guardar'));
      await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
      expect(mockSave.mock.calls[0][0]).toMatchObject({ name: nombre, ...MADRID });
    });
  });

  test('Sin buscador ni ubicación de Ana, hay que marcar dónde está', ({ given, when, then, and }) => {
    given('que Ana no comparte su ubicación y abre la pantalla de guardar un restaurante', () => {
      mockUbicacion = { latitude: null, longitude: null };
      p = render(<SaveScreen />);
    });
    buscadorCaido(when);
    valora(and);
    then(/^no puede guardar y ve "(.*)"$/, async (aviso: string) => {
      expect(await p.findByText(aviso)).toBeTruthy();
      fireEvent.press(p.getByText('Guardar'));
      await act(async () => {});
      expect(mockSave).not.toHaveBeenCalled();
      expect(p.queryByTestId('pin-del-sitio')).toBeNull();
    });
  });
});
