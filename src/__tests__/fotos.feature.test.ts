// Acceptance: features/fotos.feature (ADD-04 del plan E2E). imageService real; manipulador de imágenes, Storage y fetch simulados.
jest.mock('../config/firebase', () => ({ storage: {} }));
jest.mock('expo-image-picker', () => ({}));
jest.mock('expo-image-manipulator', () => ({ manipulateAsync: jest.fn(), SaveFormat: { JPEG: 'jpeg' } }));
jest.mock('firebase/storage', () => ({ ref: jest.fn(), uploadBytes: jest.fn(), getDownloadURL: jest.fn() }));

import { defineFeature, loadFeature } from 'jest-cucumber';
import * as ImageManipulator from 'expo-image-manipulator';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { uploadPhotos } from '../services/imageService';

const feature = loadFeature('features/fotos.feature');
const manipular = ImageManipulator.manipulateAsync as jest.Mock;
const refMock = ref as jest.Mock;
const subir = uploadBytes as jest.Mock;
const descargar = getDownloadURL as jest.Mock;
const fetchMock = jest.fn();

const UID = 'uid-ana';
const REST = 'rest-1';
const original = (i: number) => `file:///galeria/original-${i}.jpg`;
const reducida = (i: number) => `file:///cache/reducida-${i}.jpg`;

beforeEach(() => {
  jest.resetAllMocks();
  // La foto i se reduce a otra ruta distinta: así se ve cuál de las dos acaba en Storage.
  manipular.mockImplementation(async (uri: string) => ({ uri: uri.replace('/galeria/original-', '/cache/reducida-') }));
  fetchMock.mockImplementation(async (uri: string) => ({ blob: async () => ({ vieneDe: uri }) }));
  (globalThis as any).fetch = fetchMock;
  refMock.mockImplementation((_storage: unknown, path: string) => ({ path }));
  subir.mockResolvedValue({});
  descargar.mockImplementation(async (r: { path: string }) => `https://cdn/${r.path}`);
});

defineFeature(feature, (test) => {
  let fotos: string[];
  let resultado: string[] | undefined;
  let error: Error | undefined;

  const unaFoto = (given: any) =>
    given('que Ana ha elegido una foto de la galería', () => {
      fotos = [original(0)];
    });

  const sube = (when: any) =>
    when(/^Bite sube (?:la|las) fotos? de "(.*)" con la cuenta de Ana$/, async () => {
      resultado = await uploadPhotos(fotos, UID, REST).catch((e) => {
        error = e;
        return undefined;
      });
    });

  test('La foto se reduce antes de subirla', ({ given, when, then }) => {
    unaFoto(given);
    sube(when);
    then('antes de subir la foto se reduce a 800 píxeles de ancho en JPEG con calidad 0,7', () => {
      expect(manipular).toHaveBeenCalledWith(original(0), [{ resize: { width: 800 } }], { compress: 0.7, format: 'jpeg' });
      expect(manipular.mock.invocationCallOrder[0]).toBeLessThan(subir.mock.invocationCallOrder[0]);
    });
  });

  test('Se sube la versión reducida, no el original', ({ given, when, then }) => {
    unaFoto(given);
    sube(when);
    then('lo que llega a Storage es la foto ya reducida y no la original', () => {
      expect(fetchMock).toHaveBeenCalledWith(reducida(0));
      expect(fetchMock).not.toHaveBeenCalledWith(original(0));
      expect(subir).toHaveBeenCalledTimes(1);
      expect(subir.mock.calls[0][1]).toEqual({ vieneDe: reducida(0) });
    });
  });

  test('Cada foto va a su sitio y se devuelven en orden', ({ given, when, then, and }) => {
    given(/^que Ana ha elegido (\d+) fotos de la galería$/, (n: string) => {
      fotos = Array.from({ length: Number(n) }, (_, i) => original(i));
    });
    sube(when);
    then(/^las (\d+) fotos se guardan en las rutas "(.*)", "(.*)" y "(.*)"$/, (n: string, a: string, b: string, c: string) => {
      expect(refMock.mock.calls.map((x) => x[1])).toEqual([a, b, c]);
      expect(subir).toHaveBeenCalledTimes(Number(n));
    });
    and('las direcciones de descarga se devuelven en el mismo orden', () => {
      expect(resultado).toEqual([
        'https://cdn/photos/uid-ana/rest-1_0.jpg',
        'https://cdn/photos/uid-ana/rest-1_1.jpg',
        'https://cdn/photos/uid-ana/rest-1_2.jpg',
      ]);
    });
  });

  test('Si falla la reducción, no se sube nada', ({ given, when, then, and }) => {
    unaFoto(given);
    and('que el reductor de imágenes falla', () => {
      manipular.mockRejectedValue(new Error('no se pudo reducir'));
    });
    sube(when);
    then('la subida falla con un aviso y no llega nada a Storage', () => {
      expect(error).toBeInstanceOf(Error);
      expect(error!.message).toMatch(/reducir/);
      expect(resultado).toBeUndefined();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(subir).not.toHaveBeenCalled();
    });
  });
});
