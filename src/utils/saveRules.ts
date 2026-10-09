import { haversineKm } from './geo';
import { NEAR_RADIUS_KM } from './mapFocus';
import { PLACES_MIN_QUERY_LENGTH } from '../config/constants';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export function shouldSearch(query: string): boolean {
  return query.trim().length >= PLACES_MIN_QUERY_LENGTH;
}

// Lo que falta para poder guardar, en el orden en que se rellena el formulario (null = se puede guardar).
// pinToConfirm: el pin salio en un punto por defecto (no sabemos donde esta Ana) y aun no se ha movido.
export function saveBlocker(f: { name: string; location: LatLng | null; rating: number; pinToConfirm?: boolean }): string | null {
  if (!f.name.trim()) return 'Escribe el nombre del restaurante';
  if (!f.location) return 'Marca dónde está para poder guardar';
  if (f.pinToConfirm) return 'Arrastra el pin hasta el sitio';
  if (f.rating < 1) return 'Elige una valoración';
  return null;
}

// Km entre Ana y el sitio si esta mas lejos de lo normal (null si esta cerca o no sabemos donde esta Ana).
export function farAwayKm(place: LatLng, user: LatLng | null): number | null {
  if (!user) return null;
  const km = haversineKm(user.latitude, user.longitude, place.latitude, place.longitude);
  return km > NEAR_RADIUS_KM ? km : null;
}

// "1,2 km" por debajo de 10 km; "10.765 km" a partir de ahi.
export function formatKm(km: number): string {
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
  return `${String(Math.round(km)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} km`;
}
