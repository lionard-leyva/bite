import Constants from 'expo-constants';
import { auth } from '../config/firebase';
import { DIRECTIONS_PROXY_URL, PLACES_FETCH_TIMEOUT_MS } from '../config/constants';

// Los sitios se piden a nuestro servidor (functions/ o server/), que guarda la clave de Google. El movil no lleva ninguna.
const API_BASE = (
  Constants.expoConfig?.extra?.API_BASE_URL ||
  Constants.expoConfig?.extra?.DIRECTIONS_PROXY_URL ||
  DIRECTIONS_PROXY_URL
).replace(/\/directions\/?$/, '');

export interface Near {
  latitude: number;
  longitude: number;
}

export interface PlaceSuggestion {
  id: string;
  name: string;
  secondary: string;
  distanceMeters?: number;
}

export interface PlaceDetails {
  name: string;
  address: string;
  city?: string;
  latitude: number;
  longitude: number;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const user = auth?.currentUser;
  if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PLACES_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/places/${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`places/${path} ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function autocomplete(kind: 'restaurant' | 'address', input: string, origin: Near | null, sessionToken: string) {
  const data = await post<{ suggestions?: PlaceSuggestion[] }>('autocomplete', { input, origin, sessionToken, kind });
  return data.suggestions ?? [];
}

export function searchPlaces(input: string, near: Near | null, sessionToken: string): Promise<PlaceSuggestion[]> {
  return autocomplete('restaurant', input, near, sessionToken);
}

export function searchAddresses(input: string, near: Near | null, sessionToken: string): Promise<PlaceSuggestion[]> {
  return autocomplete('address', input, near, sessionToken);
}

export async function placeDetails(placeId: string, sessionToken: string): Promise<PlaceDetails> {
  const d = await post<Partial<PlaceDetails>>('details', { placeId, sessionToken });
  if (typeof d.latitude !== 'number' || typeof d.longitude !== 'number') {
    throw new Error('places/details sin coordenadas');
  }
  return { name: d.name ?? '', address: d.address ?? '', city: d.city, latitude: d.latitude, longitude: d.longitude };
}

// Google agrupa en una sola sesion las letras escritas y el sitio elegido (se cobra como una busqueda).
export function newSessionToken(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
