import {
  rankCandidates,
  findMatch,
  isRoundExhausted,
  isSessionFresh,
  estimateWalkMinutes,
  nextUnvoted,
  MATCH_SESSION_TTL_MS,
} from '../utils/matchLogic';
import type { Restaurant, VotesByUser } from '../types';

function restaurant(id: string, latitude: number, longitude: number, visited = false): Restaurant {
  return {
    id,
    name: `R${id}`,
    address: '',
    latitude,
    longitude,
    rating: 4,
    note: '',
    photoURL: null,
    photoURLs: [],
    visited,
    createdBy: 'u1',
    createdAt: new Date(),
    updatedAt: new Date(),
    listId: 'list1',
  };
}

const origin = { latitude: 40.4168, longitude: -3.7038 };

describe('rankCandidates', () => {
  const list = [
    restaurant('far', 40.5, -3.7),
    restaurant('near', 40.417, -3.704),
    restaurant('visited', 40.4168, -3.7038, true),
    restaurant('mid', 40.43, -3.7),
  ];

  it('drops visited restaurants and sorts by distance', () => {
    expect(rankCandidates(list, origin).map((c) => c.restaurant.id)).toEqual(['near', 'mid', 'far']);
  });

  it('caps the number of candidates', () => {
    expect(rankCandidates(list, origin, 2).map((c) => c.restaurant.id)).toEqual(['near', 'mid']);
  });

  it('keeps list order and null distance without a location', () => {
    const ranked = rankCandidates(list, null);
    expect(ranked.map((c) => c.restaurant.id)).toEqual(['far', 'near', 'mid']);
    expect(ranked.every((c) => c.distanceKm === null)).toBe(true);
  });
});

describe('findMatch', () => {
  const participants = ['a', 'b'];
  const ids = ['r1', 'r2', 'r3'];

  it('returns null until both like the same restaurant', () => {
    const votes: VotesByUser = { a: { r1: 'LIKE', r2: 'LIKE' }, b: { r1: 'PASS' } };
    expect(findMatch(votes, participants, ids)).toBeNull();
  });

  it('returns the first restaurant both liked, in round order', () => {
    const votes: VotesByUser = {
      a: { r1: 'LIKE', r2: 'LIKE', r3: 'LIKE' },
      b: { r3: 'LIKE', r2: 'LIKE' },
    };
    expect(findMatch(votes, participants, ids)).toBe('r2');
  });

  it('never matches with a single participant', () => {
    expect(findMatch({ a: { r1: 'LIKE' } }, ['a'], ids)).toBeNull();
  });
});

describe('isRoundExhausted', () => {
  const participants = ['a', 'b'];
  const ids = ['r1', 'r2'];

  it('is false while someone still has votes left', () => {
    expect(isRoundExhausted({ a: { r1: 'PASS', r2: 'PASS' }, b: { r1: 'LIKE' } }, participants, ids)).toBe(false);
  });

  it('is true when everyone voted everything without a match', () => {
    const votes: VotesByUser = { a: { r1: 'LIKE', r2: 'PASS' }, b: { r1: 'PASS', r2: 'LIKE' } };
    expect(isRoundExhausted(votes, participants, ids)).toBe(true);
  });

  it('is false when the round ended in a match', () => {
    const votes: VotesByUser = { a: { r1: 'LIKE', r2: 'PASS' }, b: { r1: 'LIKE', r2: 'PASS' } };
    expect(isRoundExhausted(votes, participants, ids)).toBe(false);
  });
});

describe('helpers', () => {
  it('treats sessions older than the TTL as stale', () => {
    const now = Date.now();
    expect(isSessionFresh(new Date(now - 1000), now)).toBe(true);
    expect(isSessionFresh(new Date(now - MATCH_SESSION_TTL_MS - 1), now)).toBe(false);
  });

  it('estimates walking minutes with a detour factor', () => {
    expect(estimateWalkMinutes(1)).toBe(16);
    expect(estimateWalkMinutes(0)).toBe(1);
  });

  it('returns the first candidate without my vote', () => {
    const deck = [{ restaurant: restaurant('r1', 0, 0) }, { restaurant: restaurant('r2', 0, 0) }];
    expect(nextUnvoted(deck, { r1: 'PASS' })?.restaurant.id).toBe('r2');
    expect(nextUnvoted(deck, { r1: 'PASS', r2: 'LIKE' })).toBeNull();
  });
});
