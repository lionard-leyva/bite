// Acceptance: features/perfil-coordenadas.feature (PRF-02 del plan E2E). Funcion pura buildProfilePayload.
import { defineFeature, loadFeature } from 'jest-cucumber';

jest.mock('firebase/firestore', () => ({ deleteField: () => 'BORRAR' }));

import { buildProfilePayload } from '../utils/profilePayload';

const feature = loadFeature('features/perfil-coordenadas.feature');

const base = { displayName: 'Ana', bio: '', birthday: '', address: '', photoURL: null };

defineFeature(feature, (test) => {
  let payload: Record<string, unknown>;
  const perfil = (over: Record<string, unknown>) => ({
    ...base,
    city: 'Madrid',
    cityLat: 40.4168,
    cityLng: -3.7038,
    addressLat: null,
    addressLng: null,
    ...over,
  });

  test('Escribir otra ciudad a mano borra las coordenadas de la anterior', ({ given, when, then, and }) => {
    given('que el perfil de Ana tiene la ciudad "Madrid" con sus coordenadas', () => {});
    when('Ana escribe la ciudad "Valencia" a mano y guarda los cambios', () => {
      payload = buildProfilePayload(perfil({ city: 'Valencia', cityLat: null, cityLng: null }));
    });
    then('la ciudad guardada es "Valencia"', () => {
      expect(payload.city).toBe('Valencia');
    });
    and('las coordenadas de la ciudad se borran en vez de quedarse las de Madrid', () => {
      expect(payload.cityLat).toBe('BORRAR');
      expect(payload.cityLng).toBe('BORRAR');
    });
  });

  test('Elegir una ciudad con coordenadas las guarda', ({ given, when, then }) => {
    given('que el perfil de Ana tiene la ciudad "Madrid" con sus coordenadas', () => {});
    when('Ana elige "Valencia" con sus coordenadas y guarda los cambios', () => {
      payload = buildProfilePayload(perfil({ city: 'Valencia', cityLat: 39.4699, cityLng: -0.3763 }));
    });
    then('se guardan las coordenadas de "Valencia"', () => {
      expect(payload.cityLat).toBe(39.4699);
      expect(payload.cityLng).toBe(-0.3763);
    });
  });

  test('Cambiar la dirección a mano borra también sus coordenadas', ({ given, when, then }) => {
    given('que el perfil de Ana tiene la dirección "Calle Mayor 1" con sus coordenadas', () => {});
    when('Ana escribe la dirección "Gran Vía 2" a mano y guarda los cambios', () => {
      payload = buildProfilePayload(perfil({ address: 'Gran Vía 2', addressLat: null, addressLng: null }));
    });
    then('las coordenadas de la dirección se borran en vez de quedarse las de la anterior', () => {
      expect(payload.addressLat).toBe('BORRAR');
      expect(payload.addressLng).toBe('BORRAR');
    });
  });
});
