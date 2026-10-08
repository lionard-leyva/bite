import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useLocation } from '../hooks/useLocation';
import * as locationService from '../services/locationService';

jest.mock('../services/locationService');

const mocked = locationService as jest.Mocked<typeof locationService>;
const MADRID = { latitude: 40.4659, longitude: -3.6889 };
const OK = { ok: true as const, coords: MADRID };

beforeEach(() => {
  jest.resetAllMocks();
  mocked.reverseGeocode.mockResolvedValue('Plaza Castilla');
  mocked.reverseGeocodeCity.mockResolvedValue('Madrid');
});

describe('useLocation', () => {
  it('request ok: guarda coordenadas, direccion y ciudad y termina de cargar', async () => {
    mocked.getLocationOutcome.mockResolvedValue(OK);
    const { result } = renderHook(() => useLocation());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({ ...MADRID, address: 'Plaza Castilla', city: 'Madrid', error: null });
  });

  it('request devuelve null: error y loading=false', async () => {
    mocked.getLocationOutcome.mockResolvedValue({ ok: false, reason: 'unavailable' });
    const { result } = renderHook(() => useLocation());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('No se pudo obtener la ubicacion');
    expect(result.current.latitude).toBeNull();
  });

  it('request rechazada: error y loading=false, sin rechazo sin capturar', async () => {
    mocked.getLocationOutcome.mockRejectedValue(new Error('Current location is unavailable'));
    const { result } = renderHook(() => useLocation());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('No se pudo obtener la ubicacion');
    expect(result.current.latitude).toBeNull();
  });

  it('el geocoding que falla no descarta las coordenadas', async () => {
    mocked.getLocationOutcome.mockResolvedValue(OK);
    mocked.reverseGeocode.mockRejectedValue(new Error('no geocoder'));
    mocked.reverseGeocodeCity.mockRejectedValue(new Error('no geocoder'));
    const { result } = renderHook(() => useLocation());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({ ...MADRID, address: null, city: null, error: null });
  });

  it('refresh tras un fallo inicial vuelve a pedir la posicion y limpia el error', async () => {
    mocked.getLocationOutcome.mockRejectedValueOnce(new Error('timeout'));
    const { result } = renderHook(() => useLocation());
    await waitFor(() => expect(result.current.error).not.toBeNull());

    mocked.getLocationOutcome.mockResolvedValueOnce(OK);
    let fresh: unknown;
    await act(async () => {
      fresh = await result.current.refresh();
    });

    expect(fresh).toEqual(MADRID);
    expect(result.current).toMatchObject({ ...MADRID, error: null, loading: false });
    expect(mocked.getLocationOutcome).toHaveBeenCalledTimes(2);
  });

  it('refresh que falla conserva la ultima posicion conocida', async () => {
    mocked.getLocationOutcome.mockResolvedValueOnce(OK);
    const { result } = renderHook(() => useLocation());
    await waitFor(() => expect(result.current.latitude).toBe(MADRID.latitude));

    mocked.getLocationOutcome.mockRejectedValueOnce(new Error('timeout'));
    let fresh: unknown = 'unset';
    await act(async () => {
      fresh = await result.current.refresh();
    });

    expect(fresh).toBeNull();
    expect(result.current).toMatchObject({ ...MADRID, loading: false });
    expect(result.current.error).toBe('No se pudo obtener la ubicacion');
  });

  it('sin permiso: errorKind es "permission"', async () => {
    mocked.getLocationOutcome.mockResolvedValue({ ok: false, reason: 'permission' });
    const { result } = renderHook(() => useLocation());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({ errorKind: 'permission', error: 'No se pudo obtener la ubicacion', latitude: null });
  });

  it('sin senal o fallo del sistema: errorKind es "unavailable"', async () => {
    mocked.getLocationOutcome.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useLocation());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.errorKind).toBe('unavailable');
  });

  it('al conseguir la posicion errorKind vuelve a null', async () => {
    mocked.getLocationOutcome.mockResolvedValueOnce({ ok: false, reason: 'permission' });
    const { result } = renderHook(() => useLocation());
    await waitFor(() => expect(result.current.errorKind).toBe('permission'));

    mocked.getLocationOutcome.mockResolvedValueOnce(OK);
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current).toMatchObject({ errorKind: null, error: null, ...MADRID });
  });
});
