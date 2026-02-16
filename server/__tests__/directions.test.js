const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const { validateDirectionsBody } = require('../validate');
const { makeKey, get, set, store, inflight } = require('../cache');

// --- Validation tests ---

describe('validateDirectionsBody', () => {
  it('returns null for valid input', () => {
    const err = validateDirectionsBody({
      origin: { lat: 40.4168, lng: -3.7038 },
      destination: { lat: 40.42, lng: -3.71 },
    });
    assert.equal(err, null);
  });

  it('rejects missing body', () => {
    assert.ok(validateDirectionsBody(null));
    assert.ok(validateDirectionsBody(undefined));
  });

  it('rejects missing origin', () => {
    const err = validateDirectionsBody({
      destination: { lat: 40.42, lng: -3.71 },
    });
    assert.ok(err.includes('origin'));
  });

  it('rejects missing destination', () => {
    const err = validateDirectionsBody({
      origin: { lat: 40.4168, lng: -3.7038 },
    });
    assert.ok(err.includes('destination'));
  });

  it('rejects invalid lat (out of range)', () => {
    const err = validateDirectionsBody({
      origin: { lat: 91, lng: -3.7038 },
      destination: { lat: 40.42, lng: -3.71 },
    });
    assert.ok(err.includes('origin.lat'));
  });

  it('rejects invalid lng (out of range)', () => {
    const err = validateDirectionsBody({
      origin: { lat: 40.4168, lng: -181 },
      destination: { lat: 40.42, lng: -3.71 },
    });
    assert.ok(err.includes('origin.lng'));
  });

  it('rejects NaN coordinates', () => {
    const err = validateDirectionsBody({
      origin: { lat: NaN, lng: -3.7038 },
      destination: { lat: 40.42, lng: -3.71 },
    });
    assert.ok(err.includes('origin.lat'));
  });

  it('rejects string coordinates', () => {
    const err = validateDirectionsBody({
      origin: { lat: '40.4168', lng: -3.7038 },
      destination: { lat: 40.42, lng: -3.71 },
    });
    assert.ok(err.includes('origin.lat'));
  });
});

// --- Cache tests ---

describe('cache', () => {
  beforeEach(() => {
    store.clear();
    inflight.clear();
  });

  it('makeKey rounds to 4 decimals', () => {
    // Both round to 40.4168,-3.7038|40.4200,-3.7100
    const k1 = makeKey(40.41681, -3.70381, 40.42001, -3.71001);
    const k2 = makeKey(40.41684, -3.70384, 40.42004, -3.71004);
    assert.equal(k1, k2);
  });

  it('get returns undefined for missing key', () => {
    assert.equal(get('nope'), undefined);
  });

  it('set + get works within TTL', () => {
    set('k1', { distanceKm: 1.2, durationMinutes: 8 });
    const v = get('k1');
    assert.deepEqual(v, { distanceKm: 1.2, durationMinutes: 8 });
  });

  it('get returns undefined after TTL expires', async () => {
    set('k2', { distanceKm: 1, durationMinutes: 5 }, 1);
    // Wait for TTL to expire
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(get('k2'), undefined);
  });

  it('dedup: setInflight makes promise available via getInflight', async () => {
    const p = Promise.resolve({ distanceKm: 1, durationMinutes: 5 });
    const key = 'dedup-key';
    assert.equal(inflight.has(key), false);

    // setInflight from cache module
    const cacheModule = require('../cache');
    cacheModule.setInflight(key, p);
    assert.equal(cacheModule.getInflight(key), p);

    // After settling, inflight is cleaned up
    await p;
    // Allow microtask to flush .finally()
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(cacheModule.getInflight(key), undefined);
  });
});
