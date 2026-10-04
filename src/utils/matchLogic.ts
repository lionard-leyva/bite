import { haversineKm } from './geo';
import type { Restaurant, VotesByUser } from '../types';

export const MATCH_MAX_CANDIDATES = 10;
export const MATCH_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const WALK_SPEED_KMH = 5;
// Streets are never a straight line; scale the geodesic distance for a realistic walk.
const WALK_DETOUR_FACTOR = 1.3;

interface Coords {
  latitude: number;
  longitude: number;
}

export interface RankedCandidate {
  restaurant: Restaurant;
  distanceKm: number | null;
}

/**
 * Pending restaurants ordered by straight-line distance, capped so only the
 * closest few ever hit the directions proxy. Without a location the list
 * order (newest first) is kept.
 */
export function rankCandidates(
  restaurants: Restaurant[],
  origin: Coords | null,
  max: number = MATCH_MAX_CANDIDATES,
): RankedCandidate[] {
  const ranked = restaurants
    .filter((r) => !r.visited)
    .map((r) => ({
      restaurant: r,
      distanceKm: origin
        ? haversineKm(origin.latitude, origin.longitude, r.latitude, r.longitude)
        : null,
    }));

  if (origin) {
    ranked.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  }
  return ranked.slice(0, max);
}

/** First restaurant (in round order) that every participant liked. */
export function findMatch(
  votes: VotesByUser,
  participants: string[],
  restaurantIds: string[],
): string | null {
  if (participants.length < 2) return null;
  return (
    restaurantIds.find((rid) =>
      participants.every((uid) => votes[uid]?.[rid] === 'LIKE'),
    ) ?? null
  );
}

/** True when everybody voted on every restaurant and nothing matched. */
export function isRoundExhausted(
  votes: VotesByUser,
  participants: string[],
  restaurantIds: string[],
): boolean {
  if (participants.length < 2 || restaurantIds.length === 0) return false;
  const everyoneDone = participants.every((uid) =>
    restaurantIds.every((rid) => votes[uid]?.[rid] != null),
  );
  return everyoneDone && findMatch(votes, participants, restaurantIds) == null;
}

export function isSessionFresh(createdAt: Date, now: number = Date.now()): boolean {
  return now - createdAt.getTime() < MATCH_SESSION_TTL_MS;
}

export function estimateWalkMinutes(km: number): number {
  return Math.max(1, Math.round(((km * WALK_DETOUR_FACTOR) / WALK_SPEED_KMH) * 60));
}

export function nextUnvoted<T extends { restaurant: Restaurant }>(
  candidates: T[],
  myVotes: Record<string, unknown>,
): T | null {
  return candidates.find((c) => myVotes[c.restaurant.id] == null) ?? null;
}
