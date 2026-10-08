// `adb` falso para probar los scripts de scripts/qa sin emulador. Es un script de node en el PATH que anota cada
// llamada en un log y responde el volcado de UI que decide `screen(log)`, donde `log` son las llamadas hechas hasta
// ese momento (cada una como "shell input tap 10 20"). Asi la pantalla puede depender de lo que el script toca o escribe.
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export const PKG = 'com.lionardleyva.bite';

export interface FakeNode {
  text?: string;
  desc?: string;
  hint?: string;
  x: number;
  y: number;
}

// Un nodo ocupa 100x100 px centrado en (x, y); el script lo pulsa en ese punto.
// tree y tapped se serializan dentro del adb falso: nada de desestructurar, spread ni `??` (babel los transformaria
// con ayudas que no existen alli).
export function tree(nodes: FakeNode[]): string {
  const PKG_NAME = 'com.lionardleyva.bite';
  return (
    '<hierarchy>' +
    nodes
      .map(function (n) {
        return (
          '<node text="' + (n.text || '') + '" content-desc="' + (n.desc || '') + '" hint="' + (n.hint || '') +
          '" class="t" package="' + PKG_NAME + '" clickable="true" bounds="[' + (n.x - 50) + ',' + (n.y - 50) +
          '][' + (n.x + 50) + ',' + (n.y + 50) + ']"/>'
        );
      })
      .join('') +
    '</hierarchy>'
  );
}

export function tapped(log: string[], x: number, y: number): boolean {
  return log.indexOf('shell input tap ' + x + ' ' + y) >= 0;
}

export interface FakeOptions {
  // Recibe tree y tapped como parametros: las funciones se serializan al adb falso y los imports no existen alli.
  screen: (log: string[], tree: (nodes: FakeNode[]) => string, tapped: (log: string[], x: number, y: number) => boolean, data: any) => string;
  // Datos (JSON) para la pantalla: la funcion no puede capturar variables del test porque se serializa.
  data?: unknown;
  // Respuestas a otros comandos (por subcadena de la llamada), p. ej. { 'dumpsys window': '...' }.
  replies?: Record<string, string>;
  env?: Record<string, string>;
  timeout?: number;
}

export function runScript(script: string, args: string[], opts: FakeOptions) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-adb-'));
  const logFile = path.join(dir, 'log');
  fs.writeFileSync(logFile, '');
  fs.writeFileSync(path.join(dir, 'screen.js'), `const tree = ${tree.toString()};\nconst tapped = ${tapped.toString()};\nconst screenFn = ${opts.screen.toString()};\nmodule.exports = { screen: function (log) { return screenFn(log, tree, tapped, ${JSON.stringify(opts.data === undefined ? null : opts.data)}); }, replies: ${JSON.stringify(opts.replies || {})} };`);
  fs.writeFileSync(
    path.join(dir, 'adb'),
    `#!/usr/bin/env node
const fs = require('fs');
const dir = ${JSON.stringify(dir)};
const args = process.argv.slice(2);
const line = args.join(' ');
fs.appendFileSync(dir + '/log', line + '\\n');
const { screen, replies } = require(dir + '/screen.js');
const log = fs.readFileSync(dir + '/log', 'utf8').split('\\n').filter(Boolean);
if (line.includes('exec-out cat')) process.stdout.write(screen(log));
else if (line.includes('exec-out screencap')) process.stdout.write('PNG');
else if (line.includes('shell pidof')) process.stdout.write('4242\\n');
else if (line.includes('wm size')) process.stdout.write('Physical size: 1080x2424\\n');
else {
  for (const [k, v] of Object.entries(replies)) if (line.includes(k)) { process.stdout.write(v); break; }
}
process.exit(0);
`,
    { mode: 0o755 },
  );
  const res = spawnSync('node', [path.resolve(__dirname, '../../../scripts/qa', script), ...args], {
    cwd: dir, // qa-out/ se crea aqui, no en el repo
    encoding: 'utf8',
    timeout: opts.timeout ?? 90000,
    env: { ...process.env, PATH: `${dir}${path.delimiter}${process.env.PATH}`, BITE_RELEASE: '1', BITE_QA_TIME_SCALE: '0.15', ...opts.env },
  });
  const log = fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean);
  fs.rmSync(dir, { recursive: true, force: true });
  return { status: res.status, out: `${res.stdout}${res.stderr}`, log };
}
