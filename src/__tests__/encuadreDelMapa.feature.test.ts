// Acceptance: features/encuadre-del-mapa.feature (MAP-07 y MAP-08 del plan E2E). Reglas puras de utils/mapFocus.
import { defineFeature, loadFeature } from 'jest-cucumber';
import { focusTargets, newRestaurantToFocus, type FocusPin } from '../utils/mapFocus';

const feature = loadFeature('features/encuadre-del-mapa.feature');

const MADRID = { latitude: 40.4168, longitude: -3.7038 };
const LUGAR: Record<string, { latitude: number; longitude: number }> = {
  'Casa Lucio': { latitude: 40.4137, longitude: -3.7081 },
  'Sobrino de Botín': { latitude: 40.4141, longitude: -3.7075 },
  'Sushi Tokio': { latitude: 35.6762, longitude: 139.6503 },
  'Ramen Shibuya': { latitude: 35.6595, longitude: 139.7005 },
  'Mesón de Alcalá': { latitude: 40.4818, longitude: -3.3635 },
  'Tapas Barcelona': { latitude: 41.3874, longitude: 2.1686 },
};
const AHORA = Date.now();
const hace = (ms: number) => new Date(AHORA - ms);
const HORA = 3600_000;
const DIA = 24 * HORA;

const pin = (name: string, createdAt: Date = hace(DIA)): FocusPin & { name: string } => ({
  id: name,
  name,
  ...LUGAR[name],
  createdAt,
});
const nombres = (lista: Array<{ id: string }>) => lista.map((p) => p.id).sort();

defineFeature(feature, (test) => {
  let usuario: { latitude: number; longitude: number } | null;
  let guardados: FocusPin[];
  let encuadrados: FocusPin[];

  const encuadra = (when: any) =>
    when('Bite elige qué encuadrar en el mapa', () => {
      encuadrados = focusTargets(guardados, usuario);
    });

  test('Los sitios lejanos no alejan el mapa de donde estás', ({ given, and, when, then }) => {
    given('que Ana está en Madrid', () => {
      usuario = MADRID;
    });
    and('que tiene guardados "Casa Lucio" y "Sobrino de Botín" en Madrid y "Sushi Tokio" en Tokio guardado hace un minuto', () => {
      guardados = [pin('Casa Lucio'), pin('Sobrino de Botín'), pin('Sushi Tokio', hace(60_000))];
    });
    encuadra(when);
    then('encuadra "Casa Lucio" y "Sobrino de Botín"', () => {
      expect(nombres(encuadrados)).toEqual(['Casa Lucio', 'Sobrino de Botín']);
    });
    and('no encuadra "Sushi Tokio"', () => {
      expect(nombres(encuadrados)).not.toContain('Sushi Tokio');
    });
  });

  test('Cerca es una escapada de unas decenas de kilómetros, no otra ciudad lejana', ({ given, and, when, then }) => {
    given('que Ana está en Madrid', () => {
      usuario = MADRID;
    });
    and('que tiene guardados "Casa Lucio" en Madrid, "Mesón de Alcalá" a 30 km y "Tapas Barcelona" a 500 km', () => {
      guardados = [pin('Casa Lucio'), pin('Mesón de Alcalá'), pin('Tapas Barcelona')];
    });
    encuadra(when);
    then('encuadra "Casa Lucio" y "Mesón de Alcalá"', () => {
      expect(nombres(encuadrados)).toEqual(['Casa Lucio', 'Mesón de Alcalá']);
    });
    and('no encuadra "Tapas Barcelona"', () => {
      expect(nombres(encuadrados)).not.toContain('Tapas Barcelona');
    });
  });

  test('Sin ubicación, el mapa se centra en la zona del último sitio guardado', ({ given, and, when, then }) => {
    given('que Bite no sabe dónde está Ana', () => {
      usuario = null;
    });
    and('que tiene guardados "Sushi Tokio" hace una semana y "Casa Lucio" y "Sobrino de Botín" en Madrid ayer', () => {
      guardados = [pin('Sushi Tokio', hace(7 * DIA)), pin('Casa Lucio', hace(DIA)), pin('Sobrino de Botín', hace(DIA + HORA))];
    });
    encuadra(when);
    then('encuadra "Casa Lucio" y "Sobrino de Botín"', () => {
      expect(nombres(encuadrados)).toEqual(['Casa Lucio', 'Sobrino de Botín']);
    });
    and('no encuadra "Sushi Tokio"', () => {
      expect(nombres(encuadrados)).not.toContain('Sushi Tokio');
    });
  });

  test('Si todo queda lejos de ti, se ven todos', ({ given, and, when, then }) => {
    given('que Ana está en Madrid', () => {
      usuario = MADRID;
    });
    and('que tiene guardados "Sushi Tokio" y "Ramen Shibuya" en Tokio', () => {
      guardados = [pin('Sushi Tokio'), pin('Ramen Shibuya')];
    });
    encuadra(when);
    then('encuadra "Sushi Tokio" y "Ramen Shibuya"', () => {
      expect(nombres(encuadrados)).toEqual(['Ramen Shibuya', 'Sushi Tokio']);
    });
  });

  // --- MAP-08 ---
  let conocidos: Set<string> | null;
  let lista: FocusPin[];
  let enfocado: FocusPin | null;

  test('Un restaurante recién guardado se enfoca aunque esté lejos', ({ given, when, then }) => {
    given('que el mapa de Ana ya conocía "Casa Lucio"', () => {
      conocidos = new Set(['Casa Lucio']);
      lista = [pin('Casa Lucio')];
    });
    when('Ana guarda "Sushi Tokio" y vuelve al mapa', () => {
      lista = [...lista, pin('Sushi Tokio', hace(1000))];
      enfocado = newRestaurantToFocus(conocidos, lista);
    });
    then('el mapa se enfoca en "Sushi Tokio"', () => {
      expect(enfocado?.id).toBe('Sushi Tokio');
    });
  });

  test('Al abrir el mapa por primera vez ningún sitio cuenta como nuevo', ({ given, when, then }) => {
    given('que el mapa de Ana todavía no conocía ningún restaurante', () => {
      conocidos = null;
    });
    when('le llegan "Casa Lucio" y "Sobrino de Botín"', () => {
      enfocado = newRestaurantToFocus(conocidos, [pin('Casa Lucio'), pin('Sobrino de Botín')]);
    });
    then('el mapa no se enfoca en ninguno por ser nuevo', () => {
      expect(enfocado).toBeNull();
    });
  });

  test('Si aparecen dos a la vez se enfoca el último guardado', ({ given, when, then }) => {
    given('que el mapa de Ana ya conocía "Casa Lucio"', () => {
      conocidos = new Set(['Casa Lucio']);
      lista = [pin('Casa Lucio')];
    });
    when('le llegan "Sobrino de Botín" guardado hace una hora y "Sushi Tokio" guardado hace un minuto', () => {
      lista = [...lista, pin('Sobrino de Botín', hace(HORA)), pin('Sushi Tokio', hace(60_000))];
      enfocado = newRestaurantToFocus(conocidos, lista);
    });
    then('el mapa se enfoca en "Sushi Tokio"', () => {
      expect(enfocado?.id).toBe('Sushi Tokio');
    });
  });

  test('Si no hay restaurantes nuevos el mapa no se mueve', ({ given, when, then }) => {
    given('que el mapa de Ana ya conocía "Casa Lucio"', () => {
      conocidos = new Set(['Casa Lucio']);
      lista = [pin('Casa Lucio')];
    });
    when('vuelve a leer la misma lista', () => {
      enfocado = newRestaurantToFocus(conocidos, lista);
    });
    then('el mapa no se enfoca en ninguno por ser nuevo', () => {
      expect(enfocado).toBeNull();
    });
  });
});
