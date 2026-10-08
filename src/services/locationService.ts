import * as Location from 'expo-location';

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export type LocationOutcome =
  | { ok: true; coords: { latitude: number; longitude: number } }
  // permission: el usuario no dio permiso. unavailable: lo dio, pero no se pudo obtener la posicion.
  | { ok: false; reason: 'permission' | 'unavailable' };

export async function getLocationOutcome(): Promise<LocationOutcome> {
  let granted: boolean;
  try {
    granted = await requestLocationPermission();
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
  if (!granted) return { ok: false, reason: 'permission' };

  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { ok: true, coords: { latitude: location.coords.latitude, longitude: location.coords.longitude } };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const results = await Location.reverseGeocodeAsync({ latitude, longitude });
  if (results.length === 0) return null;

  const addr = results[0];
  const streetPart = [addr.street, addr.streetNumber].filter(Boolean).join(' ');
  const cityPart = [addr.district, addr.subregion, addr.city, addr.postalCode]
    .filter(Boolean)
    .join(' ');
  return [streetPart, cityPart].filter(Boolean).join(', ') || null;
}

export async function reverseGeocodeCity(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const results = await Location.reverseGeocodeAsync({ latitude, longitude });
  if (results.length === 0) return null;
  return results[0].city || results[0].region || null;
}
