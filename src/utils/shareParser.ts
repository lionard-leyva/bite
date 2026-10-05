// Parses text shared to Bite from other apps (Google Maps, Instagram, TikTok...).
// Pure functions: no React Native imports so they run in the node Jest project.
// Regex instead of URL(): React Native's URL polyfill is incomplete.

export type ShareSource = 'google_maps' | 'instagram' | 'tiktok' | 'other';

export interface ParsedShare {
  source: ShareSource;
  url: string | null;
  name: string | null;
  latitude: number | null;
  longitude: number | null;
  // Short Google Maps link (maps.app.goo.gl) whose target must be fetched to get name/coords
  needsResolve: boolean;
}

export interface MapsUrlInfo {
  name: string | null;
  latitude: number | null;
  longitude: number | null;
}

const URL_RE = /https?:\/\/[^\s<>"']+/gi;
const NAME_MAX = 60;

// Lines that are share boilerplate, never a restaurant name
const BOILERPLATE_RE =
  /(check out|mira este|mira esta|echa un vistazo|watch this|ver en|view on|shared via|compartido|vídeo|video|reel|tiktok|instagram|google maps)/i;

export function extractUrls(text: string): string[] {
  return (text.match(URL_RE) ?? []).map((u) => u.replace(/[).,;!?]+$/, ''));
}

function hostOf(url: string): string {
  const m = url.match(/^https?:\/\/([^/?#:]+)/i);
  return m ? m[1].toLowerCase() : '';
}

function pathOf(url: string): string {
  const m = url.match(/^https?:\/\/[^/?#]+(\/[^?#]*)?/i);
  return m?.[1] ?? '/';
}

function queryParam(url: string, key: string): string | null {
  const m = url.match(new RegExp(`[?&]${key}=([^&#]*)`));
  return m ? safeDecode(m[1]) : null;
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '));
  } catch {
    return s.replace(/\+/g, ' ');
  }
}

function isGoogleHost(host: string): boolean {
  return /(^|\.)google\.[a-z.]{2,6}$/.test(host);
}

export function isShortMapsUrl(url: string): boolean {
  const host = hostOf(url);
  return host === 'maps.app.goo.gl' || (host === 'goo.gl' && pathOf(url).startsWith('/maps'));
}

export function isGoogleMapsUrl(url: string): boolean {
  const host = hostOf(url);
  if (isShortMapsUrl(url)) return true;
  if (host.startsWith('maps.google.')) return isGoogleHost(host);
  return isGoogleHost(host) && pathOf(url).startsWith('/maps');
}

export function detectSource(url: string): ShareSource {
  const host = hostOf(url);
  if (isGoogleMapsUrl(url)) return 'google_maps';
  if (host === 'instagram.com' || host.endsWith('.instagram.com') || host === 'instagr.am') return 'instagram';
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return 'tiktok';
  return 'other';
}

function toCoords(lat: string, lng: string): { latitude: number; longitude: number } | null {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!isFinite(latitude) || !isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  if (latitude === 0 && longitude === 0) return null;
  return { latitude, longitude };
}

const COORDS_TEXT_RE = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

// Place names in Maps URLs often carry the address after a comma ("Ramen Kagura, Calle X, Madrid")
function nameFromPlaceText(text: string): string | null {
  const first = text.split(',')[0].trim();
  if (!first || COORDS_TEXT_RE.test(text)) return null;
  return first.slice(0, NAME_MAX);
}

export function parseGoogleMapsUrl(url: string): MapsUrlInfo {
  const info: MapsUrlInfo = { name: null, latitude: null, longitude: null };
  const path = pathOf(url);

  // /maps/place/<name>/... or /maps/search/<query>/...
  const placeMatch = path.match(/\/maps\/(?:place|search)\/([^/]+)/);
  if (placeMatch) info.name = nameFromPlaceText(safeDecode(placeMatch[1]));

  // !3d<lat>!4d<lng> is the place pin; @lat,lng is only the viewport centre
  const pin = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const viewport = path.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const coordParam = ['q', 'query', 'll', 'center', 'destination']
    .map((k) => queryParam(url, k))
    .find((v) => v != null && COORDS_TEXT_RE.test(v));
  const paramMatch = coordParam?.match(COORDS_TEXT_RE);

  const coords =
    (pin && toCoords(pin[1], pin[2])) ||
    (paramMatch && toCoords(paramMatch[1], paramMatch[2])) ||
    (viewport && toCoords(viewport[1], viewport[2])) ||
    null;
  if (coords) {
    info.latitude = coords.latitude;
    info.longitude = coords.longitude;
  }

  if (!info.name) {
    const q = queryParam(url, 'q') ?? queryParam(url, 'query');
    if (q) info.name = nameFromPlaceText(q);
  }
  return info;
}

// Best-effort name from the non-URL part of the shared text (Maps puts the place name there,
// Instagram/TikTok usually send only the link or a caption)
export function nameHintFromText(text: string): string | null {
  const withoutUrls = text.replace(URL_RE, '\n');
  for (const raw of withoutUrls.split(/\r?\n/)) {
    const line = raw
      .split(' · ')[0]
      .replace(/[#@][\p{L}\p{N}_.]+/gu, '')
      .replace(/\s+/g, ' ')
      .replace(/^[\s\-–—:|"']+|[\s\-–—:|"']+$/g, '');
    if (!line || BOILERPLATE_RE.test(line)) continue;
    if (!/\p{L}/u.test(line)) continue;
    if (line.length > NAME_MAX) return null; // a caption, not a name
    return line;
  }
  return null;
}

// Link without tracking params, for the note ("Visto en Instagram: ...")
export function cleanUrl(url: string): string {
  return url.replace(/[?#].*$/, '');
}

export function parseSharedText(text: string): ParsedShare | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;

  const urls = extractUrls(trimmed);
  const url = urls.find((u) => detectSource(u) !== 'other') ?? urls[0] ?? null;
  const source = url ? detectSource(url) : 'other';
  const hint = nameHintFromText(trimmed);

  if (source === 'google_maps' && url) {
    const info = parseGoogleMapsUrl(url);
    return {
      source,
      url,
      name: info.name ?? hint,
      latitude: info.latitude,
      longitude: info.longitude,
      needsResolve: isShortMapsUrl(url),
    };
  }

  return { source, url, name: hint, latitude: null, longitude: null, needsResolve: false };
}

// Merges what the resolved (long) Maps URL tells us into the first parse.
// The URL's place name wins over the text hint; the text hint survives if the URL has none.
export function mergeResolvedMapsUrl(parsed: ParsedShare, resolvedUrl: string): ParsedShare {
  const info = parseGoogleMapsUrl(resolvedUrl);
  return {
    ...parsed,
    name: info.name ?? parsed.name,
    latitude: info.latitude ?? parsed.latitude,
    longitude: info.longitude ?? parsed.longitude,
    needsResolve: false,
  };
}

export function sourceLabel(source: ShareSource): string {
  switch (source) {
    case 'google_maps':
      return 'Google Maps';
    case 'instagram':
      return 'Instagram';
    case 'tiktok':
      return 'TikTok';
    default:
      return 'otra app';
  }
}
