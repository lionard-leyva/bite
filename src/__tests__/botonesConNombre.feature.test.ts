// Acceptance: features/botones-con-nombre.feature (UI-08 del plan E2E). Regla estatica sobre el codigo.
import { defineFeature, loadFeature } from 'jest-cucumber';
import { readFileSync, readdirSync, statSync } from 'fs';

const feature = loadFeature('features/botones-con-nombre.feature');

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

// Un <Pressable ...>...</Pressable> con un icono, sin texto y sin accessibilityLabel.
export function botonesSinNombre(files: string[]): string[] {
  const out: string[] = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    const re = /<(Pressable|TouchableOpacity)\b[\s\S]*?<\/\1>/g;
    for (const m of src.matchAll(re)) {
      const bloque = m[0];
      if (/<Ionicons\b/.test(bloque) && !/<Text\b/.test(bloque) && !/accessibilityLabel=/.test(bloque)) {
        const linea = src.slice(0, m.index).split('\n').length;
        out.push(`${f}:${linea}`);
      }
    }
  }
  return out;
}

defineFeature(feature, (test) => {
  test('Ningún botón de solo icono se queda sin etiqueta', ({ given, when, then }) => {
    let lista: string[] = [];
    let hallados: string[] = [];
    given('todos los archivos de interfaz de Bite', () => {
      lista = archivos();
      expect(lista.length).toBeGreaterThan(20);
    });
    when('se buscan botones que solo llevan un icono y no tienen etiqueta', () => {
      hallados = botonesSinNombre(lista);
    });
    then('no hay ninguno', () => {
      expect(hallados).toEqual([]);
    });
  });
});
