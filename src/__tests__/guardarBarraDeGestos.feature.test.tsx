// Acceptance: features/guardar-barra-de-gestos.feature (SAF-03 del plan E2E). SaveScreen real; solo se simula la barra inferior.
import { defineFeature, loadFeature } from 'jest-cucumber';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));
let mockBarraInferior = 0;
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: mockBarraInferior, left: 0, right: 0 }),
  SafeAreaView: require('react-native').View,
}));
jest.mock('expo-location', () => ({}));
jest.mock('expo-constants', () => ({ expoConfig: { extra: { GOOGLE_MAPS_API_KEY: '' } } }));
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
jest.mock('react-native-google-places-autocomplete', () => ({ GooglePlacesAutocomplete: () => null }));

jest.setTimeout(30000);

const feature = loadFeature('features/guardar-barra-de-gestos.feature');

import { render } from '@testing-library/react-native';
import { ScrollView, StyleSheet } from 'react-native';
import SaveScreen from '../screens/SaveScreen';

defineFeature(feature, (test) => {
  test('Al desplazar hasta el final queda un margen mayor que la barra inferior', ({ given, when, then }) => {
    let pantalla: ReturnType<typeof render>;
    given('que el teléfono tiene una barra inferior de 126 píxeles', () => {
      mockBarraInferior = 126;
    });
    when('Ana abre la pantalla de guardar un restaurante', () => {
      pantalla = render(<SaveScreen />);
    });
    then('el final del formulario deja un margen de al menos 126 píxeles', () => {
      const scroll = pantalla.UNSAFE_getAllByType(ScrollView)[0];
      const margen = StyleSheet.flatten(scroll.props.contentContainerStyle).paddingBottom;
      expect(margen).toBeGreaterThanOrEqual(126);
    });
  });
});
