// MCH-02..04 del plan E2E: rondas de Match contra Firestore en memoria (transacciones optimistas).
jest.mock('firebase/firestore', () => require('../../jest/fakeFirestore'));
jest.mock('../config/firebase', () => ({ db: {} }));

import * as fs from '../../jest/fakeFirestore';
import { getOrStartSession, castVote, markMatched, subscribeVotes } from '../services/decisionService';

const fake = fs as any;
const HOUR = 60 * 60 * 1000;

beforeEach(() => {
  fake.__reset();
  fake.__put('lists/L1', { members: ['ana', 'bea'] });
});

const start = (userId: string, extra = {}) =>
  getOrStartSession({ listId: 'L1', userId, candidateIds: ['r1', 'r2'], ...extra });

describe('decisionService', () => {
  it('crea ronda ACTIVE con los miembros de la lista como participantes', async () => {
    const s = await start('ana');
    expect(s.status).toBe('ACTIVE');
    expect(s.participants).toEqual(['ana', 'bea']);
    expect(s.restaurantIds).toEqual(['r1', 'r2']);
  });

  it('dos clientes a la vez caen en la misma ronda (MCH-03)', async () => {
    const [a, b] = await Promise.all([start('ana'), start('bea')]);
    expect(a.roundId).toBe(b.roundId);
    expect(fake.__get('decisionSessions/L1').roundId).toBe(a.roundId);
  });

  it('el segundo en llegar se une a la ronda existente', async () => {
    const a = await start('ana');
    const b = await start('bea');
    expect(b.roundId).toBe(a.roundId);
  });

  it('ronda de mas de 12 h caduca y se crea otra (MCH-04)', async () => {
    fake.__put('decisionSessions/L1', {
      roundId: 'old', listId: 'L1', participants: ['ana', 'bea'], restaurantIds: ['r1'],
      status: 'ACTIVE', createdAt: fake.timestamp(new Date(Date.now() - 13 * HOUR)),
    });
    expect((await start('ana')).roundId).not.toBe('old');
  });

  it('ronda CLOSED o forceNew empieza ronda nueva', async () => {
    const a = await start('ana');
    expect((await start('ana', { forceNew: true })).roundId).not.toBe(a.roundId);
  });

  it('votos se acumulan por usuario y ronda sin pisar los anteriores', async () => {
    const s = await start('ana');
    await castVote({ roundId: s.roundId, listId: 'L1', userId: 'ana', restaurantId: 'r1', vote: 'LIKE' });
    await castVote({ roundId: s.roundId, listId: 'L1', userId: 'ana', restaurantId: 'r2', vote: 'PASS' });
    await castVote({ roundId: s.roundId, listId: 'L1', userId: 'bea', restaurantId: 'r1', vote: 'LIKE' });

    const seen: any[] = [];
    const unsub = subscribeVotes(s.roundId, (v) => seen.push(v), () => {});
    unsub();
    expect(seen.at(-1)).toEqual({ ana: { r1: 'LIKE', r2: 'PASS' }, bea: { r1: 'LIKE' } });
  });

  it('markMatched es idempotente: dos clientes, un solo MATCHED (MCH-02)', async () => {
    const s = await start('ana');
    await Promise.all([markMatched('L1', s.roundId, 'r1'), markMatched('L1', s.roundId, 'r2')]);
    const session = fake.__get('decisionSessions/L1');
    expect(session.status).toBe('MATCHED');
    expect(['r1', 'r2']).toContain(session.matchedRestaurantId);
  });

  it('markMatched ignora una ronda que ya no es la actual', async () => {
    await start('ana');
    await markMatched('L1', 'otra', 'r1');
    expect(fake.__get('decisionSessions/L1').status).toBe('ACTIVE');
  });
});
