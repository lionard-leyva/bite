// Acceptance: features/pareja-y-seguridad.feature (EMU-01, 02, 05, 06, 07 y RUL-01, 02 del plan E2E).
// Servicios reales contra el Firestore Emulator con firestore.rules. Ejecutar: npm run test:emulator.
// RULES_FILE permite probar una copia de las reglas (p. ej. mutada) sin tocar firestore.rules.
import * as fs from 'fs';
import { defineFeature, loadFeature } from 'jest-cucumber';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  setLogLevel,
} from 'firebase/firestore';

setLogLevel('silent');

// Los servicios usan `db` de config/firebase: lo apuntamos al usuario activo.
let mockActiveDb: any;
jest.mock('../config/firebase', () => ({
  get db() {
    return mockActiveDb;
  },
}));

import { createPersonalList, joinListByCode } from '../services/listService';
import { getOrStartSession, castVote, markMatched } from '../services/decisionService';
import { findMatch } from '../utils/matchLogic';
import type { DecisionSession } from '../types';

jest.setTimeout(30000);
const feature = loadFeature('features/pareja-y-seguridad.feature');

let env: RulesTestEnvironment;
const as = (uid: string) => {
  mockActiveDb = env.authenticatedContext(uid).firestore();
  return mockActiveDb;
};
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-bite',
    firestore: { rules: fs.readFileSync(process.env.RULES_FILE ?? 'firestore.rules', 'utf8') },
  });
});
afterAll(() => env.cleanup());
beforeEach(() => env.clearFirestore());

async function listaDeAna() {
  as('ana');
  const listId = await createPersonalList('ana');
  const code = (await getDoc(doc(mockActiveDb, 'lists', listId))).data()!.inviteCode as string;
  return { listId, code };
}

async function parejaCompartiendo() {
  const { listId, code } = await listaDeAna();
  as('bea');
  await setDoc(doc(mockActiveDb, 'users', 'bea'), { displayName: 'Bea' });
  await joinListByCode('bea', code);
  return listId;
}

const restaurante = (listId: string, by: string, name: string) => ({
  name, address: 'Calle 1', listId, createdBy: by,
});

const abrirDecision = (listId: string, userId: string) => {
  as(userId);
  return getOrStartSession({ listId, userId, candidateIds: ['r1', 'r2'] });
};

defineFeature(feature, (test) => {
  let listId: string;
  let code: string;

  const parejaComparte = (given: any) =>
    given('que Ana y Bea comparten lista', async () => {
      listId = await parejaCompartiendo();
    });

  const conRestauranteYDecision = (given: any) =>
    given('que Ana y Bea comparten lista con un restaurante guardado y una decisión en marcha', async () => {
      listId = await parejaCompartiendo();
      await setDoc(doc(as('ana'), 'restaurants', 'r1'), restaurante(listId, 'ana', 'Gyoza'));
      const s = await abrirDecision(listId, 'ana');
      await castVote({ roundId: s.roundId, listId, userId: 'ana', restaurantId: 'r1', vote: 'LIKE' });
    });

  test('Bea se une a la lista de Ana con el código', ({ given, when, then, and }) => {
    given('que Ana ha creado su lista', async () => {
      ({ listId, code } = await listaDeAna());
    });

    when('Bea se une con el código de la lista de Ana', async () => {
      as('bea');
      await setDoc(doc(mockActiveDb, 'users', 'bea'), { displayName: 'Bea' });
      await joinListByCode('bea', code);
    });

    then('Ana y Bea son miembros de la lista', async () => {
      const lista = (await getDoc(doc(as('ana'), 'lists', listId))).data()!;
      expect([...lista.members].sort()).toEqual(['ana', 'bea']);
    });

    and('la lista de Bea es la de Ana', async () => {
      expect((await getDoc(doc(as('bea'), 'users', 'bea'))).data()!.sharedListId).toBe(listId);
    });
  });

  test('Lo que guarda una lo ve la otra al momento, en los dos sentidos', ({ given, when, then, and }) => {
    const vistos: Record<string, string[]> = { ana: [], bea: [] };
    let desuscribir: Array<() => void> = [];

    given('que Ana y Bea comparten lista y las dos están mirando los restaurantes', async () => {
      listId = await parejaCompartiendo();
      desuscribir = ['ana', 'bea'].map((u) =>
        onSnapshot(
          query(collection(as(u), 'restaurants'), where('listId', '==', listId)),
          (s) => (vistos[u] = s.docs.map((d) => d.data().name).sort()),
        ),
      );
    });

    when(/^Ana guarda "(.*)" y Bea guarda "(.*)"$/, async (a: string, b: string) => {
      await setDoc(doc(as('ana'), 'restaurants', 'r1'), restaurante(listId, 'ana', a));
      await setDoc(doc(as('bea'), 'restaurants', 'r2'), restaurante(listId, 'bea', b));
      await esperar(1000);
      desuscribir.forEach((u) => u());
    });

    then(/^Ana ve "(.*)" y "(.*)"$/, (a: string, b: string) => {
      expect(vistos.ana).toEqual([a, b].sort());
    });

    and(/^Bea ve "(.*)" y "(.*)"$/, (a: string, b: string) => {
      expect(vistos.bea).toEqual([a, b].sort());
    });
  });

  test('Si las dos abren la decisión a la vez, votan en la misma ronda', ({ given, when, then, and }) => {
    let ana: DecisionSession;
    let bea: DecisionSession;
    parejaComparte(given);

    when('las dos abren ¿Dónde cenamos hoy? a la vez', async () => {
      [ana, bea] = await Promise.all([abrirDecision(listId, 'ana'), abrirDecision(listId, 'bea')]);
    });

    then('las dos están en la misma ronda', () => {
      expect(ana.roundId).toBe(bea.roundId);
    });

    and('esa ronda es la única que hay guardada para la lista', async () => {
      const guardada = (await getDoc(doc(as('ana'), 'decisionSessions', listId))).data()!;
      expect(guardada.roundId).toBe(ana.roundId);
    });
  });

  test('Si las dos dan like al mismo sitio, el match se marca una sola vez', ({ given, when, then, and }) => {
    let sesion: DecisionSession;
    parejaComparte(given);

    and('que las dos han abierto ¿Dónde cenamos hoy?', async () => {
      sesion = await abrirDecision(listId, 'ana');
      await abrirDecision(listId, 'bea');
    });

    when(/^las dos dan like a "(.*)"$/, async (rid: string) => {
      for (const userId of ['ana', 'bea']) {
        as(userId);
        await castVote({ roundId: sesion.roundId, listId, userId, restaurantId: rid, vote: 'LIKE' });
      }
    });

    and(/^llega una detección tardía de una ronda anterior para "(.*)"$/, async (rid: string) => {
      as('bea');
      await markMatched(listId, 'ronda-anterior', rid);
    });

    and('los dos clientes marcan el match a la vez', async () => {
      const votos = await getDocs(
        query(
          collection(as('ana'), 'decisionVotes'),
          where('listId', '==', listId),
          where('roundId', '==', sesion.roundId),
        ),
      );
      const porUsuario: Record<string, any> = {};
      votos.docs.forEach((d) => (porUsuario[d.data().userId] = d.data().votes));
      const match = findMatch(porUsuario, sesion.participants, sesion.restaurantIds)!;
      await Promise.all([
        (as('ana'), markMatched(listId, sesion.roundId, match)),
        (as('bea'), markMatched(listId, sesion.roundId, match)),
      ]);
    });

    then(/^la ronda queda con match en "(.*)"$/, async (rid: string) => {
      const final = (await getDoc(doc(as('ana'), 'decisionSessions', listId))).data()!;
      expect(final.status).toBe('MATCHED');
      expect(final.matchedRestaurantId).toBe(rid);
    });
  });

  test('Bea no puede votar en nombre de Ana', ({ given, when, then, and }) => {
    let intento: Promise<unknown>;
    parejaComparte(given);

    when('Bea intenta guardar un voto firmado como Ana', () => {
      intento = Promise.resolve(
        setDoc(doc(as('bea'), 'decisionVotes', 'R1_ana'), {
          roundId: 'R1', listId, userId: 'ana', votes: { r1: 'LIKE' },
        }),
      );
    });

    then('el sistema lo deniega', async () => {
      await assertFails(intento);
    });

    and('Ana no tiene ningún voto registrado', async () => {
      // get() de un voto inexistente da error de evaluación en la regla; la query por lista y ronda sí es válida
      const votos = await getDocs(
        query(
          collection(as('ana'), 'decisionVotes'),
          where('listId', '==', listId),
          where('roundId', '==', 'R1'),
        ),
      );
      expect(votos.size).toBe(0);
    });
  });

  test('Una persona ajena a la lista no ve ni toca nada de ella', ({ given, when, then, and }) => {
    let eva: any;
    let roundId: string;
    conRestauranteYDecision(given);

    when('Eva, que tiene cuenta pero no es miembro, intenta leer y escribir en esa lista', async () => {
      eva = as('eva');
      roundId = (await getDoc(doc(as('ana'), 'decisionSessions', listId))).data()!.roundId;
      eva = as('eva');
    });

    then('no puede leer el restaurante, la decisión ni los votos', async () => {
      await assertFails(getDoc(doc(eva, 'restaurants', 'r1')));
      await assertFails(getDocs(query(collection(eva, 'restaurants'), where('listId', '==', listId))));
      await assertFails(getDoc(doc(eva, 'decisionSessions', listId)));
      await assertFails(getDoc(doc(eva, 'decisionVotes', `${roundId}_ana`)));
      await assertFails(
        getDocs(
          query(
            collection(eva, 'decisionVotes'),
            where('listId', '==', listId),
            where('roundId', '==', roundId),
          ),
        ),
      );
    });

    and('no puede guardar restaurantes, votar ni modificar la lista', async () => {
      await assertFails(setDoc(doc(eva, 'restaurants', 'r2'), restaurante(listId, 'eva', 'Intruso')));
      await assertFails(updateDoc(doc(eva, 'restaurants', 'r1'), { name: 'x' }));
      await assertFails(setDoc(doc(eva, 'decisionSessions', listId), { status: 'MATCHED' }));
      await assertFails(
        castVote({ roundId, listId, userId: 'eva', restaurantId: 'r1', vote: 'LIKE' }),
      );
      await assertFails(updateDoc(doc(eva, 'lists', listId), { ownerId: 'eva' }));
    });
  });

  test('Sin iniciar sesión no hay acceso a nada', ({ given, when, then }) => {
    let anon: any;
    conRestauranteYDecision(given);

    when('alguien sin sesión intenta leer y escribir en esa lista', () => {
      anon = env.unauthenticatedContext().firestore();
    });

    then('el sistema lo deniega todo', async () => {
      await assertFails(getDoc(doc(anon, 'lists', listId)));
      await assertFails(getDoc(doc(anon, 'users', 'ana')));
      await assertFails(getDoc(doc(anon, 'restaurants', 'r1')));
      await assertFails(getDoc(doc(anon, 'decisionSessions', listId)));
      await assertFails(setDoc(doc(anon, 'restaurants', 'rx'), restaurante(listId, 'x', 'Anon')));
    });
  });
});
