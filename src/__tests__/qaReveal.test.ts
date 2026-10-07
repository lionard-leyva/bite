// revealLabel: los nodos fuera de pantalla no salen en el volcado de uiautomator (E2E de CI: el volcado de la pantalla
// Guardar termina en "NOTA (OPCIONAL)" y el boton "Guardar" no esta). Hay que deslizar hasta que aparezca.
// Se prueba con un `adb` falso en el PATH: 'exec-out cat' devuelve un volcado segun los swipes recibidos.
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const PKG = 'com.lionardleyva.bite';
const tree = (...labels: string[]) =>
  '<hierarchy>' +
  labels
    .map(
      (t) =>
        `<node text="${t}" content-desc="" class="t" package="${PKG}" clickable="false" bounds="[0,100][500,200]"/>`,
    )
    .join('') +
  '</hierarchy>';

let dir: string;

function fakeAdb(appearsAfterSwipes: number | null) {
  const swipes = path.join(dir, 'swipes');
  fs.writeFileSync(swipes, '');
  const withButton = tree('Guardar restaurante', 'NOTA (OPCIONAL)', 'Guardar');
  const without = tree('Guardar restaurante', 'NOTA (OPCIONAL)');
  const script = `#!/bin/sh
case "$*" in
  *swipe*) echo x >> "${swipes}" ;;
  *"exec-out cat"*)
    n=$(wc -l < "${swipes}")
    if [ "${appearsAfterSwipes}" != "null" ] && [ "$n" -ge "${appearsAfterSwipes}" ]; then printf '%s' '${withButton}'; else printf '%s' '${without}'; fi ;;
esac
exit 0
`;
  fs.writeFileSync(path.join(dir, 'adb'), script, { mode: 0o755 });
  return () => fs.readFileSync(swipes, 'utf8').split('\n').filter(Boolean).length;
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-adb-'));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

// El sandbox de Jest no propaga process.env.PATH a los procesos hijo: se ejecuta el helper real en un Node aparte.
const reveal = (label: string, max?: number): { text: string } | null => {
  const adbModule = path.resolve(__dirname, '../../scripts/qa/adb');
  const code = `require(${JSON.stringify(adbModule)}).revealLabel(${JSON.stringify(label)}, ${max ?? 'undefined'})` +
    `.then((h) => console.log(JSON.stringify(h || null)))`;
  const out = execFileSync(process.execPath, ['-e', code], {
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
    encoding: 'utf8',
    timeout: 20000,
  });
  return JSON.parse(out.trim().split('\n').pop() as string);
};

describe('revealLabel', () => {
  it('desliza hasta que el boton entra en el arbol y lo devuelve', () => {
    const swipes = fakeAdb(2);
    const hit = reveal('Guardar');
    expect(hit && hit.text).toBe('Guardar');
    expect(swipes()).toBe(2);
  });

  it('no desliza si ya esta visible', () => {
    const swipes = fakeAdb(0);
    expect(reveal('Guardar')).not.toBeNull();
    expect(swipes()).toBe(0);
  });

  it('se rinde tras el maximo de deslizamientos y no encuentra nada', () => {
    const swipes = fakeAdb(null);
    expect(reveal('Guardar', 3)).toBeNull();
    expect(swipes()).toBe(3);
  });

  it('lo encuentra si aparece justo tras el ultimo deslizamiento permitido', () => {
    const swipes = fakeAdb(3);
    expect(reveal('Guardar', 3)).not.toBeNull();
    expect(swipes()).toBe(3);
  });
});
