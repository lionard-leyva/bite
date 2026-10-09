import { haversineKm } from './geo';

export interface FocusPin {
  id: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
}

interface Point {
  latitude: number;
  longitude: number;
}

// Un sitio guardado en otro continente (p. ej. un geocodificado equivocado) no debe alejar el mapa hasta el mundo entero.
export const NEAR_RADIUS_KM = 150;

const newest = <T extends { createdAt: Date }>(items: T[]): T =>
  items.reduce((best, r) => (r.createdAt.getTime() > best.createdAt.getTime() ? r : best));

export function focusTargets<T extends FocusPin>(restaurants: T[], user: Point | null): T[] {
  if (restaurants.length === 0) return [];
  const center = user ?? newest(restaurants);
  const near = restaurants.filter(
    (r) => haversineKm(center.latitude, center.longitude, r.latitude, r.longitude) <= NEAR_RADIUS_KM,
  );
  return near.length > 0 ? near : restaurants;
}

// `known` es null hasta la primera carga: lo que llega entonces no cuenta como nuevo.
export function newRestaurantToFocus<T extends FocusPin>(known: ReadonlySet<string> | null, restaurants: T[]): T | null {
  if (!known) return null;
  const fresh = restaurants.filter((r) => !known.has(r.id));
  return fresh.length > 0 ? newest(fresh) : null;
}
