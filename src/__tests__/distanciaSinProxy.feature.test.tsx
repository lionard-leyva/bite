// Acceptance: features/distancia-sin-proxy.feature (MAP-05 del plan E2E). useNavigationETA y navigationService reales;
// solo `fetch` simulado. Proyecto Jest "components". Cada escenario usa ids de restaurante nuevos: la caché de ETA
// de navigationService vive en el módulo y entre escenarios se contaminaría.
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { useNavigationETA } from '../hooks/useNavigationETA';

const feature = loadFeature('features/distancia-sin-proxy.feature');
const fetchMock = jest.fn();

type Props = Parameters<typeof useNavigationETA>[0];

const ANA = { userLat: 40.4168, userLng: -3.7038 }; // Madrid
const DESTINO = { destLat: 40.4268, destLng: -3.7038 }; // 0,01° al norte: 1,1 km en línea recta

let escenario = 0;
const props = (nombre: 'Casa Lucio' | 'Taco', ubicada = true): Props => ({
  restaurantId: `${nombre}-${escenario}`,
  ...DESTINO,
  userLat: ubicada ? ANA.userLat : null,
  userLng: ubicada ? ANA.userLng : null,
});

const respuesta = (minutos: number) => ({
  ok: true,
  json: async () => ({ distanceKm: 1.2, durationMinutes: minutos }),
});

beforeEach(() => {
  escenario += 1;
  fetchMock.mockReset();
  (globalThis as any).fetch = fetchMock;
});
afterEach(() => jest.useRealTimers());

const flush = () => act(async () => {});

defineFeature(feature, (test) => {
  let hook: ReturnType<typeof renderHook<ReturnType<typeof useNavigationETA>, Props>>;
  let ubicada = true;
  let pendientes: Array<{ resolve: (r: unknown) => void }> = [];

  const antecedentes = (given: any) =>
    given('que Ana está en Madrid y "Casa Lucio" queda a 1,1 km en línea recta', () => {
      ubicada = true;
      pendientes = [];
    });

  const tocaLucio = (when: any) =>
    when('Ana toca "Casa Lucio" en el mapa', async () => {
      hook = renderHook((p: Props) => useNavigationETA(p), { initialProps: props('Casa Lucio', ubicada) });
      await flush();
    });

  const veTexto = (then: any) =>
    then(/^ve "(.*)"$/, async (texto: string) => {
      await waitFor(() => expect(hook.result.current.infoText).toBe(texto));
    });

  const soloDistancia = (then: any) =>
    then(/^ve "(.*)" sin tiempo y no se queda cargando$/, async (texto: string) => {
      await waitFor(() => expect(hook.result.current.etaLoading).toBe(false));
      expect(hook.result.current).toMatchObject({ infoText: texto, eta: null });
    });

  // Respuestas que se resuelven a mano, y que se cancelan si la petición se aborta (como haría fetch de verdad).
  const servidorLento = () =>
    fetchMock.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((resolve, reject) => {
          pendientes.push({ resolve });
          init.signal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );

  test('Con el servidor de rutas funcionando, Ana ve distancia y tiempo', ({ given, when, then }) => {
    antecedentes(given);
    given('que el servidor de rutas responde que son 8 minutos', () => {
      fetchMock.mockResolvedValue(respuesta(8));
    });
    tocaLucio(when);
    veTexto(then);
  });

  test('Con el servidor de rutas caído, Ana sigue viendo la distancia', ({ given, when, then }) => {
    antecedentes(given);
    given('que el servidor de rutas está caído', () => {
      fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    });
    tocaLucio(when);
    soloDistancia(then);
  });

  test('Si el servidor de rutas da error, tampoco se rompe', ({ given, when, then }) => {
    antecedentes(given);
    given('que el servidor de rutas responde con un error', () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'upstream' }) });
    });
    tocaLucio(when);
    soloDistancia(then);
  });

  test('Si el servidor de rutas no contesta, se rinde pasado el tiempo máximo', ({ given, when, then, and }) => {
    antecedentes(given);
    given('que el servidor de rutas no contesta', () => {
      jest.useFakeTimers();
      servidorLento();
    });
    tocaLucio(when);
    then('mientras espera ve la distancia y se indica que está cargando el tiempo', () => {
      expect(hook.result.current).toMatchObject({ infoText: '1.1km', etaLoading: true });
    });
    and(/^pasados (\d+) segundos ve "(.*)" sin tiempo y no se queda cargando$/, async (s: string, texto: string) => {
      await act(async () => {
        jest.advanceTimersByTime(Number(s) * 1000);
      });
      await waitFor(() => expect(hook.result.current.etaLoading).toBe(false));
      expect(hook.result.current).toMatchObject({ infoText: texto, eta: null });
    });
  });

  test('Un fallo no se recuerda: al recuperarse el servidor, Ana ve el tiempo', ({ given, when, then, and }) => {
    antecedentes(given);
    given('que el servidor de rutas está caído', () => {
      fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    });
    tocaLucio(when);
    and(/^el servidor de rutas se recupera y responde que son (\d+) minutos$/, async (m: string) => {
      await waitFor(() => expect(hook.result.current.etaLoading).toBe(false));
      fetchMock.mockReset();
      fetchMock.mockResolvedValue(respuesta(Number(m)));
    });
    and('Ana toca otro sitio y vuelve a "Casa Lucio"', async () => {
      hook.rerender(props('Taco'));
      await flush();
      hook.rerender(props('Casa Lucio'));
      await flush();
    });
    veTexto(then);
  });

  test('Si Ana cambia de sitio antes de que responda, no se mezclan los tiempos', ({ given, when, then, and }) => {
    antecedentes(given);
    given('que el servidor de rutas tarda en contestar', () => {
      servidorLento();
    });
    when('Ana toca "Casa Lucio" y enseguida toca "Taco"', async () => {
      hook = renderHook((p: Props) => useNavigationETA(p), { initialProps: props('Casa Lucio') });
      await flush();
      hook.rerender(props('Taco'));
      await flush();
      expect(pendientes).toHaveLength(2);
    });
    and(
      /^el servidor contesta primero lo de "Taco" con (\d+) minutos y después lo de "Casa Lucio" con (\d+)$/,
      async (taco: string, lucio: string) => {
        await act(async () => pendientes[1].resolve(respuesta(Number(taco))));
        await act(async () => pendientes[0].resolve(respuesta(Number(lucio))));
      },
    );
    then(/^Ana ve "(.*)"$/, async (texto: string) => {
      await waitFor(() => expect(hook.result.current.infoText).toBe(texto));
      expect(hook.result.current.infoText).toBe(texto);
    });
  });

  test('Al cambiar de sitio, mientras llega el tiempo nuevo no se ve el del anterior', ({ given, when, then, and }) => {
    antecedentes(given);
    given('que el servidor de rutas responde que son 8 minutos', () => {
      fetchMock.mockResolvedValue(respuesta(8));
    });
    tocaLucio(when);
    and('el servidor de rutas pasa a tardar en contestar', async () => {
      await waitFor(() => expect(hook.result.current.infoText).toBe('1.1km · 8 min'));
      fetchMock.mockReset();
      servidorLento();
    });
    and(/^Ana toca "(.*)"$/, async (nombre: 'Casa Lucio' | 'Taco') => {
      hook.rerender(props(nombre));
      await flush();
    });
    then(/^mientras llega el tiempo de "(.*)" ve "(.*)" sin el tiempo del sitio anterior$/, (_nombre: string, texto: string) => {
      expect(hook.result.current).toMatchObject({ infoText: texto, etaLoading: true, eta: null });
    });
  });

  test('Si el servidor falla en el segundo sitio, no se arrastra el tiempo del primero', ({ given, when, then, and }) => {
    antecedentes(given);
    given('que el servidor de rutas responde que son 8 minutos', () => {
      fetchMock.mockResolvedValue(respuesta(8));
    });
    tocaLucio(when);
    and('el servidor de rutas se cae', async () => {
      await waitFor(() => expect(hook.result.current.infoText).toBe('1.1km · 8 min'));
      fetchMock.mockReset();
      fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    });
    and(/^Ana toca "(.*)"$/, async (nombre: 'Casa Lucio' | 'Taco') => {
      hook.rerender(props(nombre));
      await flush();
    });
    soloDistancia(then);
  });

  test('Sin la ubicación de Ana no hay distancia ni se pregunta al servidor', ({ given, when, then }) => {
    antecedentes(given);
    given('que Bite no sabe dónde está Ana', () => {
      ubicada = false;
    });
    tocaLucio(when);
    then('no ve distancia y no se pregunta al servidor de rutas', () => {
      expect(hook.result.current.infoText).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
