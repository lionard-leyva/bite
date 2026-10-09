// Acceptance: features/detalles-de-diseno.feature (HAP-01, EMP-01, CEL-01, AVA-01 del plan E2E). Pantallas reales con haptics y accesibilidad simulados.
import { AccessibilityInfo } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { defineFeature, loadFeature } from 'jest-cucumber';
import * as Haptics from 'expo-haptics';
import FAB from '../components/FAB';
import MatchScreen from '../screens/MatchScreen';
import ListScreen from '../screens/ListScreen';
import type { Restaurant } from '../types';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  notificationAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
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
jest.mock('../services/navigationService', () => ({ formatDistance: (km: number) => `${km} km`, openNativeNavigation: jest.fn() }));
let mockRestaurants: Restaurant[] = [];
jest.mock('../hooks/useRestaurants', () => ({
  useRestaurants: () => ({
    restaurants: mockRestaurants, loading: false, error: null, loadMore: jest.fn(), loadingMore: false, hasMore: false,
  }),
}));
let mockDecision: any;
jest.mock('../hooks/useDecisionSession', () => ({ useDecisionSession: () => mockDecision }));

jest.setTimeout(30000);

const feature = loadFeature('features/detalles-de-diseno.feature');

const restaurante = (id: string, name: string): Restaurant => ({
  id, name, address: `Calle ${name}`, latitude: 40.4, longitude: -3.7, rating: 4, note: '', photoURL: null,
  visited: false, createdBy: 'ana', createdAt: new Date(), updatedAt: new Date(), listId: 'L1',
});

const ronda = (extra: object = {}) => ({
  session: {
    id: 'L1', roundId: 'R1', listId: 'L1', status: 'ACTIVE', participants: ['ana', 'bea'],
    restaurantIds: ['r1', 'r2'], matchedRestaurantId: null, createdAt: new Date(), ...extra,
  },
  votes: {}, myVotes: {}, loading: false, error: null, vote: jest.fn(), restart: jest.fn(),
});

const conReducirMovimiento = (activo: boolean) => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(activo);
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() } as any);
};

async function matchDeTaco() {
  mockRestaurants = [restaurante('r1', 'Casa Lucio'), restaurante('r2', 'Taco')];
  mockDecision = ronda({ status: 'MATCHED', matchedRestaurantId: 'r2' });
  const pantalla = render(<MatchScreen />);
  await act(async () => {});
  return pantalla;
}

defineFeature(feature, (test) => {
  beforeEach(() => {
    jest.clearAllMocks();
    conReducirMovimiento(false);
  });
  afterEach(() => jest.restoreAllMocks());

  test('Las acciones importantes dan un toque táctil', ({ given, when, then }) => {
    let accion = '';
    given('que Ana usa Bite', () => {});
    when(/^(.*)$/, async (a: string) => {
      accion = a;
      if (a === 'pulsa el botón de guardar') {
        const p = render(<FAB onPress={() => {}} />);
        fireEvent.press(p.getByRole('button'));
      } else if (a === 'vota que iría a un sitio') {
        mockRestaurants = [restaurante('r1', 'Casa Lucio'), restaurante('r2', 'Taco')];
        mockDecision = ronda();
        const p = render(<MatchScreen />);
        await act(async () => {});
        fireEvent.press(p.getByLabelText('Iría a Casa Lucio'));
      } else {
        await matchDeTaco();
      }
    });
    then(/^el móvil da un toque (ligero|medio|de éxito)$/, (toque: string) => {
      expect(accion).not.toBe('');
      if (toque === 'ligero') expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
      else if (toque === 'medio') expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');
      else expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    });
  });

  test('La lista vacía invita con calidez', ({ given, when, then, and }) => {
    let pantalla: ReturnType<typeof render>;
    given('que Ana todavía no ha guardado ningún restaurante', () => {
      mockRestaurants = [];
    });
    when('abre su lista', () => {
      pantalla = render(<ListScreen />);
    });
    then(/^ve "(.*)"$/, (texto: string) => {
      expect(pantalla.getByText(texto)).toBeTruthy();
    });
    and(/^sigue viendo "(.*)"$/, (texto: string) => {
      expect(pantalla.getByText(texto)).toBeTruthy();
    });
  });

  test('El match se celebra solo si el movimiento está permitido', ({ given, when, then }) => {
    let pantalla: ReturnType<typeof render>;
    given(/^que el movimiento (está permitido|está reducido)$/, (estado: string) => {
      conReducirMovimiento(estado === 'está reducido');
    });
    when('los dos coinciden en un sitio', async () => {
      pantalla = await matchDeTaco();
    });
    then(/^(se ve|no se ve) confeti$/, (resultado: string) => {
      const hay = pantalla.queryAllByTestId('confeti').length > 0;
      expect(hay).toBe(resultado === 'se ve');
    });
  });

  test('La pareja aparece con sus iniciales superpuestas', ({ given, when, then }) => {
    let pantalla: ReturnType<typeof render>;
    given('que Ana y Bea han coincidido', () => {});
    when('se muestra el match', async () => {
      pantalla = await matchDeTaco();
    });
    then(/^ven las iniciales "(.*)" y "(.*)" una junto a otra$/, (a: string, b: string) => {
      const iniciales = pantalla.getAllByTestId('avatar').map((n) => n.props.children);
      expect(iniciales).toEqual([a, b]);
    });
  });
});
