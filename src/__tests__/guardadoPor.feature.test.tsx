// Acceptance: features/guardado-por.feature (SAV-01, SAV-02 del plan E2E). Utilidad real y DetailScreen real con miembros simulados.
import { act, render } from '@testing-library/react-native';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { savedByLabel } from '../utils/savedBy';
import DetailScreen from '../screens/DetailScreen';
import RestaurantCard from '../components/RestaurantCard';
import type { Restaurant } from '../types';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { restaurantId: 'r1' } }),
}));
jest.mock('expo-image', () => ({ Image: require('react-native').View }));
jest.mock('../hooks/useAuth', () => ({ useAuth: () => ({ skipMode: false, userId: 'ana', listId: 'L1' }) }));
let mockRestaurants: Restaurant[] = [];
jest.mock('../hooks/useRestaurants', () => ({
  useRestaurants: () => ({ restaurants: mockRestaurants, refreshLocal: jest.fn(), loading: false }),
}));
jest.mock('../services/restaurantService', () => ({ toggleVisited: jest.fn(), deleteRestaurant: jest.fn() }));
jest.mock('../services/localStorageService', () => ({ deleteLocalRestaurant: jest.fn(), updateLocalRestaurantVisited: jest.fn() }));
jest.mock('../services/navigationService', () => ({ openNativeNavigation: jest.fn() }));
jest.mock('../services/listService', () => ({
  getListMembers: async () => [
    { userId: 'ana', email: 'ana@x.com', displayName: 'Ana' },
    { userId: 'bea', email: 'bea@x.com', displayName: 'Bea' },
  ],
}));

jest.setTimeout(30000);

const feature = loadFeature('features/guardado-por.feature');

type Miembro = { userId: string; email: string; displayName: string };
const ANA: Miembro = { userId: 'ana', email: 'ana@x.com', displayName: 'Ana' };
const BEA: Miembro = { userId: 'bea', email: 'bea@x.com', displayName: 'Bea' };
const BEA_SIN_NOMBRE: Miembro = { userId: 'bea@correo.com', email: 'bea@correo.com', displayName: '' };

function miembrosDe(texto: string): Miembro[] {
  if (texto === 'Ana y Bea') return [ANA, BEA];
  if (texto === 'solo Ana') return [ANA];
  if (texto === 'Ana y bea@correo.com sin nombre') return [ANA, BEA_SIN_NOMBRE];
  throw new Error(`miembros desconocidos: ${texto}`);
}

defineFeature(feature, (test) => {
  test('La etiqueta depende de quién guardó y de cuántos miembros hay', ({ given, when, then }) => {
    let miembros: Miembro[] = [];
    let etiqueta: string | null = null;
    given(/^una lista con (.*)$/, (m: string) => {
      miembros = miembrosDe(m);
    });
    when(/^el sitio lo guardó (.*) y lo mira Ana$/, (autor: string) => {
      etiqueta = savedByLabel(autor === 'alguien desconocido' ? 'zzz' : autor.replace(/^(Ana|Bea)$/, (n) => n.toLowerCase()), miembros, 'ana');
    });
    then(/^la etiqueta es "(.*)"$/, (esperada: string) => {
      expect(etiqueta ?? '').toBe(esperada);
    });
  });

  test('El detalle muestra quién guardó el sitio', ({ given, when, then }) => {
    let pantalla: ReturnType<typeof render>;
    given('que Ana y Bea comparten la lista y Bea guardó "Casa Lucio"', () => {
      mockRestaurants = [{
        id: 'r1', name: 'Casa Lucio', address: 'Cava Baja 35', latitude: 40.4, longitude: -3.7, rating: 4, note: '',
        photoURL: null, photoURLs: [], visited: false, createdBy: 'bea', createdAt: new Date(), updatedAt: new Date(), listId: 'L1',
      }];
    });
    when('Ana abre el detalle de "Casa Lucio"', async () => {
      pantalla = render(<DetailScreen />);
      await act(async () => {});
    });
    then('ve "Guardado por Bea"', () => {
      expect(pantalla.getByText('Guardado por Bea')).toBeTruthy();
    });
  });

  test('La tarjeta de la lista añade el autor solo cuando es otra persona', ({ given, when, then }) => {
    let author: string | null = null;
    let pantalla: ReturnType<typeof render>;
    given(/^una tarjeta de restaurante guardada (.*) (por Bea|por Ana misma|sin autor conocido)$/, (_cuando: string, quien: string) => {
      author = quien === 'por Bea' ? 'Bea' : null;
    });
    when('Ana mira la lista', () => {
      const sitio: Restaurant = {
        id: 'r1', name: 'Casa Lucio', address: 'Cava Baja 35', latitude: 40.4, longitude: -3.7, rating: 4, note: '',
        photoURL: null, photoURLs: [], visited: false, createdBy: 'bea', createdAt: new Date(), updatedAt: new Date(), listId: 'L1',
      };
      pantalla = render(<RestaurantCard restaurant={sitio} onPress={() => {}} author={author} />);
    });
    then(/^la tarjeta dice "(.*)"$/, (texto: string) => {
      expect(pantalla.getByText(texto)).toBeTruthy();
    });
  });
});
