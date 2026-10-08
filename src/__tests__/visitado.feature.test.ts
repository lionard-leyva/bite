// Acceptance: features/visitado.feature (VIS-03 del plan E2E), contra Firestore en memoria.
jest.mock('firebase/firestore', () => require('../../jest/fakeFirestore'));
jest.mock('../config/firebase', () => ({ db: {} }));
jest.mock('../services/imageService', () => ({ uploadPhotos: jest.fn() }));

import { defineFeature, loadFeature } from 'jest-cucumber';
import * as fs from '../../jest/fakeFirestore';
import { toggleVisited } from '../services/restaurantService';

const fake = fs as any;
const feature = loadFeature('features/visitado.feature');

const ANTES = new Date('2026-01-01T10:00:00Z');
const ids: Record<string, string> = { 'Casa Lucio': 'r1', Taco: 'r2' };
const restaurante = (name: string, visited: boolean) => ({
  name,
  address: `Calle de ${name}, 1`,
  note: `nota de ${name}`,
  rating: 4,
  visited,
  listId: 'L1',
  createdBy: 'ana',
  updatedAt: fake.timestamp(ANTES),
});

let inicial: Record<string, any>;

beforeEach(() => {
  fake.__reset();
  fake.__put('restaurants/r1', restaurante('Casa Lucio', false));
  fake.__put('restaurants/r2', restaurante('Taco', true));
  inicial = { r1: { ...fake.__get('restaurants/r1') }, r2: { ...fake.__get('restaurants/r2') } };
});

const dato = (nombre: string) => fake.__get(`restaurants/${ids[nombre]}`);

defineFeature(feature, (test) => {
  const antecedentes = (given: any) =>
    given('que la lista de Ana tiene "Casa Lucio" pendiente y "Taco" visitado', () => {
      expect(dato('Casa Lucio').visited).toBe(false);
      expect(dato('Taco').visited).toBe(true);
    });

  const marca = (when: any) => {
    when(/^Ana marca "(.*)" como visitado$/, (n: string) => toggleVisited(ids[n], true));
  };

  test('Ana marca como visitado un sitio pendiente', ({ given, when, then }) => {
    antecedentes(given);
    marca(when);
    then(/^"(.*)" figura como visitado$/, (n: string) => {
      expect(dato(n).visited).toBe(true);
    });
  });

  test('Ana devuelve a pendiente un sitio visitado', ({ given, when, then }) => {
    antecedentes(given);
    when(/^Ana marca "(.*)" como pendiente$/, (n: string) => toggleVisited(ids[n], false));
    then(/^"(.*)" figura como pendiente$/, (n: string) => {
      expect(dato(n).visited).toBe(false);
    });
  });

  test('Cambiar el estado no toca nada más', ({ given, when, then, and }) => {
    antecedentes(given);
    marca(when);
    then(/^el nombre, la dirección, la nota, la valoración y la lista de "(.*)" siguen igual$/, (n: string) => {
      const { name, address, note, rating, listId, createdBy } = inicial.r1;
      expect(dato(n)).toMatchObject({ name, address, note, rating, listId, createdBy });
    });
    and(/^"(.*)" no ha cambiado$/, (n: string) => {
      expect(dato(n)).toEqual(inicial.r2);
    });
  });

  test('Queda anotado cuándo cambió el estado', ({ given, when, then }) => {
    antecedentes(given);
    marca(when);
    then(/^la fecha de modificación de "(.*)" es posterior a la anterior$/, (n: string) => {
      expect(dato(n).updatedAt.toDate().getTime()).toBeGreaterThan(ANTES.getTime());
    });
  });
});
