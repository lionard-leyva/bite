// SHL-01..03 del plan E2E: listas compartidas contra Firestore en memoria.
jest.mock('firebase/firestore', () => require('../../jest/fakeFirestore'));
jest.mock('../config/firebase', () => ({ db: {} }));

import * as fs from '../../jest/fakeFirestore';
import {
  createPersonalList,
  ensureUserList,
  joinListByCode,
  leaveSharedList,
  getListMembers,
} from '../services/listService';

const fake = fs as any;

beforeEach(() => fake.__reset());

describe('listService', () => {
  it('crea lista personal con inviteCode de 6 chars uppercase sin ambiguos', async () => {
    const listId = await createPersonalList('ana');
    const list = fake.__get(`lists/${listId}`);
    expect(list.members).toEqual(['ana']);
    expect(list.inviteCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(fake.__get('users/ana').sharedListId).toBe(listId);
  });

  it('ensureUserList reutiliza la lista existente y no duplica', async () => {
    const first = await ensureUserList('ana');
    const second = await ensureUserList('ana');
    expect(second).toBe(first);
  });

  it('ensureUserList recupera una lista donde ya es miembro si falta sharedListId', async () => {
    fake.__put('lists/L1', { members: ['ana'], ownerId: 'ana', inviteCode: 'ABCDEF' });
    expect(await ensureUserList('ana')).toBe('L1');
    expect(fake.__get('users/ana').sharedListId).toBe('L1');
  });

  it('unirse con codigo valido (minusculas y espacios) anade a members y sharedListId', async () => {
    fake.__put('users/ana', { displayName: 'Ana' });
    const listId = await createPersonalList('ana');
    const code = fake.__get(`lists/${listId}`).inviteCode;

    const res = await joinListByCode('bea', `  ${code.toLowerCase()} `);
    expect(res).toEqual({ listId, ownerName: 'Ana' });
    expect(fake.__get(`lists/${listId}`).members).toEqual(['ana', 'bea']);
    expect(fake.__get('users/bea').sharedListId).toBe(listId);
  });

  it('codigo inexistente da error', async () => {
    await expect(joinListByCode('bea', 'ZZZZZZ')).rejects.toThrow('Codigo no encontrado');
  });

  it('unirse a la propia lista da error', async () => {
    const listId = await createPersonalList('ana');
    const code = fake.__get(`lists/${listId}`).inviteCode;
    await expect(joinListByCode('ana', code)).rejects.toThrow('Ya eres miembro');
  });

  it('dejar de compartir quita de members y crea lista propia nueva', async () => {
    const listId = await createPersonalList('ana');
    await joinListByCode('bea', fake.__get(`lists/${listId}`).inviteCode);

    const newId = await leaveSharedList('bea', listId);
    expect(newId).not.toBe(listId);
    expect(fake.__get(`lists/${listId}`).members).toEqual(['ana']);
    expect(fake.__get('users/bea').sharedListId).toBe(newId);
  });

  it('getListMembers devuelve los miembros con perfil', async () => {
    fake.__put('users/ana', { email: 'ana@x.com', displayName: 'Ana' });
    fake.__put('lists/L1', { members: ['ana', 'sin-perfil'] });
    expect(await getListMembers('L1')).toEqual([{ userId: 'ana', email: 'ana@x.com', displayName: 'Ana' }]);
  });
});
