// Acceptance: features/compartir-lista.feature (SHL-01..04 del plan E2E), contra Firestore en memoria.
jest.mock('firebase/firestore', () => require('../../jest/fakeFirestore'));
jest.mock('../config/firebase', () => ({ db: {} }));

import { defineFeature, loadFeature } from 'jest-cucumber';
import * as fs from '../../jest/fakeFirestore';
import { createPersonalList, joinListByCode, leaveSharedList } from '../services/listService';

const fake = fs as any;
const feature = loadFeature('features/compartir-lista.feature');

beforeEach(() => fake.__reset());

defineFeature(feature, (test) => {
  test('Ana crea su lista y obtiene un código de invitación', ({ given, when, then, and }) => {
    let listId: string;

    given('que Ana todavía no tiene lista', () => {
      expect(fake.__get('users/ana')).toBeFalsy();
    });

    when('Ana crea su lista personal', async () => {
      listId = await createPersonalList('ana');
    });

    then(/^la lista tiene un código de invitación de (\d+) caracteres$/, (n: string) => {
      expect(fake.__get(`lists/${listId}`).inviteCode).toHaveLength(Number(n));
    });

    and('Ana es la única miembro de la lista', () => {
      expect(fake.__get(`lists/${listId}`).members).toEqual(['ana']);
    });
  });

  function listaDeAna() {
    return createPersonalList('ana').then((id) => ({ id, code: fake.__get(`lists/${id}`).inviteCode as string }));
  }

  test('Bea se une a la lista de Ana con el código de invitación', ({ given, when, then, and }) => {
    let lista: { id: string; code: string };

    given('que Ana tiene una lista compartible', async () => {
      lista = await listaDeAna();
    });

    when('Bea se une con el código de la lista de Ana, escrito en minúsculas y con espacios', async () => {
      await joinListByCode('bea', `  ${lista.code.toLowerCase()} `);
    });

    then('Bea y Ana son miembros de la lista', () => {
      expect(fake.__get(`lists/${lista.id}`).members).toEqual(['ana', 'bea']);
    });

    and('la lista de Bea es la de Ana', () => {
      expect(fake.__get('users/bea').sharedListId).toBe(lista.id);
    });
  });

  test('Un código inexistente no da acceso a ninguna lista', ({ given, when, then, and }) => {
    let lista: { id: string; code: string };
    let error: Error;

    given('que Ana tiene una lista compartible', async () => {
      lista = await listaDeAna();
    });

    when(/^Bea intenta unirse con el código "(.*)"$/, async (code: string) => {
      error = await joinListByCode('bea', code).then(() => { throw new Error('no debía unirse'); }, (e) => e);
    });

    then(/^Bea recibe el error "(.*)"$/, (msg: string) => {
      expect(error.message).toBe(msg);
    });

    and('Ana sigue siendo la única miembro de la lista', () => {
      expect(fake.__get(`lists/${lista.id}`).members).toEqual(['ana']);
      expect(fake.__get('users/bea')).toBeFalsy();
    });
  });

  test('Ana no puede unirse a su propia lista', ({ given, when, then, and }) => {
    let lista: { id: string; code: string };
    let error: Error;

    given('que Ana tiene una lista compartible', async () => {
      lista = await listaDeAna();
    });

    when('Ana intenta unirse con el código de su propia lista', async () => {
      error = await joinListByCode('ana', lista.code).then(() => { throw new Error('no debía unirse'); }, (e) => e);
    });

    then(/^Ana recibe el error "(.*)"$/, (msg: string) => {
      expect(error.message).toBe(msg);
    });

    and('Ana sigue siendo la única miembro de la lista', () => {
      expect(fake.__get(`lists/${lista.id}`).members).toEqual(['ana']);
    });
  });

  test('Bea deja de compartir y vuelve a tener lista propia', ({ given, when, then, and }) => {
    let lista: { id: string; code: string };
    let listaNuevaDeBea: string;

    given('que Ana tiene una lista compartible', async () => {
      lista = await listaDeAna();
    });

    and('que Bea se ha unido a la lista de Ana', async () => {
      await joinListByCode('bea', lista.code);
    });

    when('Bea deja de compartir la lista', async () => {
      listaNuevaDeBea = await leaveSharedList('bea', lista.id);
    });

    then('Bea ya no es miembro de la lista de Ana', () => {
      expect(fake.__get(`lists/${lista.id}`).members).not.toContain('bea');
    });

    and('Bea tiene una lista propia nueva distinta de la de Ana', () => {
      expect(listaNuevaDeBea).not.toBe(lista.id);
      expect(fake.__get(`lists/${listaNuevaDeBea}`).members).toEqual(['bea']);
      expect(fake.__get('users/bea').sharedListId).toBe(listaNuevaDeBea);
    });

    and('Ana sigue siendo la única miembro de la lista', () => {
      expect(fake.__get(`lists/${lista.id}`).members).toEqual(['ana']);
    });
  });
});
