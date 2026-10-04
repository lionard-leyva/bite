import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useLocation } from '../hooks/useLocation';
import * as locationService from '../services/locationService';

jest.mock('../services/locationService');

const mocked = locationService as jest.Mocked<typeof locationService>;
const MADRID = { latitude: 40.4659, longitude: -3.6889 };

beforeEach(() => {
  jest.resetAllMocks();
  mocked.reverseGeocode.mockResolvedValue('Plaza Castilla');
  mocked.reverseGeocodeCity.mockResolvedValue('Madrid');
});

describe('useLocation', () => {
  it('request ok: guarda coordenadas, direccion y ciudad y termina de cargar', async () => {
    mocked.getCurrentLocation.mockResolvedValue(MADRID);
    const { result } = renderHook(() => useLocation());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({ ...MADRID, address: 'Plaza Castilla', city: 'Madrid', error: null });
  });

  it('request devuelve null: error y loading=false', async () => {
    mocked.getCurrentLocation.mockResolvedValue(null);
    const { result } = renderHook(() => useLocation());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('No se pudo obtener la ubicacion');
    expect(result.current.latitude).toBeNull();
  });

  it('request rechazada: error y loading=false, sin rechazo sin capturar', async () => {
    mocked.getCurrentLocation.mockRejectedValue(new Error('Current location is unavailable'));
    const { result } = renderHook(() => useLocation());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('No se pudo obtener la ubicacion');
    expect(result.current.latitude).toBeNull();
  });

  it('el geocoding que falla no descarta las coordenadas', async () => {
    mocked.getCurrentLocation.mockResolvedValue(MADRID);
    mocked.reverseGeocode.mockRejectedValue(new Error('no geocoder'));
    mocked.reverseGeocodeCity.mockRejectedValue(new Error('no geocoder'));
    const { result } = renderHook(() => useLocation());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({ ...MADRID, address: null, city: null, error: null });
  });

  it('refresh tras un fallo inicial vuelve a pedir la posicion y limpia el error', async () => {
    mocked.getCurrentLocation.mockRejectedValueOnce(new Error('timeout'));
    const { result } = renderHook(() => useLocation());
    await waitFor(() => expect(result.current.error).not.toBeNull());

    mocked.getCurrentLocation.mockResolvedValueOnce(MADRID);
    let fresh: unknown;
    await act(async () => {
      fresh = await result.current.refresh();
    });

    expect(fresh).toEqual(MADRID);
    expect(result.current).toMatchObject({ ...MADRID, error: null, loading: false });
    expect(mocked.getCurrentLocation).toHaveBeenCalledTimes(2);
  });

  it('refresh que falla conserva la ultima posicion conocida', async () => {
    mocked.getCurrentLocation.mockResolvedValueOnce(MADRID);
    const { result } = renderHook(() => useLocation());
    await waitFor(() => expect(result.current.latitude).toBe(MADRID.latitude));

    mocked.getCurrentLocation.mockRejectedValueOnce(new Error('timeout'));
    let fresh: unknown = 'unset';
    await act(async () => {
      fresh = await result.current.refresh();
    });

    expect(fresh).toBeNull();
    expect(result.current).toMatchObject({ ...MADRID, loading: false });
    expect(result.current.error).toBe('No se pudo obtener la ubicacion');
  });
});
