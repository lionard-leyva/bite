import { useState, useEffect, useCallback, useRef } from 'react';
import { getLocationOutcome, reverseGeocode, reverseGeocodeCity } from '../services/locationService';
import type { LocationErrorKind } from '../utils/locationNotice';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  city: string | null;
  loading: boolean;
  error: string | null;
  /** Why it failed: no permission (needs Settings) or the position could not be obtained. */
  errorKind: LocationErrorKind | null;
}

export interface Coords {
  latitude: number;
  longitude: number;
}

const LOCATION_ERROR = 'No se pudo obtener la ubicacion';

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    address: null,
    city: null,
    loading: true,
    error: null,
    errorKind: null,
  });
  const mountedRef = useRef(true);
  const requestRef = useRef(0);

  // Only the latest request may touch state; a failed refresh keeps the last known position.
  const refresh = useCallback(async (): Promise<Coords | null> => {
    const requestId = ++requestRef.current;
    const isCurrent = () => mountedRef.current && requestId === requestRef.current;
    setState((s) => ({ ...s, loading: true, error: null, errorKind: null }));

    try {
      const outcome = await getLocationOutcome();
      if (!outcome.ok) {
        if (isCurrent()) {
          setState((s) => ({ ...s, loading: false, error: LOCATION_ERROR, errorKind: outcome.reason }));
        }
        return null;
      }
      const coords = outcome.coords;
      if (!isCurrent()) return coords;

      // Geocoding is cosmetic: its failure must not discard a valid position.
      const [address, city] = await Promise.all([
        reverseGeocode(coords.latitude, coords.longitude).catch(() => null),
        reverseGeocodeCity(coords.latitude, coords.longitude).catch(() => null),
      ]);
      if (!isCurrent()) return coords;

      setState({
        latitude: coords.latitude,
        longitude: coords.longitude,
        address,
        city,
        loading: false,
        error: null,
        errorKind: null,
      });
      return coords;
    } catch {
      if (isCurrent()) {
        setState((s) => ({ ...s, loading: false, error: LOCATION_ERROR, errorKind: 'unavailable' }));
      }
      return null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  return { ...state, refresh };
}
