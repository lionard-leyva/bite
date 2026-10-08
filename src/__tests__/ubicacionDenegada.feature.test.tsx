// Acceptance: features/ubicacion-denegada.feature (LOC-02 del plan E2E). useLocation y locationService reales,
// solo expo-location simulado. Proyecto Jest "components" (necesita el renderer de React Native).
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { defineFeature, loadFeature } from 'jest-cucumber';
import * as Location from 'expo-location';
import { useLocation } from '../hooks/useLocation';

const feature = loadFeature('features/ubicacion-denegada.feature');
const permiso = Location.requestForegroundPermissionsAsync as jest.Mock;
const posicion = Location.getCurrentPositionAsync as jest.Mock;
const geocodificar = Location.reverseGeocodeAsync as jest.Mock;

const MADRID = { latitude: 40.4168, longitude: -3.7038 };

beforeEach(() => {
  jest.resetAllMocks();
  geocodificar.mockResolvedValue([{ street: 'Calle Mayor', streetNumber: '1', city: 'Madrid', postalCode: '28013' }]);
});

defineFeature(feature, (test) => {
  let hook: ReturnType<typeof renderHook<ReturnType<typeof useLocation>, unknown>>;

  const denegado = (given: any) =>
    given('que Ana ha denegado el permiso de ubicación', () => {
      permiso.mockResolvedValue({ status: 'denied' });
    });

  const intenta = (when: any) =>
    when('Bite intenta localizarla', async () => {
      hook = renderHook(() => useLocation());
      await waitFor(() => expect(hook.result.current.loading).toBe(false));
    });

  const sinPosicion = (then: any) =>
    then(/^no se calcula ninguna posición y queda el estado "(.*)"$/, (mensaje: string) => {
      expect(hook.result.current).toMatchObject({ latitude: null, longitude: null, error: mensaje });
    });

  test('Con el permiso denegado no se calcula ninguna posición y Bite no se rompe', ({ given, when, then, and }) => {
    denegado(given);
    intenta(when);
    sinPosicion(then);
    and('Bite ni siquiera pide la posición al sistema', () => {
      expect(posicion).not.toHaveBeenCalled();
    });
  });

  test('Si luego concede el permiso, al volver a pulsar se localiza', ({ given, when, then, and }) => {
    denegado(given);
    and('que Bite ya ha intentado localizarla', async () => {
      hook = renderHook(() => useLocation());
      await waitFor(() => expect(hook.result.current.error).not.toBeNull());
    });
    when('Ana concede el permiso y vuelve a pulsar "Ir a mi ubicación"', async () => {
      permiso.mockResolvedValue({ status: 'granted' });
      posicion.mockResolvedValue({ coords: MADRID });
      await act(async () => {
        await hook.result.current.refresh();
      });
    });
    then('Bite la localiza en Madrid y desaparece el estado de error', () => {
      expect(hook.result.current).toMatchObject({ ...MADRID, error: null, loading: false });
    });
  });

  test('Si el sistema falla al pedir el permiso, tampoco se rompe', ({ given, when, then, and }) => {
    let rechazo: unknown = 'sin llamar';
    given('que el sistema falla al pedir el permiso de ubicación', () => {
      permiso.mockRejectedValue(new Error('permissions service unavailable'));
    });
    intenta(when);
    sinPosicion(then);
    and('la petición termina sin lanzar ningún error sin capturar', async () => {
      await act(async () => {
        rechazo = await hook.result.current.refresh().then(
          (v) => v,
          (e) => ({ lanzado: e }),
        );
      });
      expect(rechazo).toBeNull();
    });
  });
});
