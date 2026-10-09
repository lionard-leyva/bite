// Acceptance: features/tema.feature (UI-01..UI-03 del plan E2E). Paleta real, contraste WCAG medido y Tailwind real.
import { defineFeature, loadFeature } from 'jest-cucumber';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import { palette } from '../theme/palette';

const feature = loadFeature('features/tema.feature');

type Tema = 'claro' | 'oscuro';
const clave = (t: Tema) => (t === 'claro' ? 'light' : 'dark');

function luminancia(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = c.map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contraste(a: string, b: string): number {
  const [hi, lo] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Texto y el fondo que lo lleva. Los colores de marca se usan como texto (enlaces) sobre fondo y tarjeta.
const TEXTOS: Array<[string, string]> = [
  ['text-primary', 'background'], ['text-primary', 'surface'],
  ['text-secondary', 'background'], ['text-secondary', 'surface'],
  ['text-tertiary', 'background'], ['text-tertiary', 'surface'],
  ['on-primary', 'primary'], ['on-visited', 'visited'], ['on-danger', 'danger'],
  ['primary', 'background'], ['primary', 'surface'], ['visited', 'background'], ['danger', 'surface'],
];

async function compilar(clase: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const config = require('../../tailwind.config.js');
  const res = await postcss([tailwindcss({ ...config, content: [{ raw: clase, extension: 'html' }] })]).process(
    '@tailwind utilities;',
    { from: undefined },
  );
  return res.css;
}

defineFeature(feature, (test) => {
  const pruebaDeTexto = (tema: Tema) => ({ given, when, then }: any) => {
    let colores: Record<string, string>;
    let bajos: string[] = [];
    given(`la paleta de Bite en el tema "${tema}"`, () => {
      colores = (palette as any)[clave(tema)];
    });
    when('se mide el contraste de cada texto con el fondo que lo lleva', () => {
      bajos = TEXTOS.filter(([fg, bg]) => contraste(colores[fg], colores[bg]) < 4.5).map(
        ([fg, bg]) => `${fg} ${colores[fg]} sobre ${bg} ${colores[bg]}: ${contraste(colores[fg], colores[bg]).toFixed(2)}`,
      );
    });
    then('ningún texto baja de 4,5 a 1', () => {
      expect(bajos).toEqual([]);
    });
  };

  test('En el tema claro todos los textos cumplen el contraste mínimo', pruebaDeTexto('claro'));
  test('En el tema oscuro todos los textos cumplen el contraste mínimo', pruebaDeTexto('oscuro'));

  test('Los colores gráficos se distinguen del fondo', ({ given, when, then }) => {
    let colores: Record<string, string>;
    let ratio = 0;
    given('la paleta de Bite en el tema "claro"', () => {
      colores = palette.light;
    });
    when('se mide el contraste de las estrellas con la tarjeta', () => {
      ratio = contraste(colores.star, colores.surface);
    });
    then('las estrellas no bajan de 3 a 1', () => {
      expect(ratio).toBeGreaterThanOrEqual(3);
    });
  });

  test('Cada color existe en el tema claro y en el oscuro', ({ given, when, then }) => {
    let claves: [string[], string[]];
    given('la paleta de Bite', () => {
      expect(palette).toBeDefined();
    });
    when('se comparan los colores del tema claro y del oscuro', () => {
      claves = [Object.keys(palette.light).sort(), Object.keys(palette.dark).sort()];
    });
    then('los dos temas tienen exactamente los mismos colores', () => {
      expect(claves[1]).toEqual(claves[0]);
      expect(claves[0].length).toBeGreaterThan(10);
      for (const t of [palette.light, palette.dark]) {
        for (const v of Object.values(t)) expect(v).toMatch(/^#[0-9A-F]{6}$/);
      }
    });
  });

  test('Los dos temas no son un simple invertido', ({ given, when, then, and }) => {
    given('la paleta de Bite', () => {});
    when('se comparan el fondo y la marca de los dos temas', () => {});
    then('el fondo oscuro es oscuro y el claro es claro', () => {
      expect(luminancia(palette.dark.background)).toBeLessThan(0.05);
      expect(luminancia(palette.light.background)).toBeGreaterThan(0.8);
    });
    and('la marca es distinta en cada tema para seguir cumpliendo el contraste', () => {
      expect(palette.dark.primary).not.toBe(palette.light.primary);
      // Un invertido literal dejaria el texto de marca ilegible: cada tema ajusta su marca a su fondo.
      expect(contraste(palette.dark.primary, palette.dark.background)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(palette.light.primary, palette.light.background)).toBeGreaterThanOrEqual(4.5);
    });
  });

  test('Las clases de color de Tailwind leen las variables del tema', ({ given, when, then }) => {
    let css = '';
    given('el Tailwind real de Bite', () => {});
    when('se compila la clase "bg-background"', async () => {
      css = await compilar('bg-background');
    });
    then('el color sale de la variable "--color-background"', () => {
      expect(css).toContain('var(--color-background)');
      expect(css).toMatch(/background-color:\s*rgb\(var\(--color-background\)/);
    });
  });

  test('Los colores aceptan transparencia', ({ given, when, then }) => {
    let css = '';
    given('el Tailwind real de Bite', () => {});
    when('se compila la clase "bg-primary/10"', async () => {
      css = await compilar('bg-primary/10');
    });
    then('el color sale de la variable "--color-primary" con un 10 % de opacidad', () => {
      expect(css).toMatch(/background-color:\s*rgb\(var\(--color-primary\)\s*\/\s*0\.1\)/);
    });
  });
});
