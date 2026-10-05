// QA autonomo: ejecuta la suite E2E de docs/qa/e2e-plan.md por bloques y resume OK/FAIL/SKIP por caso.
// Uso: npm run qa:all [-- --p0] [--static] [--only MAP-01,SHR-02] [--release]
//   --p0      solo casos bloqueantes      --static  solo typecheck + Jest + server (sin emulador)
//   --only    ids concretos (los bloques estaticos/reset no se saltan salvo que se pida --static)
//   --release incluye SHR-03 (arranque en frio; requiere build release instalada y BITE_RELEASE=1)
// Un bloque con un P0 en FAIL detiene los bloques siguientes. Exit code 1 si algun P0 falla.
const { spawnSync, execSync } = require('child_process');
const q = require('./adb');
const { SEED } = require('./seed-data');

const PKG = q.PKG;
const npm = (script, ...args) => `npm run --silent ${script}${args.length ? ` -- ${args.map((a) => JSON.stringify(a)).join(' ')}` : ''}`;
const [lucio, botin, gyoza] = SEED.map((r) => r.name);

const BLOCKS = [
  { name: 'Estatico', device: false, steps: [
    { id: 'X-01', p: 0, title: 'typecheck', cmd: 'npm run --silent typecheck' },
    { id: 'X-02', p: 0, title: 'Jest unit + components', cmd: 'npm test --silent' },
    { id: 'X-03', p: 0, title: 'server (directions, resolveLink)', cmd: 'npm run --silent server:test' },
  ] },
  { name: 'Reset', device: true, steps: [
    { id: 'RESET', p: 0, title: 'pm clear + permisos + geo Madrid', cmd: [
      `adb shell pm clear ${PKG}`,
      `adb shell pm grant ${PKG} android.permission.ACCESS_FINE_LOCATION`,
      `adb shell pm grant ${PKG} android.permission.ACCESS_COARSE_LOCATION`,
      'adb emu geo fix -3.7038 40.4168',
    ].join(' && ') },
    { id: 'SEED', p: 0, title: 'semilla (3 por Compartir + 1 Visitado manual)', cmd: npm('qa:seed', '--visited') },
  ] },
  { name: 'Dispositivo P0', device: true, steps: [
    { id: 'MAP-01', p: 0, title: 'callout del marker', cmd: npm('qa:map', '--restaurant', lucio) },
    { id: 'LOC-01', p: 0, title: 'Ir a mi ubicacion', cmd: npm('qa:location') },
    { id: 'SHR-01', p: 0, title: 'Compartir Maps con app abierta', cmd: npm('qa:share', '--text', SEED[0].text, '--name', lucio, '--banner', 'Desde Google Maps') },
    { id: 'ADD-02', p: 0, title: 'no guarda formulario vacio', cmd: npm('qa:save', '--empty') },
    { id: 'VIS-01', p: 0, title: 'filtro Visitados', cmd: npm('qa:list', '--filter', 'visitados', '--expect', 'QA Visitado', '--absent', `${lucio},${botin}`) },
    { id: 'VIS-01b', p: 0, title: 'filtro Pendientes', cmd: npm('qa:list', '--filter', 'pendientes', '--expect', `${lucio},${botin}`, '--absent', 'QA Visitado') },
    { id: 'DET-01', p: 0, title: 'detalle', cmd: npm('qa:detail', '--restaurant', lucio, '--state', 'pendiente') },
  ] },
  { name: 'Dispositivo P1/P2', device: true, steps: [
    { id: 'SRC-02', p: 1, title: 'busqueda y limpiar', cmd: npm('qa:list', '--search', 'lucio', '--expect', lucio, '--absent', botin, '--restore', botin) },
    { id: 'VIS-02', p: 1, title: 'toggle visitado sin cuenta', cmd: npm('qa:detail', '--restaurant', botin, '--toggle') },
    { id: 'KBD-01', p: 1, title: 'teclado y descendentes', cmd: npm('qa:keyboard') },
    { id: 'SAF-01', p: 1, title: 'safe areas', cmd: npm('qa:safearea', '--restaurant', gyoza) },
    { id: 'DET-02', p: 0, title: 'eliminar (al final: borra datos)', cmd: npm('qa:detail', '--restaurant', gyoza, '--delete') },
  ] },
  { name: 'Release', device: true, release: true, steps: [
    { id: 'SHR-03', p: 0, title: 'Compartir en frio (release)', cmd: npm('qa:share', '--state', 'closed', '--text', SEED[1].text, '--name', botin), env: { BITE_RELEASE: '1' } },
  ] },
  { name: 'Cierre', device: true, steps: [
    { id: 'X-04', p: 0, title: 'sin errores JS en logcat', cmd: npm('qa:logs') },
  ] },
];

function deviceReady() {
  try {
    return execSync('adb get-state', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() === 'device';
  } catch {
    return false;
  }
}

const args = q.parseArgs();
const only = typeof args.only === 'string' ? new Set(args.only.split(',').map((s) => s.trim())) : null;
const hasDevice = !args.static && deviceReady();
const results = [];
let stop = false;

for (const block of BLOCKS) {
  if (block.release && !args.release) continue;
  console.log(`\n=== ${block.name} ===`);
  for (const s of block.steps) {
    if (args.p0 && s.p > 0) continue;
    const always = ['RESET', 'SEED', 'X-04'].includes(s.id) || block.name === 'Estatico';
    if (only && !only.has(s.id) && !always) continue;
    let status;
    if (stop) status = 'SKIP';
    else if (block.device && !hasDevice) status = 'SKIP';
    else {
      console.log(`--- ${s.id} ${s.title}`);
      const r = spawnSync(s.cmd, { shell: true, stdio: 'inherit', env: { ...process.env, ...(s.env || {}) } });
      status = r.status === 0 ? 'OK' : 'FAIL';
    }
    results.push({ ...s, status, info: status === 'SKIP' && !stop && block.device && !hasDevice ? 'sin emulador' : '' });
  }
  if (results.some((r) => r.status === 'FAIL' && r.p === 0)) stop = true;
}

console.log('\n=== Resumen ===');
for (const r of results) console.log(`${r.status.padEnd(4)} ${r.id.padEnd(7)} P${r.p} ${r.title}${r.info ? ` (${r.info})` : ''}`);
const p0Fail = results.filter((r) => r.status === 'FAIL' && r.p === 0);
const p1Fail = results.filter((r) => r.status === 'FAIL' && r.p > 0);
console.log(`${p0Fail.length ? 'FAIL' : 'PASS'} qa:all  P0 FAIL=${p0Fail.length}  P1 FAIL=${p1Fail.length}  screenshots: qa-out/`);
process.exitCode = p0Fail.length ? 1 : 0;
