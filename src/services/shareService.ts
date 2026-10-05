import Constants from 'expo-constants';
import { DIRECTIONS_PROXY_URL } from '../config/constants';
import { parseSharedText, mergeResolvedMapsUrl, type ParsedShare } from '../utils/shareParser';

const PROXY_URL: string =
  Constants.expoConfig?.extra?.DIRECTIONS_PROXY_URL || DIRECTIONS_PROXY_URL;
const RESOLVE_URL = PROXY_URL.replace(/\/api\/directions\/?$/, '/api/resolve-link');
const RESOLVE_TIMEOUT_MS = 6_000;

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RESOLVE_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Proxy first (allow-listed redirects, cached); if it's down, let the device follow the
// redirect itself and read the final URL.
async function resolveShortLink(url: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(RESOLVE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof data?.url === 'string') return data.url;
    }
  } catch {
    // proxy unreachable
  }
  try {
    const res = await fetchWithTimeout(url);
    return res.url && res.url !== url ? res.url : null;
  } catch {
    return null;
  }
}

export async function resolveSharedText(text: string): Promise<ParsedShare | null> {
  const parsed = parseSharedText(text);
  if (!parsed || !parsed.needsResolve || !parsed.url) return parsed;
  const resolved = await resolveShortLink(parsed.url);
  return resolved ? mergeResolvedMapsUrl(parsed, resolved) : parsed;
}
