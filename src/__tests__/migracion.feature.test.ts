// Acceptance: features/migracion.feature (PRF-03 del plan E2E). Almacenamiento local real con AsyncStorage en memoria,
// Firestore en memoria y saveRestaurant real; solo la subida de fotos va simulada.
jest.mock('firebase/firestore', () => require('../../jest/fakeFirestore'));
jest.mock('../config/firebase', () => ({ db: {} }));
jest.mock('../services/imageService', () => ({ uploadPhotos: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: async (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: async (k: string, v: string) => void store.set(k, v),
      removeItem: async (k: string) => void store.delete(k),
    },
  };
});

import { defineFeature, loadFeature } from 'jest-cucumber';
import * as fs from '../../jest/fakeFirestore';
import { uploadPhotos } from '../services/imageService';
import { saveLocalRestaurant, getLocalRestaurants, clearLocalRestaurants } from '../services/localStorageService';
import { migrateLocalRestaurants } from '../services/migrationService';
import type { Restaurant } from '../types';

const fake = fs as any;
const feature = loadFeature('features/migracion.feature');
const upload = uploadPhotos as jest.Mock;

const UID = 'uid-firebase-ana';
const DEVICE = 'device-abc123';

const local = (id: string, name: string, over: Partial<Restaurant> = {}): Restaurant => ({
  id,
  name,
  address: `Calle de ${name}, 1`,
  latitude: 40.41,
  longitude: -3.7,
  rating: 4,
  note: `nota de ${name}`,
  photoURL: null,
  photoURLs: [],
  visited: false,
  pricePerPerson: 25,
  createdBy: DEVICE,
  createdAt: new Date('2026-01-01T10:00:00Z'),
  updatedAt: new Date('2026-01-01T10:00:00Z'),
  listId: 'local',
  ...over,
});

const FOTOS = ['file:///a.jpg', 'file:///b.jpg'];
const flush = () => new Promise((r) => setImmediate(r));
const enLaCuenta = async (listId = 'L1') =>
  (await fake.getDocs(fake.query(fake.collection({}, 'restaurants'), fake.where('listId', '==', listId)))).docs.map((d: any) =>
    d.data(),
  );

beforeEach(async () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {}); // saveRestaurant traza cada guardado
  fake.__reset();
  upload.mockReset();
  upload.mockImplementation(async (uris: string[]) => uris.map((u) => `https://cdn/${u.split('/').pop()}`));
  await clearLocalRestaurants();
});

defineFeature(feature, (test) => {
  let migrados: number;
  let error: Error | undefined;

  const antecedentes = (given: any) =>
    given(
      'que Ana usaba Bite sin cuenta y guardó "Casa Lucio" visitado con 2 fotos, "Taco" pendiente sin fotos y "Gyoza" pendiente',
      async () => {
        await saveLocalRestaurant(local('l1', 'Casa Lucio', { visited: true, photoURLs: FOTOS, photoURL: FOTOS[0] }));
        await saveLocalRestaurant(local('l2', 'Taco'));
        await saveLocalRestaurant(local('l3', 'Gyoza'));
      },
    );

  const migra = (when: any) =>
    when('Ana migra lo guardado en el móvil a su lista con su cuenta nueva', async () => {
      migrados = await migrateLocalRestaurants({ userId: UID, listId: 'L1' });
      await flush();
    });

  test('Ana migra sus restaurantes a su cuenta nueva', ({ given, when, then, and }) => {
    antecedentes(given);
    migra(when);
    then('su lista de la cuenta tiene los 3 restaurantes con su nombre, dirección, nota, valoración, precio y estado', async () => {
      const docs = await enLaCuenta();
      expect(docs).toHaveLength(3);
      const porNombre = Object.fromEntries(docs.map((d: any) => [d.name, d]));
      expect(porNombre['Casa Lucio']).toMatchObject({
        address: 'Calle de Casa Lucio, 1', note: 'nota de Casa Lucio', rating: 4, pricePerPerson: 25, visited: true,
      });
      expect(porNombre.Taco).toMatchObject({ visited: false });
      expect(porNombre.Gyoza).toMatchObject({ visited: false });
    });
    and('todos quedan a nombre de su cuenta y no del dispositivo', async () => {
      for (const d of await enLaCuenta()) expect(d.createdBy).toBe(UID);
    });
    and(/^Ana ve que se han migrado (\d+)$/, (n: string) => {
      expect(migrados).toBe(Number(n));
    });
  });

  test('Con muchos restaurantes se migran todos', ({ given, when, then, and }) => {
    antecedentes(given);
    given(/^que Ana además guardó otros (\d+) restaurantes sin cuenta$/, async (n: string) => {
      for (let i = 0; i < Number(n); i++) await saveLocalRestaurant(local(`x${i}`, `Extra ${i}`));
    });
    migra(when);
    then(/^su lista de la cuenta tiene (\d+) restaurantes$/, async (n: string) => {
      expect(await enLaCuenta()).toHaveLength(Number(n));
    });
    and(/^Ana ve que se han migrado (\d+)$/, (n: string) => {
      expect(migrados).toBe(Number(n));
    });
  });

  test('Las fotos locales se suben con la cuenta nueva', ({ given, when, then, and }) => {
    antecedentes(given);
    migra(when);
    then(/^las (\d+) fotos de "(.*)" se suben con su cuenta nueva$/, async (n: string) => {
      const llamada = upload.mock.calls.find((c: any[]) => c[0].length === Number(n));
      expect(llamada).toBeDefined();
      expect(llamada![0]).toEqual(FOTOS);
      expect(llamada![1]).toBe(UID);
      const lucio = (await enLaCuenta()).find((d: any) => d.name === 'Casa Lucio');
      expect(lucio.photoURLs).toEqual(['https://cdn/a.jpg', 'https://cdn/b.jpg']);
    });
    and(/^"(.*)" no sube ninguna foto$/, () => {
      expect(upload).toHaveBeenCalledTimes(1);
    });
  });

  test('Tras migrar no quedan datos en el móvil', ({ given, when, then }) => {
    antecedentes(given);
    migra(when);
    then('en el móvil ya no queda ningún restaurante guardado', async () => {
      expect(await getLocalRestaurants()).toEqual([]);
    });
  });

  test('Si no se puede determinar su lista, no se pierde nada del móvil', ({ given, when, then, and }) => {
    antecedentes(given);
    when('Ana intenta migrar sin que se haya determinado su lista', async () => {
      error = await migrateLocalRestaurants({ userId: UID, listId: '' }).then(
        () => undefined,
        (e) => e,
      );
    });
    then('la migración falla con un aviso', () => {
      expect(error).toBeInstanceOf(Error);
      expect(error!.message).toMatch(/lista/i);
    });
    and(/^en el móvil siguen sus (\d+) restaurantes$/, async (n: string) => {
      expect(await getLocalRestaurants()).toHaveLength(Number(n));
    });
    and('su cuenta no recibe ninguno', async () => {
      expect(await enLaCuenta('')).toHaveLength(0);
      expect(await enLaCuenta('L1')).toHaveLength(0);
    });
  });
});
