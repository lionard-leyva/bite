// Acceptance: features/campos-de-texto.feature (KBD-03 del plan E2E). Regla estatica sobre el codigo fuente.
import * as fs from 'fs';
import * as path from 'path';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { auditarCamposDeTexto, problemaDeAltura } from './helpers/textInputAudit';

const feature = loadFeature('features/campos-de-texto.feature');

function archivosFuente(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : archivosFuente(p);
    return /\.tsx$/.test(e.name) ? [p] : [];
  });
}

defineFeature(feature, (test) => {
  test('Ningún campo fija una altura menor que su interlineado', ({ given, when, then }) => {
    let archivos: string[] = [];
    let fallos: string[] = [];
    let revisados = 0;

    given('el código de todas las pantallas y componentes de Bite', () => {
      archivos = archivosFuente(path.resolve(__dirname, '..'));
      expect(archivos.length).toBeGreaterThan(5);
    });
    when('se revisan los campos de texto', () => {
      for (const f of archivos) {
        const { campos, problemas } = auditarCamposDeTexto(fs.readFileSync(f, 'utf8'));
        revisados += campos;
        fallos.push(...problemas.map((p) => `${path.relative(process.cwd(), f)}:${p.linea} ${p.problema}`));
      }
    });
    then('ninguno fija una altura menor que el interlineado de su texto', () => {
      // Si la auditoria no encuentra campos, la regla no estaria mirando nada.
      expect(revisados).toBeGreaterThan(8);
      expect(fallos).toEqual([]);
    });
  });

  test('La regla detecta un campo mal hecho', ({ given, when, then }) => {
    let campo: { height?: number; minHeight?: number; lineHeight?: number } = {};
    let resultado: string | null = null;
    given(/^un campo de texto con altura (\d+) e interlineado (\d+)$/, (h: string, l: string) => {
      campo = { height: Number(h), lineHeight: Number(l) };
    });
    when('se revisa ese campo', () => {
      resultado = problemaDeAltura(campo);
    });
    then('se señala como incorrecto', () => {
      expect(resultado).not.toBeNull();
    });
  });

  test('Un campo con altura mínima suficiente es correcto', ({ given, when, then }) => {
    let campo: { height?: number; minHeight?: number; lineHeight?: number } = {};
    let resultado: string | null = null;
    given(/^un campo de texto con altura mínima (\d+) e interlineado (\d+)$/, (h: string, l: string) => {
      campo = { minHeight: Number(h), lineHeight: Number(l) };
    });
    when('se revisa ese campo', () => {
      resultado = problemaDeAltura(campo);
    });
    then('no se señala', () => {
      expect(resultado).toBeNull();
    });
  });

  test('Un campo con altura igual al interlineado es correcto', ({ given, when, then }) => {
    let campo: { height?: number; lineHeight?: number } = {};
    let resultado: string | null = null;
    given(/^un campo de texto con altura (\d+) e interlineado (\d+)$/, (h: string, l: string) => {
      campo = { height: Number(h), lineHeight: Number(l) };
    });
    when('se revisa ese campo', () => {
      resultado = problemaDeAltura(campo);
    });
    then('no se señala', () => {
      expect(resultado).toBeNull();
    });
  });

  test('Se señala un campo cuyo estilo está definido aparte', ({ given, when, then }) => {
    let codigo = '';
    let resultado: ReturnType<typeof auditarCamposDeTexto>;
    given(/^el código de una pantalla donde el campo usa el estilo "(\w+)" con altura (\d+) y letra de (\d+)$/, (clave: string, h: string, f: string) => {
      codigo = `const estilos = { otro: { height: 99 }, ${clave}: { flex: 1, fontSize: ${f}, height: ${h} } };\n` +
        `export default () => <TextInput value={v} onChangeText={(t) => set(t)} style={estilos.${clave}} />;`;
    });
    when('se revisa ese código', () => {
      resultado = auditarCamposDeTexto(codigo);
    });
    then(/^se señala (\d+) campo incorrecto$/, (n: string) => {
      expect(resultado.campos).toBe(1);
      expect(resultado.problemas).toHaveLength(Number(n));
    });
  });

  test('Una altura mínima en el código no se señala', ({ given, when, then }) => {
    let codigo = '';
    let resultado: ReturnType<typeof auditarCamposDeTexto>;
    given(/^el código de una pantalla donde el campo usa una altura mínima de (\d+) y un interlineado de (\d+)$/, (h: string, l: string) => {
      codigo = `export default () => <TextInput style={{ minHeight: ${h}, lineHeight: ${l} }} />;`;
    });
    when('se revisa ese código', () => {
      resultado = auditarCamposDeTexto(codigo);
    });
    then('no se señala ningún campo', () => {
      expect(resultado.campos).toBe(1);
      expect(resultado.problemas).toEqual([]);
    });
  });
});
