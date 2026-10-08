import { useState, useEffect, useRef } from 'react';
import {
  fetchETA,
  getCachedETA,
  haversineKm,
  formatDistance,
  formatETALine,
  type ETAResult,
} from '../services/navigationService';

interface UseNavigationETAParams {
  restaurantId: string | null;
  destLat: number | null;
  destLng: number | null;
  userLat: number | null;
  userLng: number | null;
}

interface UseNavigationETAResult {
  /** Combined line: "1.2km · 8 min" or "1.2km" if ETA unavailable */
  infoText: string | null;
  /** Whether ETA is currently being fetched */
  etaLoading: boolean;
  /** Full ETA result if available */
  eta: ETAResult | null;
}

export function useNavigationETA({
  restaurantId,
  destLat,
  destLng,
  userLat,
  userLng,
}: UseNavigationETAParams): UseNavigationETAResult {
  const [eta, setEta] = useState<ETAResult | null>(null);
  const [etaLoading, setEtaLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel any in-flight request from the previous selection
    abortRef.current?.abort();
    abortRef.current = null;

    // Reset when nothing is selected
    if (!restaurantId || destLat == null || destLng == null || userLat == null || userLng == null) {
      setEta(null);
      setEtaLoading(false);
      return;
    }

    // Check cache first (synchronous — avoids flash)
    const cached = getCachedETA(restaurantId);
    if (cached) {
      setEta(cached);
      setEtaLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    // The previous selection's time must not be shown for this one while its own ETA loads.
    setEta(null);
    setEtaLoading(true);

    fetchETA(userLat, userLng, destLat, destLng, restaurantId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setEta(result);
        }
      })
      .catch(() => {
        // Silently fail — UI falls back to Haversine-only distance
        if (!controller.signal.aborted) {
          setEta(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setEtaLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [restaurantId, destLat, destLng, userLat, userLng]);

  // Build the display line
  let infoText: string | null = null;
  if (destLat != null && destLng != null && userLat != null && userLng != null) {
    const km = haversineKm(userLat, userLng, destLat, destLng);
    infoText = formatETALine(km, eta);
  }

  return { infoText, etaLoading, eta };
}
