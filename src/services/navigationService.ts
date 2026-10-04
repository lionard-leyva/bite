import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import {
  DIRECTIONS_PROXY_URL,
  DIRECTIONS_FETCH_TIMEOUT_MS,
} from '../config/constants';
import { haversineKm } from '../utils/geo';

// Resolve proxy URL: env override > constant default
const PROXY_URL =
  Constants.expoConfig?.extra?.DIRECTIONS_PROXY_URL || DIRECTIONS_PROXY_URL;

// --- Types ---

export interface ETAResult {
  distanceText: string;
  distanceMeters: number;
  durationText: string;
  durationSeconds: number;
}

// Haversine lives in utils/geo so pure logic can use it without React Native imports.
export { haversineKm };

export function formatDistance(km: number): string {
  if (km < 0.1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

// --- ETA cache (in-memory, keyed by restaurantId, TTL + size limit) ---

const ETA_CACHE_MAX = 100;
const ETA_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry { value: ETAResult; ts: number }
const etaCache = new Map<string, CacheEntry>();

export function getCachedETA(restaurantId: string): ETAResult | undefined {
  const entry = etaCache.get(restaurantId);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > ETA_CACHE_TTL_MS) {
    etaCache.delete(restaurantId);
    return undefined;
  }
  return entry.value;
}

function setCachedETA(restaurantId: string, value: ETAResult): void {
  if (etaCache.size >= ETA_CACHE_MAX) {
    // Evict oldest entry (first key in Map insertion order)
    const oldest = etaCache.keys().next().value;
    if (oldest !== undefined) etaCache.delete(oldest);
  }
  etaCache.set(restaurantId, { value, ts: Date.now() });
}

// --- Fetch ETA via backend proxy ---

function formatDuration(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

export async function fetchETA(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  restaurantId: string,
  signal?: AbortSignal,
): Promise<ETAResult> {
  const cached = getCachedETA(restaurantId);
  if (cached) return cached;

  // Client-side timeout wrapping the caller's abort signal
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DIRECTIONS_FETCH_TIMEOUT_MS);

  // Forward the caller's abort to our controller
  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: { lat: originLat, lng: originLng },
        destination: { lat: destLat, lng: destLng },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Proxy HTTP ${res.status}`);
    }

    const data: { distanceKm: number; durationMinutes: number } = await res.json();

    const result: ETAResult = {
      distanceText: formatDistance(data.distanceKm),
      distanceMeters: Math.round(data.distanceKm * 1000),
      durationText: formatDuration(data.durationMinutes),
      durationSeconds: Math.round(data.durationMinutes * 60),
    };

    setCachedETA(restaurantId, result);
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

// --- Format combined line for callout ---

export function formatETALine(km: number, eta: ETAResult | null): string {
  const dist = formatDistance(km);
  if (eta) {
    return `${dist} · ${eta.durationText}`;
  }
  return dist;
}

// --- Deep link to native maps ---

export async function openNativeNavigation(
  lat: number,
  lng: number,
  label: string,
): Promise<void> {
  const encoded = encodeURIComponent(label);

  if (Platform.OS === 'ios') {
    const appleMaps = `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d&q=${encoded}`;
    const canOpen = await Linking.canOpenURL(appleMaps);
    if (canOpen) {
      await Linking.openURL(appleMaps);
      return;
    }
  }

  const googleMaps =
    Platform.OS === 'android'
      ? `google.navigation:q=${lat},${lng}&mode=d`
      : `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;

  const canOpenGoogle = await Linking.canOpenURL(googleMaps);
  if (canOpenGoogle) {
    await Linking.openURL(googleMaps);
    return;
  }

  // Universal fallback — opens in browser
  const fallback = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  await Linking.openURL(fallback);
}
