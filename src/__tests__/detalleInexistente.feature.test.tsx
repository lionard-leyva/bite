// Acceptance: features/detalle-inexistente.feature (DET-03 del plan E2E). DetailScreen real; lista de restaurantes simulada.
// Proyecto Jest "components". Comportamiento ya existente: se caracteriza con el escenario y se prueba con mutaciones.
import { act, render } from '@testing-library/react-native';
import { defineFeature, loadFeature } from 'jest-cucumber';
import DetailScreen from '../screens/DetailScreen';
import type { Restaurant } from '../types';

let mockRestaurantId = 'r1';
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { restaurantId: mockRestaurantId } }),
}));
jest.mock('expo-image', () => ({ Image: require('react-native').View }));
jest.mock('../hooks/useAuth', () => ({ useAuth: () => ({ skipMode: false, userId: 'ana', listId: 'L1' }) }));
let mockRestaurants: Restaurant[] = [];
jest.mock('../hooks/useRestaurants', () => ({
  useRestaurants: () => ({ restaurants: mockRestaurants, refreshLocal: jest.fn(), loading: false }),
}));
jest.mock('../services/restaurantService', () => ({ toggleVisited: jest.fn(), deleteRestaurant: jest.fn() }));
jest.mock('../services/localStorageService', () => ({
  deleteLocalRestaurant: jest.fn(),
  updateLocalRestaurantVisited: jest.fn(),
}));
jest.mock('../services/navigationService', () => ({ openNativeNavigation: jest.fn() }));

jest.setTimeout(30000);

const feature = loadFeature('features/detalle-inexistente.feature');

const restaurante = (id: string, name: string): Restaurant => ({
  id, name, address: `Calle ${name}`, latitude: 40.4, longitude: -3.7, rating: 4, note: '', photoURL: null,
  visited: false, createdBy: 'ana', createdAt: new Date(), updatedAt: new Date(), listId: 'L1',
});

const AVISO = 'Restaurante no encontrado';

defineFeature(feature, (test) => {
  beforeEach(() => {
    mockRestaurantId = 'r1';
    mockRestaurants = [];
  });

  const listaConCasaLucio = (given: (re: string, fn: () => void) => void) =>
    given('que la lista de Ana tiene "Casa Lucio"', () => {
      mockRestaurants = [restaurante('r1', 'Casa Lucio')];
    });

  test('Un restaurante que no está en la lista se avisa', ({ given, when, then, and }) => {
    let pantalla: ReturnType<typeof render>;
    listaConCasaLucio(given);
    when('Ana abre el detalle de un restaurante que no existe', () => {
      mockRestaurantId = 'no-existe';
      pantalla = render(<DetailScreen />);
    });
    then('Bite dice "Restaurante no encontrado"', () => {
      expect(pantalla.getByText(AVISO)).toBeTruthy();
    });
    and('no muestra ninguna acción sobre el restaurante', () => {
      expect(pantalla.queryByText('Eliminar')).toBeNull();
      expect(pantalla.queryByText('Casa Lucio')).toBeNull();
    });
  });

  test('Un restaurante que sí está se muestra, no el aviso', ({ given, when, then, and }) => {
    let pantalla: ReturnType<typeof render>;
    listaConCasaLucio(given);
    when('Ana abre el detalle de "Casa Lucio"', () => {
      pantalla = render(<DetailScreen />);
    });
    then('Bite muestra "Casa Lucio"', () => {
      expect(pantalla.getByText('Casa Lucio')).toBeTruthy();
    });
    and('no dice "Restaurante no encontrado"', () => {
      expect(pantalla.queryByText(AVISO)).toBeNull();
    });
  });

  test('Si el restaurante se borra mientras se mira, aparece el aviso', ({ given, when, then, and }) => {
    let pantalla: ReturnType<typeof render>;
    listaConCasaLucio(given);
    and('que Ana tiene abierto el detalle de "Casa Lucio"', () => {
      pantalla = render(<DetailScreen />);
      expect(pantalla.getByText('Casa Lucio')).toBeTruthy();
    });
    when('su pareja elimina "Casa Lucio"', () => {
      mockRestaurants = [];
      act(() => pantalla.rerender(<DetailScreen />));
    });
    then('Bite dice "Restaurante no encontrado"', () => {
      expect(pantalla.getByText(AVISO)).toBeTruthy();
    });
  });
});
