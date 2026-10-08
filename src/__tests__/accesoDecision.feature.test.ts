// Acceptance: features/acceso-a-decision.feature (MCH-05 del plan E2E). Lógica pura, sin mocks.
import { defineFeature, loadFeature } from 'jest-cucumber';
import { canPlayMatch, needsPartner } from '../utils/matchAccess';

const feature = loadFeature('features/acceso-a-decision.feature');

defineFeature(feature, (test) => {
  let puedeJugar: boolean;
  let hacePareja: boolean;
  let sesion: { skipMode: boolean; hasUser: boolean; listId: string | null };
  let participantes: string[];

  const abre = (when: any) =>
    when('Ana abre ¿Dónde cenamos hoy?', () => {
      puedeJugar = canPlayMatch(sesion);
    });

  const pideCuenta = (then: any) =>
    then('no puede jugar y se le pide crear una cuenta y compartir su lista', () => {
      expect(puedeJugar).toBe(false);
    });

  const miraParticipantes = (when: any) =>
    when('Ana mira quién participa', () => {
      hacePareja = needsPartner(participantes);
    });

  test('Sin cuenta no se puede decidir en pareja', ({ given, when, then }) => {
    given('que Ana usa Bite sin cuenta', () => {
      sesion = { skipMode: true, hasUser: false, listId: 'device-list' };
    });
    abre(when);
    pideCuenta(then);
  });

  test('Con cuenta pero sin lista tampoco', ({ given, when, then }) => {
    given('que Ana ha iniciado sesión pero todavía no tiene lista', () => {
      sesion = { skipMode: false, hasUser: true, listId: null };
    });
    abre(when);
    pideCuenta(then);
  });

  test('Con la sesión recién iniciada pero en modo sin cuenta todavía no juega', ({ given, when, then }) => {
    given('que Ana ha iniciado sesión y tiene lista, pero Bite sigue en modo sin cuenta', () => {
      sesion = { skipMode: true, hasUser: true, listId: 'L1' };
    });
    abre(when);
    pideCuenta(then);
  });

  test('Con lista guardada pero sin sesión no juega', ({ given, when, then }) => {
    given('que Ana tiene una lista guardada pero ya no hay sesión iniciada', () => {
      sesion = { skipMode: false, hasUser: false, listId: 'L1' };
    });
    abre(when);
    pideCuenta(then);
  });

  test('Con cuenta y lista ya puede entrar', ({ given, when, then }) => {
    given('que Ana ha iniciado sesión y tiene su lista', () => {
      sesion = { skipMode: false, hasUser: true, listId: 'L1' };
    });
    abre(when);
    then('puede jugar', () => {
      expect(puedeJugar).toBe(true);
    });
  });

  test('Sola en la lista, hace falta la pareja', ({ given, when, then }) => {
    given('que Ana ha iniciado sesión y es la única persona de su ronda', () => {
      participantes = ['ana'];
    });
    miraParticipantes(when);
    then('hace falta que se una su pareja', () => {
      expect(hacePareja).toBe(true);
    });
  });

  test('Con su pareja en la ronda ya no hace falta nadie más', ({ given, when, then }) => {
    given('que Ana y Bea están en la misma ronda', () => {
      participantes = ['ana', 'bea'];
    });
    miraParticipantes(when);
    then('no hace falta nadie más', () => {
      expect(hacePareja).toBe(false);
    });
  });
});
