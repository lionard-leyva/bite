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
  const parts = [addr.street, addr.city].filter(Boolean);
  return parts.join(', ') || null;
}
