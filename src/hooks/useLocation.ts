import { useState, useEffect } from 'react';
import { getCurrentLocation, reverseGeocode } from '../services/locationService';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  loading: boolean;
  error: string | null;
}

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    address: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      const coords = await getCurrentLocation();
      if (cancelled) return;

      if (!coords) {
        setState((s) => ({
          ...s,
          loading: false,
          error: 'No se pudo obtener la ubicacion',
        }));
        return;
      }

      const address = await reverseGeocode(coords.latitude, coords.longitude);
      if (cancelled) return;

      setState({
        latitude: coords.latitude,
        longitude: coords.longitude,
        address,
        loading: false,
        error: null,
      });
    }

    fetch();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
