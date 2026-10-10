// Acceptance: features/datos-extremos.feature (EDG-01..EDG-06 del plan E2E). Componentes y utilidades reales con datos extremos.
import { Animated } from 'react-native';
import { render } from '@testing-library/react-native';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { initialOf } from '../utils/initialOf';
import { matchesQuery } from '../utils/searchMatch';
import RestaurantCard from '../components/RestaurantCard';
import MatchEntryCard from '../components/MatchEntryCard';
import MapDetailCard from '../components/MapDetailCard';
import DetailScreen from '../screens/DetailScreen';
import SaveScreen from '../screens/SaveScreen';
import type { Restaurant } from '../types';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { restaurantId: 'r1' } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: require('react-native').View,
}));
jest.mock('expo-image', () => ({ Image: require('react-native').View }));
jest.mock('expo-location', () => ({}));
jest.mock('expo-constants', () => ({ expoConfig: { extra: {} } }));
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), getDoc: jest.fn() }));
jest.mock('../config/firebase', () => ({ db: {} }));
jest.mock('../hooks/useAuth', () => ({ useAuth: () => ({ userId: 'ana', listId: 'L1', skipMode: false }) }));
jest.mock('../hooks/useLocation', () => ({
  useLocation: () => ({ latitude: null, longitude: null, loading: false, error: null, refresh: jest.fn() }),
}));
let mockRestaurants: Restaurant[] = [];
jest.mock('../hooks/useRestaurants', () => ({
  useRestaurants: () => ({ restaurants: mockRestaurants, refreshLocal: jest.fn(), loading: false }),
}));
jest.mock('../services/locationService', () => ({ reverseGeocode: jest.fn() }));
jest.mock('../services/shareService', () => ({ resolveSharedText: jest.fn() }));
jest.mock('../services/restaurantService', () => ({ saveRestaurant: jest.fn(), toggleVisited: jest.fn(), deleteRestaurant: jest.fn() }));
jest.mock('../services/localStorageService', () => ({
  saveLocalRestaurant: jest.fn(),
  updateLocalRestaurant: jest.fn(),
  updateLocalRestaurantVisited: jest.fn(),
  deleteLocalRestaurant: jest.fn(),
  getLocalRestaurants: jest.fn(async () => []),
}));
jest.mock('../services/navigationService', () => ({ openNativeNavigation: jest.fn() }));
jest.mock('../components/PhotoPicker', () => () => null);
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: (props: any) => <View {...props} />, Marker: (props: any) => <View {...props} /> };
});

jest.setTimeout(30000);

const feature = loadFeature('features/datos-extremos.feature');

const restaurante = (extra: Partial<Restaurant> = {}): Restaurant => ({
  id: 'r1', name: 'Casa Lucio', address: 'Cava Baja 35', latitude: 40.4, longitude: -3.7, rating: 4, note: '',
  photoURL: null, photoURLs: [], visited: false, createdBy: 'ana', createdAt: new Date(), updatedAt: new Date(),
  listId: 'L1', ...extra,
});

defineFeature(feature, (test) => {
  test('La inicial del marcador respeta emoji, mayúsculas y espacios', ({ given, when, then }) => {
    let nombre = '';
    let inicial = '';
    given(/^un restaurante que se llama "(.*)"$/, (n: string) => {
      nombre = n;
    });
    when('Bite calcula la inicial de su marcador', () => {
      inicial = initialOf(nombre);
    });
    then(/^la inicial es "(.*)"$/, (esperada: string) => {
      expect(inicial).toBe(esperada);
    });
  });

  test('La búsqueda ignora tildes y mayúsculas', ({ given, when, then }) => {
    let sitio: Restaurant;
    let encontrado = false;
    given(/^un restaurante en "(.*)" que se llama "(.*)"$/, (direccion: string, nombre: string) => {
      sitio = restaurante({ name: nombre, address: direccion });
    });
    when(/^Ana busca "(.*)"$/, (busqueda: string) => {
      encontrado = matchesQuery(sitio, busqueda);
    });
    then(/^(el sitio|ningún sitio) aparece$/, (resultado: string) => {
      expect(encontrado).toBe(resultado === 'el sitio');
    });
  });

  test('En el detalle la nota se lee entera', ({ given, when, then }) => {
    const nota = 'Ñam '.repeat(50).trim().slice(0, 200);
    let pantalla: ReturnType<typeof render>;
    given('un restaurante con una nota de 200 caracteres', () => {
      mockRestaurants = [restaurante({ note: nota })];
    });
    when('Ana abre su detalle', () => {
      pantalla = render(<DetailScreen />);
    });
    then('la nota no se recorta', () => {
      expect(pantalla.getByText(nota).props.numberOfLines).toBeUndefined();
    });
  });

  test('Las etiquetas hablan en singular cuando hay uno', ({ given, when, then }) => {
    let pantalla: ReturnType<typeof render>;
    given(/^(.*)$/, (situacion: string) => {
      const tarjeta = situacion.match(/^un restaurante pendiente con (\d) estrellas?$/);
      const hoy = situacion.match(/^(\d) restaurantes? pendientes? en la tarjeta de hoy$/);
      if (tarjeta) {
        pantalla = render(<RestaurantCard restaurant={restaurante({ rating: Number(tarjeta[1]) })} onPress={() => {}} />);
      } else if (hoy) {
        pantalla = render(<MatchEntryCard pendingCount={Number(hoy[1])} onPress={() => {}} />);
      } else {
        throw new Error(`situación desconocida: ${situacion}`);
      }
    });
    when('un lector de pantalla lee el elemento', () => {});
    then(/^oye "(.*)"$/, (etiqueta: string) => {
      expect(pantalla.getByLabelText(etiqueta)).toBeTruthy();
    });
  });

  test('La tarjeta del mapa no se rompe con un rating fuera de rango', ({ given, when, then }) => {
    let rating = 0;
    let pantalla: ReturnType<typeof render>;
    given(/^un restaurante guardado con rating (-?\d+)$/, (r: string) => {
      rating = Number(r);
    });
    when('Ana lo abre en la tarjeta del mapa', () => {
      pantalla = render(
        <MapDetailCard
          restaurant={restaurante({ rating })}
          translateY={new Animated.Value(0)}
          onClose={() => {}}
          onDetail={() => {}}
          onNavigate={() => {}}
          metaLine="1,2 km · 3 min"
          etaLoading={false}
        />,
      );
    });
    then(/^la valoración dice "★ (\d)"$/, (n: string) => {
      // "★ " y el numero van en textos anidados: se compara el texto completo de la linea.
      expect(pantalla.getByText(new RegExp(`^★ ${n}( ·|$)`))).toBeTruthy();
    });
  });

  test('El formulario de guardar limita nombre y dirección', ({ given, then, and }) => {
    let pantalla: ReturnType<typeof render>;
    given('que Ana abre la pantalla de guardar a mano', () => {
      pantalla = render(<SaveScreen />);
    });
    then('el nombre admite como máximo 120 caracteres', () => {
      expect(pantalla.getByPlaceholderText('Nombre del restaurante').props.maxLength).toBe(120);
    });
    and('la dirección admite como máximo 200 caracteres', () => {
      expect(pantalla.getByPlaceholderText('Direccion del restaurante').props.maxLength).toBe(200);
    });
  });
});
