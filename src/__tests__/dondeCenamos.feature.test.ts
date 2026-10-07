// Acceptance: features/donde-cenamos.feature (MCH-01..03 y MCH-06 del plan E2E), contra Firestore en memoria.
jest.mock('firebase/firestore', () => require('../../jest/fakeFirestore'));
jest.mock('../config/firebase', () => ({ db: {} }));

import { defineFeature, loadFeature } from 'jest-cucumber';
import * as fs from '../../jest/fakeFirestore';
import { getOrStartSession, castVote, markMatched, subscribeVotes } from '../services/decisionService';
import { rankCandidates, findMatch } from '../utils/matchLogic';
import type { Restaurant, VotesByUser, DecisionSession } from '../types';

const fake = fs as any;
const feature = loadFeature('features/donde-cenamos.feature');

beforeEach(() => fake.__reset());

function restaurant(id: string, latitude: number, visited = false): Restaurant {
  return {
    id, name: id, address: '', latitude, longitude: 0, rating: 4, note: '', photoURL: null,
    visited, createdBy: 'ana', createdAt: new Date(), updatedAt: new Date(), listId: 'L1',
  };
}

function votosDeLaRonda(roundId: string): VotesByUser {
  let votes: VotesByUser = {};
  subscribeVotes('L1', roundId, (v) => (votes = v), () => {})();
  return votes;
}

const abrir = (userId: string, candidateIds: string[]) =>
  getOrStartSession({ listId: 'L1', userId, candidateIds });

defineFeature(feature, (test) => {
  let sesion: DecisionSession;

  const antecedentes = (given: any) =>
    given('que Ana y Bea comparten la lista "L1"', () => {
      fake.__put('lists/L1', { members: ['ana', 'bea'] });
    });

  test('Solo los 10 pendientes más cercanos entran en la ronda, del más cercano al más lejano', ({ given, when, then, and }) => {
    let restaurantes: Restaurant[];
    let candidatos: ReturnType<typeof rankCandidates>;
    antecedentes(given);

    given('que la lista tiene 12 restaurantes pendientes a distinta distancia de Ana y uno ya visitado muy cerca', () => {
      // lejos -> cerca en orden de lista, para que el orden de entrada no ayude
      restaurantes = Array.from({ length: 12 }, (_, i) => restaurant(`p${i}`, (12 - i) * 0.01));
      restaurantes.push(restaurant('visitado', 0.001, true));
    });

    when('Ana abre la decisión desde su ubicación', () => {
      candidatos = rankCandidates(restaurantes, { latitude: 0, longitude: 0 });
    });

    then(/^hay (\d+) candidatos$/, (n: string) => {
      expect(candidatos).toHaveLength(Number(n));
    });

    and('los candidatos van del más cercano al más lejano', () => {
      const km = candidatos.map((c) => c.distanceKm as number);
      expect(km).toEqual([...km].sort((a, b) => a - b));
      expect(candidatos[0].restaurant.id).toBe('p11');
    });

    and('el restaurante visitado no es candidato', () => {
      expect(candidatos.map((c) => c.restaurant.id)).not.toContain('visitado');
    });
  });

  test('Una vez marcado el match, una detección tardía no lo cambia', ({ given, when, then, and }) => {
    const detectar = () => {
      const match = findMatch(votosDeLaRonda(sesion.roundId), sesion.participants, sesion.restaurantIds)!;
      return markMatched('L1', sesion.roundId, match);
    };
    const likeDeLosDos = async (rid: string) => {
      for (const userId of ['ana', 'bea']) {
        await castVote({ roundId: sesion.roundId, listId: 'L1', userId, restaurantId: rid, vote: 'LIKE' });
      }
    };
    antecedentes(given);

    given(/^que Ana y Bea han abierto la decisión con los candidatos "(.*)" y "(.*)"$/, async (a: string, b: string) => {
      sesion = await abrir('ana', [a, b]);
      await abrir('bea', [a, b]);
    });

    when(/^los dos dan like a "(.*)"$/, likeDeLosDos);

    and('un cliente detecta el match', detectar);

    and(/^los dos dan like también a "(.*)"$/, likeDeLosDos);

    and('el otro cliente detecta el match con retraso', detectar);

    then(/^la ronda queda con match en "(.*)"$/, (rid: string) => {
      const s = fake.__get('decisionSessions/L1');
      expect(s.status).toBe('MATCHED');
      expect(s.matchedRestaurantId).toBe(rid);
    });
  });

  test('Si Ana y Bea abren la decisión a la vez, votan en la misma ronda', ({ given, when, then, and }) => {
    let ana: DecisionSession;
    let bea: DecisionSession;
    antecedentes(given);

    when('Ana y Bea abren la decisión a la vez', async () => {
      [ana, bea] = await Promise.all([abrir('ana', ['r1', 'r2']), abrir('bea', ['r1', 'r2'])]);
    });

    then('las dos están en la misma ronda', () => {
      expect(ana.roundId).toBe(bea.roundId);
      expect(fake.__get('decisionSessions/L1').roundId).toBe(ana.roundId);
    });

    and('la ronda tiene como participantes a Ana y a Bea', () => {
      expect(ana.participants).toEqual(['ana', 'bea']);
    });
  });

  test('Los votos de una no se revelan a la otra mientras no haya match', ({ given, when, then, and }) => {
    antecedentes(given);

    given(/^que Ana y Bea han abierto la decisión con los candidatos "(.*)" y "(.*)"$/, async (a: string, b: string) => {
      sesion = await abrir('ana', [a, b]);
    });

    when(/^Bea da like a "(.*)" y Ana da like a "(.*)"$/, async (rb: string, ra: string) => {
      await castVote({ roundId: sesion.roundId, listId: 'L1', userId: 'bea', restaurantId: rb, vote: 'LIKE' });
      await castVote({ roundId: sesion.roundId, listId: 'L1', userId: 'ana', restaurantId: ra, vote: 'LIKE' });
    });

    then('no hay match', () => {
      expect(findMatch(votosDeLaRonda(sesion.roundId), sesion.participants, sesion.restaurantIds)).toBeNull();
    });

    and('la ronda sigue activa sin ningún voto en ella', () => {
      const s = fake.__get('decisionSessions/L1');
      expect(s.status).toBe('ACTIVE');
      expect(s.matchedRestaurantId).toBeNull();
      expect(JSON.stringify(s)).not.toMatch(/LIKE|PASS|votes/);
    });

    when(/^Ana da like también a "(.*)"$/, async (rid: string) => {
      await castVote({ roundId: sesion.roundId, listId: 'L1', userId: 'ana', restaurantId: rid, vote: 'LIKE' });
    });

    then(/^el único dato que se revela es el match en "(.*)"$/, (rid: string) => {
      expect(findMatch(votosDeLaRonda(sesion.roundId), sesion.participants, sesion.restaurantIds)).toBe(rid);
    });
  });
});
