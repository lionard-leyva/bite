// Acceptance: features/pantalla-decision.feature (MCH-06 del plan E2E). MatchScreen real; hooks de datos simulados.
// Proyecto Jest "components". Prueba metamórfica: si lo que ve Ana no depende de lo que vota Bea, el árbol de la
// pantalla es idéntico para cualquier voto de Bea que no cambie el estado de la ronda.
import { View } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { defineFeature, loadFeature } from 'jest-cucumber';
import MatchScreen from '../screens/MatchScreen';
import type { Restaurant, Vote, VotesByUser } from '../types';

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('expo-image', () => ({ Image: require('react-native').View }));
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'ana' }, userId: 'ana', listId: 'L1', skipMode: false }),
}));
jest.mock('../hooks/useLocation', () => ({
  useLocation: () => ({ latitude: null, longitude: null, loading: false, error: null, refresh: jest.fn() }),
}));
jest.mock('../hooks/useNavigationETA', () => ({ useNavigationETA: () => ({ eta: null }) }));
jest.mock('../services/listService', () => ({
  getListMembers: async () => [
    { userId: 'ana', email: 'ana@x.com', displayName: 'Ana' },
    { userId: 'bea', email: 'bea@x.com', displayName: 'Bea' },
  ],
}));
jest.mock('../services/navigationService', () => ({
  formatDistance: (km: number) => `${km} km`,
  openNativeNavigation: jest.fn(),
}));

let mockRestaurants: Restaurant[] = [];
jest.mock('../hooks/useRestaurants', () => ({
  useRestaurants: () => ({ restaurants: mockRestaurants, loading: false }),
}));
let mockDecision: any;
jest.mock('../hooks/useDecisionSession', () => ({ useDecisionSession: () => mockDecision }));

const feature = loadFeature('features/pantalla-decision.feature');

const restaurante = (id: string, name: string): Restaurant => ({
  id, name, address: `Calle ${name}`, latitude: 40.4, longitude: -3.7, rating: 4, note: '', photoURL: null,
  visited: false, createdBy: 'ana', createdAt: new Date(), updatedAt: new Date(), listId: 'L1',
});

const ronda = (votes: VotesByUser, extra: object = {}) => ({
  session: {
    id: 'L1', roundId: 'R1', listId: 'L1', status: 'ACTIVE', participants: ['ana', 'bea'],
    restaurantIds: ['r1', 'r2'], matchedRestaurantId: null, createdAt: new Date(), ...extra,
  },
  votes,
  myVotes: votes.ana ?? {},
  loading: false,
  error: null,
  vote: jest.fn(),
  restart: jest.fn(),
});

// El nombre de la pareja llega de forma asincrona (getListMembers): se deja resolver antes de mirar la pantalla.
const pantalla = async (votes: VotesByUser, extra: object = {}) => {
  mockDecision = ronda(votes, extra);
  const r = render(<MatchScreen />);
  await act(async () => {});
  return { r, json: JSON.stringify(r.toJSON()) };
};

const L = (rid: string): Record<string, Vote> => ({ [rid]: 'LIKE' });

defineFeature(feature, (test) => {
  let ana: VotesByUser[string];
  let vistas: Array<Awaited<ReturnType<typeof pantalla>>>;

  const antecedentes = (given: any) =>
    given('que Ana y Bea están en la misma ronda con "Casa Lucio" y "Taco" pendientes', () => {
      mockRestaurants = [restaurante('r1', 'Casa Lucio'), restaurante('r2', 'Taco')];
    });

  test('Lo que vota Bea no cambia lo que ve Ana mientras vota', ({ given, when, then, and }) => {
    antecedentes(given);
    given('que Ana todavía no ha votado nada', () => {
      ana = {};
    });
    when('Bea no ha votado nada, o ha dado like a "Casa Lucio", o ha dado like a "Taco"', async () => {
      vistas = [];
      const votosDeBea: Array<Record<string, Vote>> = [{}, L('r1'), L('r2')];
      for (const bea of votosDeBea) vistas.push(await pantalla({ ana, bea }));
    });
    then('Ana ve exactamente la misma pantalla en los tres casos', () => {
      expect(vistas).toHaveLength(3);
      expect(vistas[1].json).toBe(vistas[0].json);
      expect(vistas[2].json).toBe(vistas[0].json);
    });
    and(/^esa pantalla le propone "(.*)"$/, (nombre: string) => {
      expect(vistas[0].r.queryByText(nombre)).not.toBeNull();
      expect(vistas[0].r.queryByText('Taco')).toBeNull();
    });
  });

  test('Si Ana ya votó todo, solo sabe que Bea no ha terminado', ({ given, when, then, and }) => {
    antecedentes(given);
    given('que Ana ya ha votado todos los sitios', () => {
      ana = { r1: 'LIKE', r2: 'PASS' };
    });
    when('Bea no ha votado nada, o ha votado solo uno', async () => {
      vistas = [];
      const votosDeBea: Array<Record<string, Vote>> = [{}, { r2: 'PASS' }];
      for (const bea of votosDeBea) vistas.push(await pantalla({ ana, bea }));
    });
    then('Ana ve exactamente la misma pantalla en los dos casos', () => {
      expect(vistas).toHaveLength(2);
      expect(vistas[1].json).toBe(vistas[0].json);
    });
    and(/^esa pantalla dice "(.*)"$/, (texto: string) => {
      expect(vistas[0].r.queryByText(texto)).not.toBeNull();
    });
  });

  test('Cuando coinciden, los dos ven el match', ({ given, when, then }) => {
    let v: Awaited<ReturnType<typeof pantalla>>;
    antecedentes(given);
    given('que los dos han dado like a "Taco" y la ronda se ha marcado como match', () => {
      ana = L('r2');
    });
    when('Ana mira su pantalla', async () => {
      v = await pantalla({ ana, bea: L('r2') }, { status: 'MATCHED', matchedRestaurantId: 'r2' });
    });
    then(/^ve "(.*)", "(.*)" y "(.*)"$/, (a: string, b: string, c: string) => {
      for (const t of [a, b, c]) expect(v.r.queryByText(t)).not.toBeNull();
    });
  });
});
