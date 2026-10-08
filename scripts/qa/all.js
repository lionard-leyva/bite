// QA autonomo: ejecuta la suite E2E de docs/qa/e2e-plan.md por bloques y resume OK/FAIL/SKIP por caso.
// Uso: npm run qa:all [-- --p0] [--static] [--only MAP-01,SHR-02] [--release]
//   --p0      solo casos bloqueantes      --static  solo typecheck + Jest + server (sin emulador)
//   --only    ids concretos (los bloques estaticos/reset no se saltan salvo que se pida --static)
//   --skip    ids a omitir (CI: LOC-01 y MAP-01 dependen de ubicacion/markers, poco fiables en el emulador)
//   --release incluye SHR-03 (arranque en frio; requiere build release instalada y BITE_RELEASE=1)
// Un bloque con un P0 en FAIL detiene los bloques siguientes, salvo con --keep-going (CI: un solo run muestra todos
// los fallos). Exit code 1 si algun P0 falla.
const { spawnSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const q = require('./adb');
const { SEED } = require('./seed-data');

const PKG = q.PKG;
const npm = (script, ...args) => `npm run --silent ${script}${args.length ? ` -- ${args.map((a) => JSON.stringify(a)).join(' ')}` : ''}`;
const [lucio, botin, gyoza] = SEED.map((r) => r.name);

// Estado limpio del dispositivo; tambien se ejecuta antes de reintentar SEED, que no es idempotente a medias.
const RESET_CMD = [
  `adb shell pm clear ${PKG}`,
  `adb shell pm grant ${PKG} android.permission.ACCESS_FINE_LOCATION`,
  `adb shell pm grant ${PKG} android.permission.ACCESS_COARSE_LOCATION`,
  'adb emu geo fix -3.7038 40.4168',
].join(' && ');

const BLOCKS = [
  { name: 'Estatico', device: false, steps: [
    { id: 'X-01', p: 0, title: 'typecheck', cmd: 'npm run --silent typecheck' },
    { id: 'X-02', p: 0, title: 'Jest unit + components', cmd: 'npm test --silent' },
    { id: 'X-03', p: 0, title: 'server (directions, resolveLink)', cmd: 'npm run --silent server:test' },
  ] },
  { name: 'Reset', device: true, steps: [
    { id: 'RESET', p: 0, title: 'pm clear + permisos + geo Madrid', cmd: RESET_CMD },
    { id: 'SEED', p: 0, retry: 1, beforeRetry: RESET_CMD, title: 'semilla = SHR-01 (Maps, banner) + ADD-01 (alta manual Visitado)', cmd: npm('qa:seed', '--visited') },
  ] },
  { name: 'Dispositivo P0', device: true, steps: [
    { id: 'MAP-01', p: 0, title: 'callout del marker', cmd: npm('qa:map', '--restaurant', lucio) },
    { id: 'LOC-01', p: 0, title: 'Ir a mi ubicacion', cmd: npm('qa:location', '--keep') },
    { id: 'LOC-02', p: 0, title: 'permiso denegado: sin crash ni errores', cmd: npm('qa:location', '--deny') },
    { id: 'ADD-02', p: 0, title: 'no guarda formulario vacio', cmd: npm('qa:save', '--empty') },
    { id: 'VIS-01', p: 0, retry: 1, title: 'filtros Visitados y Pendientes', cmd: npm('qa:list', '--filter', 'visitados,pendientes', '--expect', `QA Visitado;${lucio},${botin}`, '--absent', `${lucio},${botin};QA Visitado`) },
    { id: 'DET-01', p: 0, title: 'detalle + toggle visitado (VIS-02)', cmd: npm('qa:detail', '--restaurant', lucio, '--state', 'pendiente', '--toggle') },
  ] },
  { name: 'Dispositivo P1/P2', device: true, steps: [
    { id: 'SRC-02', p: 1, retry: 1, title: 'busqueda y limpiar', cmd: npm('qa:list', '--search', 'lucio', '--expect', lucio, '--absent', botin, '--restore', botin) },
    { id: 'KBD-01', p: 1, retry: 1, title: 'teclado y descendentes', cmd: npm('qa:keyboard') },
    { id: 'SAF-01', p: 1, retry: 1, title: 'safe areas', cmd: npm('qa:safearea', '--restaurant', gyoza) },
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

// Dos qa:all a la vez sobre el mismo emulador se pisan (uiautomator: "null root node") y fallan los dos.
const LOCK = path.join(__dirname, '..', '..', 'qa-out', '.qa-all.lock');
function acquireLock() {
  fs.mkdirSync(path.dirname(LOCK), { recursive: true });
  try {
    const pid = Number(fs.readFileSync(LOCK, 'utf8'));
    process.kill(pid, 0);
    console.error(`FAIL qa:all: ya hay otra ejecucion en curso (pid ${pid}). Espera a que termine o borra ${LOCK}`);
    process.exit(1);
  } catch { /* sin lock o proceso muerto */ }
  fs.writeFileSync(LOCK, String(process.pid));
  process.on('exit', () => { try { fs.unlinkSync(LOCK); } catch {} });
}

const args = q.parseArgs();
if (!args.static) acquireLock();
const only = typeof args.only === 'string' ? new Set(args.only.split(',').map((s) => s.trim())) : null;
const skip = typeof args.skip === 'string' ? new Set(args.skip.split(',').map((x) => x.trim())) : new Set();
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
    if (skip.has(s.id)) status = 'SKIP';
    else if (stop) status = 'SKIP';
    else if (block.device && !hasDevice) status = 'SKIP';
    else {
      console.log(`--- ${s.id} ${s.title}`);
      const run = () => spawnSync(s.cmd, { shell: true, stdio: 'inherit', env: { ...process.env, ...(s.env || {}) } });
      let r = run();
      // Solo casos de lectura, o con beforeRetry que deja el estado limpio. Cubre gestos que cuentan como toque y un
      // emulador que pierde el arbol de UI ("null root node").
      for (let n = 1; r.status !== 0 && n <= (s.retry || 0); n++) {
        console.log(`--- ${s.id} reintento ${n}`);
        if (s.beforeRetry) spawnSync(s.beforeRetry, { shell: true, stdio: 'inherit' });
        r = run();
      }
      status = r.status === 0 ? 'OK' : 'FAIL';
    }
    results.push({ ...s, status, info: skip.has(s.id) ? 'omitido (--skip)' : status === 'SKIP' && !stop && block.device && !hasDevice ? 'sin emulador' : '' });
  }
  if (!args['keep-going'] && results.some((r) => r.status === 'FAIL' && r.p === 0)) stop = true;
}

console.log('\n=== Resumen ===');
for (const r of results) console.log(`${r.status.padEnd(4)} ${r.id.padEnd(7)} P${r.p} ${r.title}${r.info ? ` (${r.info})` : ''}`);
const p0Fail = results.filter((r) => r.status === 'FAIL' && r.p === 0);
const p1Fail = results.filter((r) => r.status === 'FAIL' && r.p > 0);
console.log(`${p0Fail.length ? 'FAIL' : 'PASS'} qa:all  P0 FAIL=${p0Fail.length}  P1 FAIL=${p1Fail.length}  screenshots: qa-out/`);
process.exitCode = p0Fail.length ? 1 : 0;
