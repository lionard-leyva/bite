// Acceptance: features/ubicacion-denegada.feature (LOC-02 del plan E2E). useLocation, locationService, las reglas del
// aviso y el componente LocationNotice reales; solo expo-location y Linking.openSettings simulados. Proyecto "components".
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

import { Linking } from 'react-native';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { defineFeature, loadFeature } from 'jest-cucumber';
import * as Location from 'expo-location';
import { useLocation } from '../hooks/useLocation';
import LocationNotice from '../components/LocationNotice';
import { locationNotice, locationButtonState } from '../utils/locationNotice';

const feature = loadFeature('features/ubicacion-denegada.feature');
const permiso = Location.requestForegroundPermissionsAsync as jest.Mock;
const posicion = Location.getCurrentPositionAsync as jest.Mock;
const geocodificar = Location.reverseGeocodeAsync as jest.Mock;

const MADRID = { latitude: 40.4168, longitude: -3.7038 };

beforeEach(() => {
  jest.resetAllMocks();
  geocodificar.mockResolvedValue([{ street: 'Calle Mayor', streetNumber: '1', city: 'Madrid', postalCode: '28013' }]);
  jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
});

defineFeature(feature, (test) => {
  let hook: ReturnType<typeof renderHook<ReturnType<typeof useLocation>, unknown>>;
  let pulsado = false; // HomeScreen solo enseña el aviso tras pulsar el botón

  beforeEach(() => {
    pulsado = false;
  });

  const denegado = (given: any) =>
    given('que Ana ha denegado el permiso de ubicación', () => {
      permiso.mockResolvedValue({ status: 'denied' });
    });

  const sinSenal = (given: any) =>
    given('que Ana ha concedido el permiso pero no hay señal GPS', () => {
      permiso.mockResolvedValue({ status: 'granted' });
      posicion.mockRejectedValue(new Error('Current location is unavailable'));
    });

  const intenta = (when: any) =>
    when('Bite intenta localizarla', async () => {
      hook = renderHook(() => useLocation());
      await waitFor(() => expect(hook.result.current.loading).toBe(false));
    });

  const intentaSinPulsar = (when: any) =>
    when('Bite intenta localizarla sin que Ana haya pulsado el botón', async () => {
      hook = renderHook(() => useLocation());
      await waitFor(() => expect(hook.result.current.loading).toBe(false));
    });

  let cerrado = jest.fn();
  const pulsaYFalla = (when: any) =>
    when('Ana pulsa "Ir a mi ubicación" y Bite no puede localizarla', async () => {
      hook = renderHook(() => useLocation());
      await waitFor(() => expect(hook.result.current.loading).toBe(false));
      pulsado = true;
      const aviso = locationNotice(hook.result.current.errorKind, pulsado);
      cerrado = jest.fn(() => {
        pulsado = false;
      });
      if (aviso) render(<LocationNotice notice={aviso} onDismiss={cerrado} />);
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
    and('Bite sabe que el motivo es el permiso', () => {
      expect(hook.result.current.errorKind).toBe('permission');
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
      expect(hook.result.current).toMatchObject({ ...MADRID, error: null, errorKind: null, loading: false });
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
    and('Bite sabe que el motivo es que no se pudo localizar, no el permiso', () => {
      expect(hook.result.current.errorKind).toBe('unavailable');
    });
  });

  test('Con permiso pero sin señal, el motivo es otro', ({ given, when, then, and }) => {
    sinSenal(given);
    intenta(when);
    sinPosicion(then);
    and('Bite sabe que el motivo es que no se pudo localizar, no el permiso', () => {
      expect(hook.result.current.errorKind).toBe('unavailable');
    });
  });

  test('Sin permiso, el aviso explica qué hacer y ofrece abrir Ajustes', ({ given, when, then, and }) => {
    denegado(given);
    pulsaYFalla(when);
    then(/^ve el aviso "(.*)"$/, (mensaje: string) => {
      expect(screen.getByText(mensaje)).toBeTruthy();
    });
    and('al tocar "Abrir Ajustes" se abren los Ajustes del sistema', () => {
      fireEvent.press(screen.getByText('Abrir Ajustes'));
      expect(Linking.openSettings).toHaveBeenCalledTimes(1);
    });
  });

  test('Sin señal, el aviso es distinto y no manda a Ajustes', ({ given, when, then, and }) => {
    sinSenal(given);
    pulsaYFalla(when);
    then(/^ve el aviso "(.*)"$/, (mensaje: string) => {
      expect(screen.getByText(mensaje)).toBeTruthy();
    });
    and('el aviso no ofrece abrir los Ajustes', () => {
      expect(screen.queryByText('Abrir Ajustes')).toBeNull();
    });
  });

  test('El aviso no molesta hasta que Ana pulsa el botón', ({ given, when, then }) => {
    denegado(given);
    intentaSinPulsar(when);
    then('no se muestra ningún aviso', () => {
      expect(hook.result.current.errorKind).toBe('permission');
      expect(locationNotice(hook.result.current.errorKind, pulsado)).toBeNull();
    });
  });

  test('El aviso se puede cerrar', ({ given, when, then, and }) => {
    denegado(given);
    pulsaYFalla(when);
    and('Ana cierra el aviso', () => {
      fireEvent.press(screen.getByLabelText('Cerrar aviso de ubicacion'));
    });
    then('el aviso desaparece', () => {
      expect(cerrado).toHaveBeenCalledTimes(1);
      expect(locationNotice(hook.result.current.errorKind, pulsado)).toBeNull();
    });
  });

  test('Con el permiso denegado, el botón avisa de que la ubicación está desactivada', ({ given, when, then, but }) => {
    denegado(given);
    intentaSinPulsar(when);
    then(/^el botón se ve atenuado y se anuncia como "(.*)"$/, (etiqueta: string) => {
      expect(locationButtonState(hook.result.current.errorKind)).toEqual({ label: etiqueta, dimmed: true });
    });
    but(/^con el permiso concedido el botón se anuncia como "(.*)" y se ve normal$/, (etiqueta: string) => {
      expect(locationButtonState(null)).toEqual({ label: etiqueta, dimmed: false });
    });
  });
});
