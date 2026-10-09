// Acceptance: features/tema-migrado.feature (UI-05 del plan E2E). Regla estatica sobre el codigo.
import { defineFeature, loadFeature } from 'jest-cucumber';
import { readFileSync, readdirSync, statSync } from 'fs';

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
  'src/screens/SaveScreen.tsx',
  'src/components/PhotoPicker.tsx',
  'src/components/PriceSlider.tsx',
  'src/components/StarRating.tsx',
  'src/components/ConfirmModal.tsx',
  'src/screens/DetailScreen.tsx',
  'src/screens/ProfileScreen.tsx',
  'src/components/ShareListModal.tsx',
  'src/components/InviteCodeDisplay.tsx',
  'src/screens/AuthScreen.tsx',
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

// Todo .ts/.tsx de src salvo las pruebas y src/theme (donde viven los hex), mas App.tsx.
function archivosDeInterfaz(dir = 'src'): string[] {
  const out: string[] = dir === 'src' ? ['App.tsx'] : [];
  for (const nombre of readdirSync(dir)) {
    const ruta = `${dir}/${nombre}`;
    if (statSync(ruta).isDirectory()) {
      if (nombre !== '__tests__' && nombre !== 'theme') out.push(...archivosDeInterfaz(ruta));
    } else if (/\.tsx?$/.test(nombre)) out.push(ruta);
  }
  return out;
}

defineFeature(feature, (test) => {
  test('Ningún archivo de la interfaz lleva colores sueltos', ({ given, when, then }) => {
    let archivos: string[] = [];
    let hallados: string[] = [];
    given('todos los archivos de interfaz de Bite', () => {
      archivos = archivosDeInterfaz();
      expect(archivos.length).toBeGreaterThan(20);
    });
    when('se buscan colores escritos a mano en su código', () => {
      hallados = coloresSueltos(archivos);
    });
    then('no hay ninguno', () => {
      expect(hallados).toEqual([]);
    });
  });

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
