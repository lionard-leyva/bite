// Acceptance: features/guardar-desde-compartir.feature (SHR-01, 02 y 04 del plan E2E). Lógica pura, sin mocks.
import { defineFeature, loadFeature } from 'jest-cucumber';
import {
  parseSharedText,
  mergeResolvedMapsUrl,
  sourceLabel,
  cleanUrl,
  type ParsedShare,
} from '../utils/shareParser';

const feature = loadFeature('features/guardar-desde-compartir.feature');

const mapsLargo = (name: string, lat: string, lng: string) =>
  `https://www.google.com/maps/place/${name.replace(/ /g, '+')}/@40.4,-3.7,17z/data=!3d${lat}!4d${lng}`;

defineFeature(feature, (test) => {
  let parsed: ParsedShare;
  let texto: string;

  const interpretar = (when: any) =>
    when('Bite interpreta lo compartido', () => {
      parsed = parseSharedText(texto)!;
    });

  const nombreEs = (then: any) =>
    then(/^el nombre propuesto es "(.*)"$/, (name: string) => {
      expect(parsed.name).toBe(name);
    });

  const origenEs = (then: any) =>
    then(/^el origen es "(.*)"$/, (label: string) => {
      expect(sourceLabel(parsed.source)).toBe(label);
    });

  const llegaConNombreYUbicacion = (then: any) =>
    then('el sitio llega con nombre y ubicación', () => {
      expect(parsed.name).toBeTruthy();
      expect(parsed.latitude).not.toBeNull();
      expect(parsed.longitude).not.toBeNull();
    });

  const sinResolver = (and: any) =>
    and('no hace falta resolver el enlace', () => {
      expect(parsed.needsResolve).toBe(false);
    });

  const sinNombre = (then: any) =>
    then('no hay nombre propuesto', () => {
      expect(parsed.name).toBeNull();
    });

  test('Un enlace largo de Google Maps trae el nombre y la ubicación exacta', ({ given, when, then, and }) => {
    given(/^que Ana comparte el enlace largo de Google Maps de "(.*)" con la ubicación (.*), (.*)$/, (n: string, lat: string, lng: string) => {
      texto = mapsLargo(n, lat, lng);
    });
    interpretar(when);
    origenEs(then);
    nombreEs(and);
    and(/^la ubicación es (.*), (.*)$/, (lat: string, lng: string) => {
      expect([parsed.latitude, parsed.longitude]).toEqual([Number(lat), Number(lng)]);
    });
    sinResolver(and);
  });

  test('Con la ubicación de Maps el sitio se puede guardar sin buscarlo', ({ given, when, then }) => {
    given(/^que Ana comparte el enlace largo de Google Maps de "(.*)" con la ubicación (.*), (.*)$/, (n: string, lat: string, lng: string) => {
      texto = mapsLargo(n, lat, lng);
    });
    interpretar(when);
    llegaConNombreYUbicacion(then);
  });

  test('Un enlace corto de Maps se completa al resolver su destino', ({ given, when, then, and }) => {
    given(/^que Ana comparte "(.*)" con un enlace corto de Google Maps$/, (n: string) => {
      texto = `${n}\nhttps://maps.app.goo.gl/AbC123`;
    });
    interpretar(when);
    then('el enlace corto hay que resolverlo y todavía no tiene ubicación', () => {
      expect(parsed.needsResolve).toBe(true);
      expect(parsed.latitude).toBeNull();
    });
    when(/^el enlace corto se resuelve a la ficha de "(.*)" en (.*), (.*)$/, (n: string, lat: string, lng: string) => {
      parsed = mergeResolvedMapsUrl(parsed, mapsLargo(n, lat, lng));
    });
    llegaConNombreYUbicacion(then);
    sinResolver(and);
  });

  test('Sin ubicación el sitio debe confirmarse en el buscador', ({ given, when, then, and }) => {
    given(/^que Ana comparte el texto "(.*)"$/, (t: string) => {
      texto = t;
    });
    interpretar(when);
    nombreEs(then);
    and('el sitio llega sin ubicación', () => {
      expect(parsed.latitude).toBeNull();
      expect(parsed.longitude).toBeNull();
    });
  });

  test('Un reel de Instagram solo con enlace no inventa nombre', ({ given, when, then, and }) => {
    given(/^que Ana comparte el texto "(.*)"$/, (t: string) => {
      texto = t;
    });
    interpretar(when);
    origenEs(then);
    sinNombre(and);
    and(/^el enlace para la nota es "(.*)"$/, (url: string) => {
      expect(cleanUrl(parsed.url!)).toBe(url);
    });
  });

  test('Un TikTok con descripción corta propone el nombre', ({ given, when, then, and }) => {
    given(/^que Ana comparte el texto "(.*)"$/, (t: string) => {
      texto = t;
    });
    interpretar(when);
    origenEs(then);
    nombreEs(and);
  });

  test('Una descripción larga no se toma por nombre', ({ given, when, then }) => {
    given(/^que Ana comparte el texto "(.*)"$/, (t: string) => {
      texto = t;
    });
    interpretar(when);
    sinNombre(then);
  });
});
