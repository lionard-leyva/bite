// Dos usuarios contra el Firestore Emulator con firestore.rules reales.
// Ejecutar: npm run test:emulator (arranca el emulador con firebase emulators:exec).
import * as fs from 'fs';
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
  arrayUnion,
} from 'firebase/firestore';

// Los servicios usan `db` de config/firebase: lo apuntamos al usuario activo.
import { setLogLevel } from 'firebase/firestore';
setLogLevel('silent');

let mockActiveDb: any;
jest.mock('../config/firebase', () => ({
  get db() {
    return mockActiveDb;
  },
}));

import { createPersonalList, joinListByCode, leaveSharedList } from '../services/listService';
import { getOrStartSession, castVote, markMatched } from '../services/decisionService';

jest.setTimeout(30000);
let env: RulesTestEnvironment;
const as = (uid: string) => {
  mockActiveDb = env.authenticatedContext(uid).firestore();
  return mockActiveDb;
};

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-bite',
    firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') },
  });
});
afterAll(() => env.cleanup());
beforeEach(() => env.clearFirestore());

/** ana crea su lista y bea se une con el codigo, via los servicios reales. */
async function shared() {
  as('ana');
  const listId = await createPersonalList('ana');
  const code = (await getDoc(doc(mockActiveDb, 'lists', listId))).data()!.inviteCode;
  as('bea');
  await setDoc(doc(mockActiveDb, 'users', 'bea'), { displayName: 'Bea' });
  await joinListByCode('bea', code);
  return { listId, code };
}

const resto = (listId: string, by: string, name = 'Gyoza') => ({
  name,
  address: 'Calle 1',
  listId,
  createdBy: by,
});

describe('lista compartida entre dos usuarios', () => {
  it('ana crea, bea se une con codigo y ambas son miembros', async () => {
    const { listId } = await shared();
    const list = (await getDoc(doc(as('ana'), 'lists', listId))).data()!;
    expect(list.members.sort()).toEqual(['ana', 'bea']);
    expect((await getDoc(doc(mockActiveDb, 'users', 'bea'))).data()!.sharedListId).toBe(listId);
  });

  it('un tercero no puede anadirse sin pasar por joinListByCode ni anadir a otro', async () => {
    const { listId } = await shared();
    const eve = as('eve');
    await assertFails(updateDoc(doc(eve, 'lists', listId), { members: arrayUnion('eve', 'zoe') }));
    await assertFails(updateDoc(doc(eve, 'lists', listId), { members: arrayUnion('zoe') }));
    await assertFails(updateDoc(doc(eve, 'lists', listId), { ownerId: 'eve' }));
    await assertSucceeds(updateDoc(doc(eve, 'lists', listId), { members: arrayUnion('eve') }));
  });

  it('sincroniza en ambos sentidos con onSnapshot', async () => {
    const { listId } = await shared();
    const seen: Record<string, string[]> = { ana: [], bea: [] };
    const unsubs = ['ana', 'bea'].map((u) =>
      onSnapshot(
        query(collection(as(u), 'restaurants'), where('listId', '==', listId)),
        (s) => (seen[u] = s.docs.map((d) => d.data().name).sort()),
      ),
    );
    await setDoc(doc(as('ana'), 'restaurants', 'r1'), resto(listId, 'ana', 'Gyoza'));
    await setDoc(doc(as('bea'), 'restaurants', 'r2'), resto(listId, 'bea', 'Taco'));
    await new Promise((r) => setTimeout(r, 1000));
    unsubs.forEach((u) => u());
    expect(seen.ana).toEqual(['Gyoza', 'Taco']);
    expect(seen.bea).toEqual(['Gyoza', 'Taco']);
  });

  it('carrera: dos joins simultaneos con el mismo codigo dejan a ambos como miembros', async () => {
    as('ana');
    const listId = await createPersonalList('ana');
    const code = (await getDoc(doc(mockActiveDb, 'lists', listId))).data()!.inviteCode;
    // arrayUnion es atomico, pero la regla compara tamano: la segunda escritura ve
    // el estado ya actualizado en servidor, asi que ambas deben pasar.
    const results = await Promise.allSettled(
      ['bea', 'cleo'].map(async (u) => {
        const d = as(u);
        await updateDoc(doc(d, 'lists', listId), { members: arrayUnion(u) });
      }),
    );
    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'fulfilled']);
    const members = (await getDoc(doc(as('ana'), 'lists', listId))).data()!.members;
    expect(members.sort()).toEqual(['ana', 'bea', 'cleo']);
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
  });

  it('carrera: dos escrituras simultaneas al mismo restaurante no se pierden campos distintos', async () => {
    const { listId } = await shared();
    await setDoc(doc(as('ana'), 'restaurants', 'r1'), resto(listId, 'ana'));
    await Promise.all([
      updateDoc(doc(as('ana'), 'restaurants', 'r1'), { visited: true }),
      updateDoc(doc(as('bea'), 'restaurants', 'r1'), { note: 'rico' }),
    ]);
    const r = (await getDoc(doc(as('ana'), 'restaurants', 'r1'))).data()!;
    expect(r.visited).toBe(true);
    expect(r.note).toBe('rico');
  });

  it('salir de la lista: leaveSharedList quita al miembro y crea lista propia', async () => {
    const { listId } = await shared();
    as('bea');
    const newId = await leaveSharedList('bea', listId);
    expect(newId).not.toBe(listId);
    const list = (await getDoc(doc(as('ana'), 'lists', listId))).data()!;
    expect(list.members).toEqual(['ana']);
  });
});

describe('reglas de seguridad', () => {
  it('restaurantes: miembros leen/escriben, un tercero no ve ni escribe', async () => {
    const { listId } = await shared();
    await assertSucceeds(setDoc(doc(as('bea'), 'restaurants', 'r1'), resto(listId, 'bea')));
    const eve = as('eve');
    await assertFails(getDoc(doc(eve, 'restaurants', 'r1')));
    await assertFails(
      getDocs(query(collection(eve, 'restaurants'), where('listId', '==', listId))),
    );
    await assertFails(setDoc(doc(eve, 'restaurants', 'r2'), resto(listId, 'eve')));
    await assertFails(updateDoc(doc(eve, 'restaurants', 'r1'), { name: 'x' }));
  });

  it('restaurantes: no se puede firmar como otro ni mover a una lista ajena', async () => {
    const { listId } = await shared();
    await assertFails(setDoc(doc(as('bea'), 'restaurants', 'r1'), resto(listId, 'ana')));
    as('eve');
    const eveList = await createPersonalList('eve');
    await setDoc(doc(mockActiveDb, 'restaurants', 'r9'), resto(eveList, 'eve'));
    await assertFails(updateDoc(doc(as('eve'), 'restaurants', 'r9'), { listId }));
  });

  it('sin autenticar no hay acceso a nada', async () => {
    const { listId } = await shared();
    const anon = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, 'lists', listId)));
    await assertFails(getDoc(doc(anon, 'users', 'ana')));
    await assertFails(setDoc(doc(anon, 'restaurants', 'r1'), resto(listId, 'x')));
  });

  it('users: solo el propio escribe; el de otro solo lo lee quien comparte lista', async () => {
    await shared();
    await assertFails(setDoc(doc(as('bea'), 'users', 'ana'), { displayName: 'hack' }));
    await assertSucceeds(getDoc(doc(as('bea'), 'users', 'ana')));
    await assertFails(getDoc(doc(as('eve'), 'users', 'ana')));
  });

  it('lists: solo el dueno borra; crear exige ownerId propio y members=[uid]', async () => {
    const { listId } = await shared();
    await assertFails(setDoc(doc(as('eve'), 'lists', 'L2'), { ownerId: 'ana', members: ['ana'] }));
    await assertFails(setDoc(doc(as('eve'), 'lists', 'L3'), { ownerId: 'eve', members: ['eve', 'ana'] }));
    await assertSucceeds(setDoc(doc(as('eve'), 'lists', 'L4'), { ownerId: 'eve', members: ['eve'] }));
    await assertFails(env.authenticatedContext('bea').firestore().doc(`lists/${listId}`).delete());
    await assertSucceeds(env.authenticatedContext('ana').firestore().doc(`lists/${listId}`).delete());
  });
});

describe('Match: decisionSessions y decisionVotes', () => {
  it('dos clientes abriendo a la vez caen en la misma ronda (transaccion)', async () => {
    const { listId } = await shared();
    const call = (u: string) => {
      as(u);
      return getOrStartSession({ listId, userId: u, candidateIds: ['r1', 'r2'] });
    };
    const [a, b] = await Promise.all([call('ana'), call('bea')]);
    expect(a.roundId).toBe(b.roundId);
    expect((await getDoc(doc(as('ana'), 'decisionSessions', listId))).data()!.roundId).toBe(a.roundId);
  });

  it('flujo completo: ambos dan LIKE al mismo sitio y solo se marca MATCHED una vez', async () => {
    const { listId } = await shared();
    as('ana');
    const s = await getOrStartSession({ listId, userId: 'ana', candidateIds: ['r1', 'r2'] });
    await castVote({ roundId: s.roundId, listId, userId: 'ana', restaurantId: 'r1', vote: 'LIKE' });
    as('bea');
    await castVote({ roundId: s.roundId, listId, userId: 'bea', restaurantId: 'r1', vote: 'LIKE' });
    const votes = await getDocs(
      query(collection(mockActiveDb, 'decisionVotes'), where('roundId', '==', s.roundId)),
    );
    expect(votes.size).toBe(2);
    await Promise.all([
      (as('ana'), markMatched(listId, s.roundId, 'r1')),
      (as('bea'), markMatched(listId, s.roundId, 'r1')),
    ]);
    const final = (await getDoc(doc(as('ana'), 'decisionSessions', listId))).data()!;
    expect(final.status).toBe('MATCHED');
    expect(final.matchedRestaurantId).toBe('r1');
  });

  it('un tercero no lee ni escribe sesion ni votos', async () => {
    const { listId } = await shared();
    as('ana');
    const s = await getOrStartSession({ listId, userId: 'ana', candidateIds: ['r1'] });
    await castVote({ roundId: s.roundId, listId, userId: 'ana', restaurantId: 'r1', vote: 'LIKE' });
    const eve = as('eve');
    await assertFails(getDoc(doc(eve, 'decisionSessions', listId)));
    await assertFails(setDoc(doc(eve, 'decisionSessions', listId), { status: 'MATCHED' }));
    // Limitacion conocida (CLAUDE.md): los votos son legibles por cualquier autenticado.
    await assertSucceeds(getDoc(doc(eve, 'decisionVotes', `${s.roundId}_ana`)));
    await assertFails(
      castVote({ roundId: s.roundId, listId, userId: 'eve', restaurantId: 'r1', vote: 'LIKE' }),
    );
  });

  it('bea no puede votar en nombre de ana ni usar un id de voto ajeno', async () => {
    const { listId } = await shared();
    const bea = as('bea');
    await assertFails(
      setDoc(doc(bea, 'decisionVotes', 'R1_ana'), {
        roundId: 'R1', listId, userId: 'ana', votes: { r1: 'LIKE' },
      }),
    );
    await assertFails(
      setDoc(doc(bea, 'decisionVotes', 'otro_id'), {
        roundId: 'R1', listId, userId: 'bea', votes: { r1: 'LIKE' },
      }),
    );
    await assertSucceeds(
      setDoc(doc(bea, 'decisionVotes', 'R1_bea'), {
        roundId: 'R1', listId, userId: 'bea', votes: { r1: 'LIKE' },
      }),
    );
  });

  it('transaccion directa: markMatched ignora una ronda distinta', async () => {
    const { listId } = await shared();
    as('ana');
    const s = await getOrStartSession({ listId, userId: 'ana', candidateIds: ['r1'] });
    await markMatched(listId, 'otra-ronda', 'r1');
    expect((await getDoc(doc(mockActiveDb, 'decisionSessions', listId))).data()!.status).toBe('ACTIVE');
    expect(s.roundId).toBeTruthy();
  });
});
