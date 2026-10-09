// Acceptance: features/pantalla-de-acceso.feature (SAF-04 del plan E2E). AuthScreen real; solo se simula la barra superior.
import { defineFeature, loadFeature } from 'jest-cucumber';

let mockBarraSuperior = 0;
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: mockBarraSuperior, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: require('react-native').View,
}));
jest.mock('expo-image', () => ({ Image: require('react-native').View }));
jest.mock('expo-location', () => ({}));
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ login: jest.fn(), register: jest.fn(), skipLogin: jest.fn() }),
}));
jest.mock('../hooks/useLocation', () => ({
  useLocation: () => ({ latitude: null, longitude: null, loading: false, error: null, refresh: jest.fn() }),
}));
jest.mock('../services/imageService', () => ({ pickImage: jest.fn() }));
jest.mock('../services/locationService', () => ({ reverseGeocode: jest.fn() }));

jest.setTimeout(30000);

const feature = loadFeature('features/pantalla-de-acceso.feature');

import { render } from '@testing-library/react-native';
import { ScrollView, StyleSheet } from 'react-native';
import AuthScreen from '../screens/AuthScreen';

defineFeature(feature, (test) => {
  test('El logo empieza por debajo de la barra de estado', ({ given, when, then }) => {
    let pantalla: ReturnType<typeof render>;
    given('que el teléfono tiene una barra superior de 59 píxeles', () => {
      mockBarraSuperior = 59;
    });
    when('Ana abre la pantalla de acceso', () => {
      pantalla = render(<AuthScreen />);
    });
    then('el contenido deja un margen superior de al menos 59 píxeles', () => {
      const scroll = pantalla.UNSAFE_getAllByType(ScrollView)[0];
      const margen = StyleSheet.flatten(scroll.props.contentContainerStyle).paddingTop;
      expect(margen).toBeGreaterThanOrEqual(59);
    });
  });
});
