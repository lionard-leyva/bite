// Acceptance: features/tema-migrado.feature (UI-05 del plan E2E). Regla estatica sobre el codigo.
import { defineFeature, loadFeature } from 'jest-cucumber';
import { readFileSync } from 'fs';

const feature = loadFeature('features/tema-migrado.feature');

// Crece con cada pantalla migrada (un commit por pantalla).
export const MIGRADOS = [
  'src/components/RestaurantCard.tsx',
  'src/components/FilterButtons.tsx',
  'src/components/SearchBar.tsx',
  'src/components/FAB.tsx',
  'src/screens/ListScreen.tsx',
  'src/screens/HomeScreen.tsx',
  'src/components/MapDetailCard.tsx',
  'src/components/MapMarker.tsx',
  'src/components/UserLocationMarker.tsx',
  'src/components/MatchEntryCard.tsx',
  'src/components/LocationNotice.tsx',
  'src/components/DragHandle.tsx',
  'src/screens/MatchScreen.tsx',
];

// Hex, rgb()/rgba(), nombres sueltos y paletas por defecto de Tailwind (text-red-600).
const SUELTO =
  /#[0-9a-fA-F]{3,8}\b|\brgba?\(|['"](white|black|red|gray|grey)['"]|\b(?:text|bg|border|ring)-(?:red|orange|amber|yellow|green|blue|gray|slate|zinc|neutral|white|black)(?:-\d{2,3})?\b/;

export function coloresSueltos(archivos: string[]): string[] {
  const out: string[] = [];
  for (const f of archivos) {
    readFileSync(f, 'utf8')
      .split('\n')
      .forEach((linea, i) => {
        if (SUELTO.test(linea)) out.push(`${f}:${i + 1}: ${linea.trim()}`);
      });
  }
  return out;
}

defineFeature(feature, (test) => {
  test('Los archivos migrados no llevan colores sueltos', ({ given, when, then }) => {
    let archivos: string[] = [];
    let hallados: string[] = [];
    given('los archivos de interfaz ya migrados al tema', () => {
      archivos = MIGRADOS;
    });
    when('se buscan colores escritos a mano en su código', () => {
      hallados = coloresSueltos(archivos);
    });
    then('no hay ninguno', () => {
      expect(hallados).toEqual([]);
    });
  });
});
