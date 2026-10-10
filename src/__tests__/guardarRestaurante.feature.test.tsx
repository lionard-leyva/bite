// Acceptance: features/guardar-restaurante.feature (ADD-05..ADD-11 del plan E2E). SaveScreen real; se simulan el
// buscador de sitios (placesService), el mapa, la ubicacion de Ana (Madrid) y el guardado. Proyecto Jest "components".
import fs from 'fs';
import path from 'path';
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
const mockGeocode = jest.fn(async () => [{ latitude: 35.6, longitude: 139.7 }]);
jest.mock('expo-location', () => ({ geocodeAsync: (...a: unknown[]) => mockGeocode(...(a as [])) }));
jest.mock('expo-constants', () => ({ expoConfig: { extra: {} } }));
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), getDoc: jest.fn() }));
jest.mock('../config/firebase', () => ({ db: {}, auth: { currentUser: null } }));
jest.mock('../hooks/useAuth', () => ({ useAuth: () => ({ userId: 'ana', listId: 'L1', skipMode: false }) }));
// Ana en Chamberi (no en Sol, el centro por defecto) y el GPS, al pedirlo de nuevo, la situa unos metros mas alla.
const mockMadrid = { latitude: 40.4334, longitude: -3.7038 };
const mockGpsAhora = { latitude: 40.4339, longitude: -3.7031 };
let mockSinUbicacion = false;
jest.mock('../hooks/useLocation', () => ({
  useLocation: () =>
    mockSinUbicacion
      ? { latitude: null, longitude: null, loading: false, error: 'x', refresh: async () => null }
      : { ...mockMadrid, loading: false, error: null, refresh: async () => mockGpsAhora },
}));
const mockReverse = jest.fn(async (_lat: number, _lng: number): Promise<string | null> => null);
jest.mock('../services/locationService', () => ({ reverseGeocode: (lat: number, lng: number) => mockReverse(lat, lng) }));
jest.mock('../services/shareService', () => ({ resolveSharedText: jest.fn() }));
const mockSave = jest.fn(async (_r: any) => 'nuevo');
jest.mock('../services/restaurantService', () => ({ saveRestaurant: (r: any) => mockSave(r) }));
jest.mock('../services/localStorageService', () => ({
  saveLocalRestaurant: jest.fn(),
  updateLocalRestaurant: jest.fn(),
  getLocalRestaurants: jest.fn(async () => []),
}));
jest.mock('../components/PhotoPicker', () => () => null);

// Mapa simulado: la vista y el pin guardan sus props para poder arrastrar el pin.
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MapView = (props: any) => <View testID="mini-mapa" {...props} />;
  const Marker = (props: any) => <View testID="pin-del-sitio" {...props} />;
  return { __esModule: true, default: MapView, Marker };
});

const HORIZONTES = { id: 'p-horizontes', name: 'Los Horizontes', secondary: 'Av. de Felipe II 12, Madrid', distanceMeters: 1200 };
const TOKIO = { id: 'p-tokio', name: 'Sushi Shibuya', secondary: 'Shibuya, Tokio', distanceMeters: 10765000 };
const DETALLES: Record<string, any> = {
  'p-horizontes': { name: 'Los Horizontes', address: 'Av. de Felipe II 12, Madrid', city: 'Madrid', latitude: 40.4297, longitude: -3.6745 },
  'p-tokio': { name: 'Sushi Shibuya', address: 'Shibuya, Tokio', city: 'Tokio', latitude: 35.6595, longitude: 139.7005 },
  'd-felipe': { name: 'Av. de Felipe II 12', address: 'Av. de Felipe II 12, 28009 Madrid', city: 'Madrid', latitude: 40.4241, longitude: -3.6727 },
};
const mockSearchPlaces = jest.fn(async (q: string, _near?: unknown, _s?: string) =>
  /tokio|sushi/i.test(q) ? [TOKIO] : [HORIZONTES],
);
const mockSearchAddresses = jest.fn(async (_q: string, _near?: unknown, _s?: string) => [
  { id: 'd-felipe', name: 'Av. de Felipe II 12', secondary: '28009 Madrid' },
]);
const mockDetails = jest.fn(async (id: string, _s?: string) => DETALLES[id]);
jest.mock('../services/placesService', () => ({
  searchPlaces: (q: string, n: unknown, s: string) => mockSearchPlaces(q, n, s),
  searchAddresses: (q: string, n: unknown, s: string) => mockSearchAddresses(q, n, s),
  placeDetails: (id: string, s: string) => mockDetails(id, s),
  newSessionToken: () => 'sesion-1',
}));

jest.setTimeout(30000);
const MADRID = mockMadrid;

import SaveScreen from '../screens/SaveScreen';

const feature = loadFeature('features/guardar-restaurante.feature');
const BUSCADOR = 'Nombre del restaurante';
const DIRECCION = 'Direccion del restaurante';
const A_MANO = '¿No aparece? Añádelo a mano';

const esperar = (ms: number) => act(() => new Promise<void>((r) => setTimeout(r, ms)));

defineFeature(feature, (test) => {
  let p: ReturnType<typeof render>;
  beforeEach(() => {
    mockSave.mockClear();
    mockSearchPlaces.mockClear();
    mockSearchAddresses.mockClear();
    mockDetails.mockClear();
    mockGeocode.mockClear();
    mockReverse.mockReset();
    mockReverse.mockImplementation(async () => null);
    mockSinUbicacion = false;
  });

  const abre = (given: any) =>
    given('que Ana está en Madrid y abre la pantalla de guardar un restaurante', () => {
      p = render(<SaveScreen />);
    });
  const busca = async (texto: string) => {
    fireEvent.changeText(p.getByPlaceholderText(BUSCADOR), texto);
    await waitFor(() => expect(mockSearchPlaces).toHaveBeenCalled());
  };
  const elige = async (nombre: string) => {
    fireEvent.press(await p.findByText(nombre));
    await waitFor(() => expect(mockDetails).toHaveBeenCalled());
  };
  const estrellas = (n: number) => fireEvent.press(p.getByLabelText(`${n} estrellas`));
  const guardar = () => fireEvent.press(p.getByText('Guardar'));
  const aMano = (nombre: string) => {
    fireEvent.press(p.getByText(A_MANO));
    fireEvent.changeText(p.getByPlaceholderText(BUSCADOR), nombre);
    estrellas(4);
  };
  const guardado = async () => {
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    return mockSave.mock.calls[0][0];
  };
  const eligeHorizontes = (and: any) =>
    and(/^ha elegido "Los Horizontes" y lo ha valorado con 4 estrellas$/, async () => {
      await busca('Los horiz');
      await elige('Los Horizontes');
      estrellas(4);
    });
  const eligeTokio = (and: any) =>
    and('elige un sitio de Tokio en el buscador y lo valora con 4 estrellas', async () => {
      await busca('Sushi tokio');
      await elige('Sushi Shibuya');
      estrellas(4);
    });
  const aManoConNombre = (and: any) =>
    and(/^elige añadirlo a mano con el nombre "(.*)" y 4 estrellas$/, (nombre: string) => aMano(nombre));

  test('Con menos de 3 letras no se busca', ({ given, when, then }) => {
    abre(given);
    when(/^escribe "(.*)" en el buscador$/, (t: string) => {
      fireEvent.changeText(p.getByPlaceholderText(BUSCADOR), t);
    });
    then('no se busca ningún sitio', async () => {
      await esperar(600);
      expect(mockSearchPlaces).not.toHaveBeenCalled();
    });
  });

  test('Desde 3 letras se buscan sitios cerca de Ana', ({ given, when, then, and }) => {
    abre(given);
    when(/^escribe "(.*)" en el buscador$/, (t: string) => busca(t));
    then(/^se buscan sitios que coinciden con "(.*)" cerca de Madrid$/, (t: string) => {
      expect(mockSearchPlaces).toHaveBeenCalledTimes(1);
      expect(mockSearchPlaces.mock.calls[0][0]).toBe(t);
      expect(mockSearchPlaces.mock.calls[0][1]).toEqual(MADRID);
    });
    and(/^ve la sugerencia "(.*)" con su dirección y a qué distancia está$/, async (nombre: string) => {
      expect(await p.findByText(nombre)).toBeTruthy();
      expect(p.getByText('Av. de Felipe II 12, Madrid · 1,2 km')).toBeTruthy();
    });
  });

  test('Elegir una sugerencia rellena nombre, dirección y sitio en el mapa', ({ given, when, then, and }) => {
    abre(given);
    and(/^ha buscado "(.*)"$/, (t: string) => busca(t));
    when(/^elige la sugerencia "(.*)"$/, (n: string) => elige(n));
    then(/^ve "(.*)" en "(.*)" con su pin en el mapa$/, async (nombre: string, dir: string) => {
      await waitFor(() => expect(p.getByText(dir)).toBeTruthy());
      expect(p.getAllByText(nombre).length).toBeGreaterThan(0);
      expect(p.getByTestId('pin-del-sitio').props.coordinate).toEqual({ latitude: 40.4297, longitude: -3.6745 });
    });
    and('al valorarlo con 4 estrellas y guardar, se guarda en las coordenadas del sitio elegido', async () => {
      estrellas(4);
      guardar();
      const r = await guardado();
      expect(r).toMatchObject({ name: 'Los Horizontes', address: 'Av. de Felipe II 12, Madrid', latitude: 40.4297, longitude: -3.6745, rating: 4 });
      expect(mockDetails).toHaveBeenCalledWith('p-horizontes', 'sesion-1');
    });
  });

  test('A mano y sin ubicación no se puede guardar', ({ given, when, then, and }) => {
    abre(given);
    when('elige añadirlo a mano', () => {
      fireEvent.press(p.getByText(A_MANO));
    });
    and(/^escribe el nombre "(.*)" y lo valora con 4 estrellas$/, (n: string) => {
      fireEvent.changeText(p.getByPlaceholderText(BUSCADOR), n);
      estrellas(4);
    });
    then(/^no puede guardar y ve "(.*)"$/, async (aviso: string) => {
      expect(p.getByText(aviso)).toBeTruthy();
      guardar();
      await esperar(50);
      expect(mockSave).not.toHaveBeenCalled();
    });
    and('Bite no se inventa la ubicación a partir del nombre', () => {
      expect(mockGeocode).not.toHaveBeenCalled();
      expect(p.queryByTestId('pin-del-sitio')).toBeNull();
    });
  });

  test('A mano, una dirección sugerida pone el pin exacto', ({ given, when, then, and }) => {
    abre(given);
    aManoConNombre(and);
    when(/^escribe "(.*)" en la dirección y elige "(.*)"$/, async (dir: string, opcion: string) => {
      fireEvent.changeText(p.getByPlaceholderText(DIRECCION), dir);
      await waitFor(() => expect(mockSearchAddresses).toHaveBeenCalled());
      expect(mockSearchAddresses.mock.calls[0][1]).toEqual(MADRID);
      fireEvent.press(await p.findByText(opcion));
    });
    then('ve el pin en el mapa', async () => {
      await waitFor(() => expect(p.getByTestId('pin-del-sitio').props.coordinate).toEqual({ latitude: 40.4241, longitude: -3.6727 }));
    });
    and('al guardar, se guarda en las coordenadas de esa dirección', async () => {
      guardar();
      const r = await guardado();
      expect(r).toMatchObject({ name: 'Casa Lu', address: 'Av. de Felipe II 12, 28009 Madrid', latitude: 40.4241, longitude: -3.6727 });
    });
  });

  test('A mano, con "Usar mi ubicación" se guarda donde está Ana', ({ given, when, then, and }) => {
    abre(given);
    aManoConNombre(and);
    when('pulsa "Usar mi ubicación"', async () => {
      fireEvent.press(p.getByText('Usar mi ubicación'));
      await waitFor(() => expect(p.getByTestId('pin-del-sitio')).toBeTruthy());
    });
    then('al guardar, se guarda donde está Ana', async () => {
      guardar();
      expect(await guardado()).toMatchObject({ name: 'Casa Lu', ...mockGpsAhora });
    });
  });

  test('A mano, se marca en el mapa y se ajusta arrastrando el pin', ({ given, when, then, and }) => {
    abre(given);
    aManoConNombre(and);
    when('pulsa "Marcar en el mapa" y arrastra el pin a otro punto', () => {
      fireEvent.press(p.getByText('Marcar en el mapa'));
      const pin = p.getByTestId('pin-del-sitio');
      expect(pin.props.draggable).toBe(true);
      act(() => pin.props.onDragEnd({ nativeEvent: { coordinate: { latitude: 40.42, longitude: -3.69 } } }));
    });
    then('al guardar, se guarda en el punto donde dejó el pin', async () => {
      guardar();
      expect(await guardado()).toMatchObject({ name: 'Casa Lu', latitude: 40.42, longitude: -3.69 });
    });
  });

  test('Un sitio a más de 150 km pide confirmación y no se guarda sin ella', ({ given, when, then, and }) => {
    abre(given);
    eligeTokio(and);
    when('pulsa Guardar', () => guardar());
    then(/^ve "(.*)"$/, async (aviso: string) => {
      expect(await p.findByText(aviso)).toBeTruthy();
    });
    and('si pulsa "Cambiar ubicación" no se guarda nada', async () => {
      fireEvent.press(p.getByText('Cambiar ubicación'));
      await esperar(50);
      expect(mockSave).not.toHaveBeenCalled();
      expect(p.queryByText(/a 10\.764 km de ti/)).toBeNull();
    });
  });

  test('Si Ana confirma el sitio lejano, se guarda', ({ given, when, then, and }) => {
    abre(given);
    eligeTokio(and);
    when(/^pulsa Guardar y confirma "(.*)"$/, async (boton: string) => {
      guardar();
      fireEvent.press(await p.findByText(boton));
    });
    then('se guarda en Tokio', async () => {
      expect(await guardado()).toMatchObject({ latitude: 35.6595, longitude: 139.7005 });
    });
  });

  test('Un sitio cercano se guarda sin preguntar', ({ given, when, then, and }) => {
    abre(given);
    eligeHorizontes(and);
    when('pulsa Guardar', () => guardar());
    then('se guarda sin preguntar nada', async () => {
      expect(await guardado()).toMatchObject({ name: 'Los Horizontes' });
      expect(p.queryByText('Cambiar ubicación')).toBeNull();
    });
  });

  test('Un sitio nuevo empieza como Pendiente y el precio se elige con cinco opciones', ({ given, when, then, and }) => {
    abre(given);
    when('elige añadirlo a mano', () => {
      fireEvent.press(p.getByText(A_MANO));
    });
    then(/^el estado elegido es "(.*)"$/, (estado: string) => {
      expect(p.getByRole('button', { name: estado }).props.accessibilityState).toMatchObject({ selected: true });
      expect(p.getByRole('button', { name: 'Visitado' }).props.accessibilityState).toMatchObject({ selected: false });
    });
    and(/^el precio se elige entre "(.*)", "(.*)", "(.*)", "(.*)" y "(.*)"$/, (...opciones: string[]) => {
      for (const o of opciones) expect(p.getByText(o)).toBeTruthy();
    });
  });

  test('El precio elegido es el que se guarda', ({ given, when, then, and }) => {
    abre(given);
    eligeHorizontes(and);
    when(/^elige el precio "(.*)" y guarda$/, (precio: string) => {
      fireEvent.press(p.getByText(precio));
      guardar();
    });
    then(/^se guarda Pendiente con (\d+) € por persona$/, async (euros: string) => {
      expect(await guardado()).toMatchObject({ visited: false, pricePerPerson: Number(euros) });
    });
  });

  test('El móvil no lleva ninguna clave de Google para buscar sitios', ({ given, then }) => {
    const archivos: string[] = [];
    given('el código de la app', () => {
      const recorrer = (dir: string) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const ruta = path.join(dir, e.name);
          if (e.isDirectory()) {
            if (e.name !== '__tests__') recorrer(ruta);
          } else if (/\.(ts|tsx|js)$/.test(e.name)) archivos.push(ruta);
        }
      };
      recorrer(path.join(__dirname, '..'));
    });
    then('ninguna pantalla lee la clave de Google ni usa el buscador de Google en el móvil', () => {
      const culpables = archivos.filter((f) =>
        /GOOGLE_MAPS_API_KEY|react-native-google-places-autocomplete|maps\.googleapis\.com/.test(fs.readFileSync(f, 'utf8')),
      );
      expect(culpables).toEqual([]);
      const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
      expect(pkg.dependencies['react-native-google-places-autocomplete']).toBeUndefined();
    });
  });

  test('Al borrar letras por debajo de 3 deja de buscar', ({ given, when, then, and }) => {
    abre(given);
    and('el buscador tarda en contestar', () => {
      mockSearchPlaces.mockImplementationOnce(() => new Promise(() => {}));
    });
    when(/^escribe "(.*)" y enseguida lo deja en "(.*)"$/, async (largo: string, corto: string) => {
      await busca(largo);
      await waitFor(() => expect(p.getByTestId('buscando')).toBeTruthy());
      fireEvent.changeText(p.getByPlaceholderText(BUSCADOR), corto);
    });
    then('no se queda buscando', async () => {
      await esperar(50);
      expect(p.queryByTestId('buscando')).toBeNull();
    });
  });

  const sinUbicacionConPin = (given: any, and: any) => {
    given('que Ana no comparte su ubicación y abre la pantalla de guardar un restaurante', () => {
      mockSinUbicacion = true;
      p = render(<SaveScreen />);
    });
    aManoConNombre(and);
    and('pulsa "Marcar en el mapa"', () => {
      fireEvent.press(p.getByText('Marcar en el mapa'));
    });
  };

  test('Sin saber dónde está Ana, Guardar pregunta si el pin está bien puesto', ({ given, and, when, then }) => {
    sinUbicacionConPin(given, and);
    when('pulsa Guardar', () => guardar());
    then(/^ve la pregunta "(.*)" con "(.*)" y "(.*)"$/, async (titulo: string, si: string, cambiar: string) => {
      expect(await p.findByText(titulo)).toBeTruthy();
      expect(p.getByText(si)).toBeTruthy();
      expect(p.getByText(cambiar)).toBeTruthy();
      expect(mockSave).not.toHaveBeenCalled();
    });
  });

  test('Si Ana confirma el pin, se guarda en ese punto', ({ given, and, when, then }) => {
    sinUbicacionConPin(given, and);
    when(/^pulsa Guardar y confirma "(.*)"$/, async (boton: string) => {
      guardar();
      fireEvent.press(await p.findByText(boton));
    });
    then(/^se guarda "(.*)" en ese punto$/, async (nombre: string) => {
      expect(await guardado()).toMatchObject({ name: nombre, latitude: 40.4168, longitude: -3.7038 });
    });
  });

  test('Si Ana cambia la ubicación, no se guarda nada', ({ given, and, when, then }) => {
    sinUbicacionConPin(given, and);
    when(/^pulsa Guardar y elige "(.*)"$/, async (boton: string) => {
      guardar();
      fireEvent.press(await p.findByText(boton));
    });
    then('no se guarda nada', async () => {
      await esperar(50);
      expect(mockSave).not.toHaveBeenCalled();
    });
  });

  test('Al mover el pin, la dirección pasa a ser la del nuevo sitio', ({ given, when, then, and }) => {
    abre(given);
    aManoConNombre(and);
    and(/^ha elegido la dirección "(.*)"$/, async (opcion: string) => {
      fireEvent.changeText(p.getByPlaceholderText(DIRECCION), 'Felipe II 12');
      fireEvent.press(await p.findByText(opcion));
      await waitFor(() => expect(p.getByTestId('pin-del-sitio')).toBeTruthy());
    });
    when('arrastra el pin a otra calle', async () => {
      mockReverse.mockImplementation(async () => 'Calle de Alcalá 100, Madrid');
      await act(async () => p.getByTestId('pin-del-sitio').props.onDragEnd({ nativeEvent: { coordinate: { latitude: 40.4225, longitude: -3.6795 } } }));
    });
    then('se guarda con la dirección de esa calle y no con la anterior', async () => {
      await waitFor(() => expect(p.getByPlaceholderText(DIRECCION).props.value).toBe('Calle de Alcalá 100, Madrid'));
      guardar();
      expect(await guardado()).toMatchObject({ address: 'Calle de Alcalá 100, Madrid', latitude: 40.4225, longitude: -3.6795 });
    });
  });
});
