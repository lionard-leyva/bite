import * as Location from 'expo-location';

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  const granted = await requestLocationPermission();
  if (!granted) return null;

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
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
