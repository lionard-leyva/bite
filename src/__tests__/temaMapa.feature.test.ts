// Acceptance: features/tema-mapa.feature (UI-06 del plan E2E). Estilo del mapa real sobre la paleta real.
import { defineFeature, loadFeature } from 'jest-cucumber';
import { palette } from '../theme/palette';
import { mapStyle } from '../theme/mapStyle';
import { withAlpha } from '../theme/color';

const feature = loadFeature('features/tema-mapa.feature');

defineFeature(feature, (test) => {
  test('El estilo del mapa solo usa colores de la paleta del tema', ({ given, when, then, and }) => {
    let colores: Record<string, string>;
    let estilo: any[];
    given(/^el tema "(.*)" de Bite$/, (tema: string) => {
      colores = (palette as any)[tema === 'claro' ? 'light' : 'dark'];
    });
    when('se construye el estilo del mapa', () => {
      estilo = mapStyle(colores as any);
    });
    then('el terreno del mapa es el fondo de la app', () => {
      const terreno = estilo.find((r) => r.featureType === undefined && r.elementType === 'geometry');
      expect(terreno.stylers[0].color).toBe(colores.background);
    });
    and('todos los colores del estilo son colores de la paleta de ese tema', () => {
      const usados = estilo.flatMap((r) => r.stylers).map((s: any) => s.color).filter(Boolean);
      expect(usados.length).toBeGreaterThan(0);
      expect(usados.filter((c: string) => !Object.values(colores).includes(c))).toEqual([]);
    });
    and('el agua y los parques tienen su propio color', () => {
      const color = (tipo: string) => estilo.find((r) => r.featureType === tipo && r.elementType === 'geometry').stylers.find((s: any) => s.color).color;
      expect(color('water')).toBe(colores['map-water']);
      expect(color('poi.park')).toBe(colores['map-park']);
      expect(colores['map-water']).not.toBe(colores['map-park']);
    });
  });
});

describe('withAlpha', () => {
  it('convierte un hex en rgba con la opacidad pedida', () => {
    expect(withAlpha('#2A1D1A', 0.5)).toBe('rgba(42, 29, 26, 0.5)');
  });
});
