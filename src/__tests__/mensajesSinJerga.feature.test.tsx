// Acceptance: features/mensajes-sin-jerga.feature (UX-01..UX-03 del plan E2E). utils/userError real, HomeScreen real con
// los restaurantes simulados, y una revision estatica de los textos de src/.
import fs from 'fs';
import path from 'path';
import { defineFeature, loadFeature } from 'jest-cucumber';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('expo-image', () => ({ Image: require('react-native').View }));
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { __esModule: true, default: React.forwardRef(() => <View />), Marker: () => null };
});
jest.mock('react-native-map-clustering', () => {
  const React = require('react');
  const { View } = require('react-native');
  return React.forwardRef(() => <View />);
});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));
jest.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: null, userId: 'device-ana', listId: 'local', skipMode: true }) }));
let mockError: string | null = null;
jest.mock('../hooks/useRestaurants', () => ({
  useRestaurants: () => ({ restaurants: [], loading: false, error: mockError }),
}));
jest.mock('../hooks/useLocation', () => ({
  useLocation: () => ({ latitude: null, longitude: null, loading: false, error: null, errorKind: null, refresh: jest.fn() }),
}));
jest.mock('firebase/firestore', () => require('../../jest/fakeFirestore'));
jest.mock('../config/firebase', () => ({ db: {} }));
jest.mock('../services/listService', () => ({ ...jest.requireActual('../services/listService'), getListMembers: async () => [] }));
jest.mock('../hooks/useNavigationETA', () => ({ useNavigationETA: () => ({ eta: null }) }));

import { render, screen } from '@testing-library/react-native';
import HomeScreen from '../screens/HomeScreen';
import { friendlyMessage } from '../utils/userError';
import { joinListByCode } from '../services/listService';

const feature = loadFeature('features/mensajes-sin-jerga.feature');

// Textos entre comillas de src/ que no son pruebas, configuracion ni registros de consola.
function textosDeLaApp(): Array<{ file: string; text: string }> {
  const raiz = path.join(__dirname, '..');
  const out: Array<{ file: string; text: string }> = [];
  const visitar = (dir: string) => {
    for (const nombre of fs.readdirSync(dir)) {
      const ruta = path.join(dir, nombre);
      if (fs.statSync(ruta).isDirectory()) {
        if (nombre !== '__tests__' && nombre !== 'config') visitar(ruta);
      } else if (/\.(tsx?|js)$/.test(nombre)) {
        for (const linea of fs.readFileSync(ruta, 'utf8').split('\n')) {
          if (/console\.(log|warn|error)/.test(linea)) continue;
          for (const m of linea.matchAll(/(['"`])((?:(?!\1).)*)\1/g)) out.push({ file: path.relative(raiz, ruta), text: m[2] });
        }
      }
    }
  };
  visitar(raiz);
  return out;
}

function lineasConMensajeDeError(): string[] {
  const raiz = path.join(__dirname, '..');
  const out: string[] = [];
  const visitar = (dir: string) => {
    for (const nombre of fs.readdirSync(dir)) {
      const ruta = path.join(dir, nombre);
      if (fs.statSync(ruta).isDirectory()) {
        if (nombre !== '__tests__') visitar(ruta);
      } else if (/\.(tsx?|js)$/.test(nombre) && !ruta.endsWith(path.join('utils', 'userError.ts'))) {
        fs.readFileSync(ruta, 'utf8').split('\n').forEach((linea, i) => {
          if (/\b(e|err|error)\.message\b/.test(linea) && !/console\.(log|warn|error)/.test(linea)) {
            out.push(`${path.relative(raiz, ruta)}:${i + 1}`);
          }
        });
      }
    }
  };
  visitar(raiz);
  return out;
}

defineFeature(feature, (test) => {
  test('Ningún texto de la app menciona claves ni la API', ({ given, when, then, and }) => {
    let textos: Array<{ file: string; text: string }> = [];
    let menciones: string[] = [];
    given('todos los textos que Bite puede enseñar en pantalla', () => {
      textos = textosDeLaApp();
      expect(textos.length).toBeGreaterThan(100);
    });
    when('se buscan menciones a claves o a la API', () => {
      menciones = textos
        .filter((t) => /api[ _-]?key|la api\b|clave de (la )?api|clave de google/i.test(t.text))
        .map((t) => `${t.file}: ${t.text}`);
    });
    then('no aparece ninguna', () => {
      expect(menciones).toEqual([]);
    });
    and('ningún error técnico pasa su mensaje a la pantalla sin traducir', () => {
      // `.message` de un error solo se lee en utils/userError (friendlyMessage) o para el registro de consola.
      expect(lineasConMensajeDeError()).toEqual([]);
    });
  });

  test('Un error inesperado se explica sin detalles técnicos', ({ given, when, then }) => {
    let error: unknown;
    let mensaje = '';
    given(/^que guardar falla con "(.*)"$/, (texto: string) => {
      error = new Error(texto);
    });
    when('Bite decide qué decirle a Ana', () => {
      mensaje = friendlyMessage(error, 'Inténtalo de nuevo en un momento.');
    });
    then(/^le dice "(.*)"$/, (esperado: string) => {
      expect(mensaje).toBe(esperado);
    });
  });

  test('Un error pensado para Ana se muestra tal cual', ({ given, when, then }) => {
    let error: unknown;
    let mensaje = '';
    given('que unirse a una lista falla porque el código no existe', async () => {
      // listService real contra Firestore en memoria vacio: ninguna lista tiene ese codigo.
      error = await joinListByCode('bea', 'ZZZZZZ').then(() => null, (e) => e);
      expect(error).toBeTruthy();
    });
    when('Bite decide qué decirle a Ana', () => {
      mensaje = friendlyMessage(error, 'Revisa el código e inténtalo de nuevo.');
    });
    then(/^le dice "(.*)"$/, (esperado: string) => {
      expect(mensaje).toBe(esperado);
    });
  });

  test('Si no cargan los restaurantes, el mapa lo explica sin detalles técnicos', ({ given, when, then, and }) => {
    given(/^que cargar los restaurantes falla con "(.*)"$/, (texto: string) => {
      mockError = texto;
    });
    when('Ana abre el mapa', () => {
      render(<HomeScreen />);
    });
    then(/^ve "(.*)"$/, (texto: string) => {
      expect(screen.getByText(texto)).toBeTruthy();
    });
    and(/^no ve "(.*)"$/, (texto: string) => {
      expect(screen.queryByText(new RegExp(texto))).toBeNull();
    });
  });
});
