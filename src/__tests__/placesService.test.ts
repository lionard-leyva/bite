// placesService: el movil pide los sitios a nuestro servidor (nunca a Google con una clave propia) y le pasa la sesion de Firebase.
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: { DIRECTIONS_PROXY_URL: 'https://api.bite.test/api/directions' } } } }));
let mockUser: { getIdToken: () => Promise<string> } | null = null;
jest.mock('../config/firebase', () => ({
  get auth() {
    return { currentUser: mockUser };
  },
}));

import { searchPlaces, searchAddresses, placeDetails, newSessionToken } from '../services/placesService';

const MADRID = { latitude: 40.4168, longitude: -3.7038 };
const fetchMock = jest.fn();

function responde(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce({ ok: status >= 200 && status < 300, status, json: async () => body });
}

beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  mockUser = { getIdToken: async () => 'token-de-ana' };
});

test('busca restaurantes en nuestro servidor, cerca de Ana, con su sesion de Firebase', async () => {
  responde(200, { suggestions: [{ id: 'p1', name: 'Los Horizontes', secondary: 'Madrid', distanceMeters: 1200 }] });
  const r = await searchPlaces('Los horiz', MADRID, 'sesion-1');

  expect(r).toEqual([{ id: 'p1', name: 'Los Horizontes', secondary: 'Madrid', distanceMeters: 1200 }]);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('https://api.bite.test/api/places/autocomplete');
  expect(init.method).toBe('POST');
  expect(init.headers.Authorization).toBe('Bearer token-de-ana');
  expect(JSON.parse(init.body)).toEqual({ input: 'Los horiz', origin: MADRID, sessionToken: 'sesion-1', kind: 'restaurant' });
});

test('las direcciones se piden al mismo servidor como tipo direccion', async () => {
  responde(200, { suggestions: [] });
  await searchAddresses('Felipe II 12', null, 'sesion-2');
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ input: 'Felipe II 12', origin: null, sessionToken: 'sesion-2', kind: 'address' });
});

test('sin sesion de Firebase no manda cabecera de autorizacion', async () => {
  mockUser = null;
  responde(200, { suggestions: [] });
  await searchPlaces('Los horiz', MADRID, 's');
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
});

test('el detalle trae nombre, direccion, ciudad y coordenadas', async () => {
  responde(200, { name: 'Los Horizontes', address: 'Av. de Felipe II 12, Madrid', city: 'Madrid', latitude: 40.4297, longitude: -3.6745 });
  const d = await placeDetails('p1', 'sesion-1');
  expect(d).toEqual({ name: 'Los Horizontes', address: 'Av. de Felipe II 12, Madrid', city: 'Madrid', latitude: 40.4297, longitude: -3.6745 });
  expect(fetchMock.mock.calls[0][0]).toBe('https://api.bite.test/api/places/details');
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ placeId: 'p1', sessionToken: 'sesion-1' });
});

test('un detalle sin coordenadas validas es un fallo, nunca un sitio inventado', async () => {
  responde(200, { name: 'X', address: '', latitude: null, longitude: null });
  await expect(placeDetails('p1', 's')).rejects.toThrow();
});

test('si el servidor contesta con error, la busqueda falla', async () => {
  responde(503, { error: 'cuota' });
  await expect(searchPlaces('Los horiz', MADRID, 's')).rejects.toThrow();
});

test('si no hay red, la busqueda falla', async () => {
  fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
  await expect(searchPlaces('Los horiz', MADRID, 's')).rejects.toThrow();
});

test('cada busqueda nueva tiene su propia sesion', () => {
  const a = newSessionToken();
  const b = newSessionToken();
  expect(a).toMatch(/^[0-9a-f-]{20,}$/);
  expect(a).not.toBe(b);
});
