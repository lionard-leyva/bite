// Acceptance: features/compartir-lista.feature (SHL-01..04 del plan E2E), contra Firestore en memoria.
jest.mock('firebase/firestore', () => require('../../jest/fakeFirestore'));
jest.mock('../config/firebase', () => ({ db: {} }));

import { defineFeature, loadFeature } from 'jest-cucumber';
import * as fs from '../../jest/fakeFirestore';
import { createPersonalList } from '../services/listService';

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
});
