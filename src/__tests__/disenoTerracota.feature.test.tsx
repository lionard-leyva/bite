// Acceptance: features/diseno-terracota.feature (UI-12 y UI-13 del plan E2E). HomeScreen y ListScreen reales;
// restaurantes, sesion y miembros de la lista simulados. El mapa nativo es una vista.
import { defineFeature, loadFeature } from 'jest-cucumber';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
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
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: () => {},
}));
let mockAuth: any = {};
jest.mock('../hooks/useAuth', () => ({ useAuth: () => mockAuth }));
let mockRestaurantes: any[] = [];
jest.mock('../hooks/useRestaurants', () => ({
  useRestaurants: () => ({
    restaurants: mockRestaurantes, loading: false, error: null, loadMore: jest.fn(), loadingMore: false, hasMore: false,
  }),
}));
let mockMiembros: any[] = [];
jest.mock('../services/listService', () => ({ getListMembers: async () => mockMiembros }));
jest.mock('../hooks/useLocation', () => ({
  useLocation: () => ({ latitude: null, longitude: null, loading: false, error: null, errorKind: null, refresh: jest.fn() }),
}));
jest.mock('../hooks/useNavigationETA', () => ({ useNavigationETA: () => ({ eta: null }) }));

jest.setTimeout(30000);

import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import HomeScreen from '../screens/HomeScreen';
import ListScreen from '../screens/ListScreen';
import { palette } from '../theme/palette';

const feature = loadFeature('features/diseno-terracota.feature');

const sitio = (id: string, name: string, visited: boolean, createdBy: string) => ({
  id, name, address: 'Calle Mayor 1, Madrid', latitude: 40.4137, longitude: -3.7081, rating: 4, note: '', visited,
  pricePerPerson: null, photoURL: null, photoURLs: [], createdBy, createdAt: new Date(), updatedAt: new Date(), listId: 'L1',
});

const sinCuenta = (given: any) =>
  given('que Ana usa Bite sin cuenta con "Casa Lucio" pendiente guardado', () => {
    mockAuth = { user: null, userId: 'device-ana', listId: 'local', skipMode: true };
    mockMiembros = [];
    mockRestaurantes = [sitio('a', 'Casa Lucio', false, 'device-ana')];
  });
const enPareja = (given: any) =>
  given('que Ana y Bea comparten la lista con "Casa Lucio" y "Gyoza Bar" pendientes y "Sobrino de Botín" visitado', () => {
    mockAuth = { user: { uid: 'ana' }, userId: 'ana', listId: 'L1', skipMode: false };
    mockMiembros = [
      { userId: 'ana', email: 'ana@x.com', displayName: 'Ana' },
      { userId: 'bea', email: 'bea@x.com', displayName: 'Bea' },
    ];
    mockRestaurantes = [
      sitio('a', 'Casa Lucio', false, 'ana'),
      sitio('b', 'Gyoza Bar', false, 'ana'),
      { ...sitio('c', 'Sobrino de Botín', true, 'bea'), pricePerPerson: 20 },
    ];
  });

// Los miembros de la lista llegan de forma asincrona.
const abrir = async (ui: React.ReactElement) => {
  render(ui);
  await act(async () => {});
};
const fondo = (label: string) => StyleSheet.flatten(screen.getByLabelText(label).props.style)?.backgroundColor;

defineFeature(feature, (test) => {
  test('El mapa solo lleva el buscador, los filtros, guardar y mi ubicación', ({ given, when, then, and }) => {
    sinCuenta(given);
    when('abre el mapa', () => abrir(<HomeScreen />));
    then('ve el buscador "Buscar en esta zona" y los filtros "Todos", "Pendientes" y "Visitados" en ese orden', () => {
      expect(screen.getByPlaceholderText('Buscar en esta zona')).toBeTruthy();
      const filtros = screen.getAllByLabelText(/^Filtrar: /).map((n) => n.props.accessibilityLabel);
      expect(filtros).toEqual(['Filtrar: Todos', 'Filtrar: Pendientes', 'Filtrar: Visitados']);
    });
    and('puede guardar un restaurante y volver a su ubicación', () => {
      expect(screen.getByLabelText('Guardar restaurante')).toBeTruthy();
      expect(screen.getByLabelText('Ir a mi ubicacion')).toBeTruthy();
    });
    and('no hay botón de perfil, de expandir el mapa ni la tarjeta de "¿Dónde cenamos hoy?"', () => {
      expect(screen.queryByLabelText('Perfil')).toBeNull();
      expect(screen.queryByLabelText('Expandir mapa')).toBeNull();
      expect(screen.queryByText('Explorar mapa')).toBeNull();
      expect(screen.queryByText('¿Dónde cenamos hoy?')).toBeNull();
    });
  });

  test('El filtro elegido va en tinta, no en terracota', ({ given, when, then }) => {
    sinCuenta(given);
    when('abre el mapa', () => abrir(<HomeScreen />));
    then('el filtro "Todos" va en tinta y los demás en blanco', () => {
      expect(fondo('Filtrar: Todos')).toBe(palette.light['text-primary']);
      expect(fondo('Filtrar: Pendientes')).toBe(palette.light.surface);
      expect(fondo('Filtrar: Visitados')).toBe(palette.light.surface);
    });
  });

  test('Con pareja, el buscador enseña a los dos', ({ given, when, then }) => {
    enPareja(given);
    when('Ana abre el mapa', () => abrir(<HomeScreen />));
    then('el buscador enseña las iniciales "A" y "B"', () => {
      const iniciales = screen.getAllByTestId('avatar').map((n) => n.props.children);
      expect(iniciales).toEqual(['A', 'B']);
    });
  });

  test('Sin pareja, la lista es tuya', ({ given, when, then }) => {
    sinCuenta(given);
    when('abre la lista', () => abrir(<ListScreen />));
    then('el título es "Tu lista"', () => {
      expect(screen.getByText('Tu lista')).toBeTruthy();
      expect(screen.queryByText('Vuestra lista')).toBeNull();
    });
  });

  test('Con pareja, la lista es vuestra y abre con la decisión de la cena', ({ given, when, then, and }) => {
    enPareja(given);
    when('Ana abre la lista', () => abrir(<ListScreen />));
    then('el título es "Vuestra lista"', () => {
      expect(screen.getByText('Vuestra lista')).toBeTruthy();
    });
    and('arriba está "¿Dónde cenamos hoy?" con "2 pendientes · votad sin ver lo del otro"', () => {
      expect(screen.getByText('¿Dónde cenamos hoy?')).toBeTruthy();
      expect(screen.getByText('2 pendientes · votad sin ver lo del otro')).toBeTruthy();
    });
    and('la tarjeta de "Sobrino de Botín" dice "Visitado", "★ 4 · €€ · Calle Mayor 1, Madrid" y "Guardado por Bea"', () => {
      const tarjeta = within(screen.getByLabelText(/^Sobrino de Botín, /));
      expect(tarjeta.getByText('Visitado')).toBeTruthy();
      expect(tarjeta.getByText('★ 4 · €€ · Calle Mayor 1, Madrid')).toBeTruthy();
      expect(tarjeta.getByText('Guardado por Bea')).toBeTruthy();
    });
  });

  test('Buscar algo que no está no cierra el teclado', ({ given, when, then, and }) => {
    let buscador: any;
    sinCuenta(given);
    when(/^abre la lista y busca "(.*)"$/, async (texto: string) => {
      await abrir(<ListScreen />);
      buscador = screen.getByPlaceholderText('Buscar...');
      fireEvent.changeText(buscador, texto);
    });
    then(/^ve "(.*)"$/, (texto: string) => {
      expect(screen.getByText(texto)).toBeTruthy();
    });
    and('sigue escribiendo en el mismo buscador, sin que se cierre el teclado', () => {
      // Si la pantalla cambia de lista a "vacio" y vuelve a montar el campo, el teclado se cierra a mitad de palabra.
      expect(screen.getByPlaceholderText('Buscar...')).toBe(buscador);
    });
  });
});
