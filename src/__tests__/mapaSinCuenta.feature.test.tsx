// Acceptance: features/mapa-sin-cuenta.feature (MAP-09 del plan E2E). HomeScreen + useRestaurants + localStorageService reales;
// AsyncStorage simulado guarda texto como el real, asi que las fechas llegan como en el movil.
import { defineFeature, loadFeature } from 'jest-cucumber';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('firebase/firestore', () => require('../../jest/fakeFirestore'));
jest.mock('../config/firebase', () => ({ db: {} }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('expo-image', () => ({ Image: require('react-native').View }));
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MapView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ animateToRegion: jest.fn(), fitToCoordinates: jest.fn() }));
    return <View testID="mapa">{props.children}</View>;
  });
  return { __esModule: true, default: MapView, Marker: (p: any) => <View>{p.children}</View> };
});
jest.mock('react-native-map-clustering', () => {
  const React = require('react');
  const { View } = require('react-native');
  return React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ animateToRegion: jest.fn(), fitToCoordinates: jest.fn() }));
    return <View testID="mapa">{props.children}</View>;
  });
});
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
    useRoute: () => ({ params: {} }),
    useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
  };
});
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: null, userId: 'device-ana', listId: 'local', skipMode: true }),
}));
let mockUbicacion: { latitude: number | null; longitude: number | null } = { latitude: null, longitude: null };
jest.mock('../hooks/useLocation', () => ({
  useLocation: () => ({ ...mockUbicacion, loading: false, error: null, errorKind: null, refresh: jest.fn() }),
}));
jest.mock('../hooks/useNavigationETA', () => ({ useNavigationETA: () => ({ eta: null }) }));
jest.mock('../components/MatchEntryCard', () => () => null);

jest.setTimeout(30000);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, waitFor } from '@testing-library/react-native';
import HomeScreen from '../screens/HomeScreen';

const feature = loadFeature('features/mapa-sin-cuenta.feature');

const sitio = (id: string, name: string, latitude: number, longitude: number) => ({
  id, name, address: '', latitude, longitude, rating: 4, note: '', visited: false, pricePerPerson: null,
  photoURL: null, photoURLs: [], createdBy: 'device-ana', createdAt: new Date(), updatedAt: new Date(), listId: 'local',
});

defineFeature(feature, (test) => {
  test('Abrir el mapa sin cuenta con sitios guardados y sin ubicación', ({ given, and, when, then }) => {
    let errores: unknown[] = [];
    given('que Ana usa Bite sin cuenta y tiene guardados "Casa Lucio" y "Sobrino de Botín" en el móvil', async () => {
      // Como lo deja saveLocalRestaurant: JSON en AsyncStorage (las fechas pasan a texto).
      await AsyncStorage.setItem(
        '@bite:restaurants',
        JSON.stringify([sitio('a', 'Casa Lucio', 40.4137, -3.7081), sitio('b', 'Sobrino de Botín', 40.4141, -3.7075)]),
      );
    });
    and('que Bite todavía no sabe dónde está', () => {
      mockUbicacion = { latitude: null, longitude: null };
    });
    when('abre el mapa', async () => {
      const original = console.error;
      jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
        errores.push(args);
        original(...args);
      });
      render(<HomeScreen />);
      // Los sitios han llegado cuando desaparece el aviso de mapa vacio.
      await waitFor(() => expect(screen.queryByText(/mapa est[aá] vac[ií]o/i)).toBeNull());
      await new Promise((r) => setTimeout(r, 400)); // deja correr los encuadres (120 y 300 ms)
    });
    then('ve el mapa con sus sitios y sin errores', () => {
      expect(screen.getAllByTestId('mapa').length).toBeGreaterThan(0);
      expect(errores).toEqual([]);
    });
  });
});
