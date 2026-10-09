// Acceptance: features/fuentes.feature (UI-10, UI-11 del plan E2E). FontGate real con expo-font simulado y regla estatica.
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { readFileSync, readdirSync, statSync } from 'fs';

let mockFonts: [boolean, Error | null] = [false, null];
jest.mock('expo-font', () => ({ useFonts: () => mockFonts }));
jest.mock('@expo-google-fonts/young-serif', () => ({ YoungSerif_400Regular: 'young-serif' }));
jest.mock('@expo-google-fonts/figtree', () => ({
  Figtree_400Regular: 'figtree-400',
  Figtree_500Medium: 'figtree-500',
  Figtree_600SemiBold: 'figtree-600',
  Figtree_700Bold: 'figtree-700',
}));

import FontGate from '../theme/FontGate';

const feature = loadFeature('features/fuentes.feature');

function archivos(dir = 'src'): string[] {
  const out: string[] = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = `${dir}/${nombre}`;
    if (statSync(ruta).isDirectory()) {
      if (nombre !== '__tests__') out.push(...archivos(ruta));
    } else if (/\.tsx$/.test(nombre)) out.push(ruta);
  }
  return out;
}

defineFeature(feature, (test) => {
  test('La app se dibuja según el estado de las fuentes', ({ given, when, then }) => {
    let pantalla: ReturnType<typeof render>;
    given(/^que las fuentes están (cargando|cargadas|con un fallo)$/, (estado: string) => {
      mockFonts = estado === 'cargando' ? [false, null] : estado === 'cargadas' ? [true, null] : [false, new Error('sin red')];
    });
    when('Ana abre Bite', () => {
      pantalla = render(
        <FontGate>
          <Text>Contenido de Bite</Text>
        </FontGate>,
      );
    });
    then(/^(.*)$/, (resultado: string) => {
      const visible = resultado.startsWith('se dibuja');
      expect(pantalla.queryByText('Contenido de Bite') !== null).toBe(visible);
    });
  });

  test('Los títulos grandes usan la fuente de títulos', ({ given, when, then }) => {
    let lista: string[] = [];
    let hallados: string[] = [];
    given('todos los archivos de interfaz de Bite', () => {
      lista = archivos();
    });
    when('se buscan títulos grandes sin la fuente de títulos', () => {
      for (const f of lista) {
        readFileSync(f, 'utf8').split('\n').forEach((linea, i) => {
          if (/\btext-(title|hero)\b/.test(linea) && !/\bfont-display\b/.test(linea)) hallados.push(`${f}:${i + 1}: ${linea.trim()}`);
        });
      }
    });
    then('no hay ninguno', () => {
      expect(hallados).toEqual([]);
    });
  });
});
