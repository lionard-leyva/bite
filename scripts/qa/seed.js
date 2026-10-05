// QA: siembra los restaurantes de prueba del plan E2E (docs/qa/e2e-plan.md §1) compartiendo URLs largas de Maps y guardando.
// No usa Places ni Firebase (modo sin cuenta). Ejecutar tras `adb shell pm clear` para partir de cero.
// Uso: npm run qa:seed [-- --visited]   (--visited: anade tambien "QA Visitado" por alta manual)
const { spawnSync } = require('child_process');
const path = require('path');
const q = require('./adb');
const { SEED } = require('./seed-data');

const run = (script, args) =>
  spawnSync(process.execPath, [path.join(__dirname, script), ...args], { stdio: 'inherit' }).status === 0;

const args = q.parseArgs();
const checks = SEED.map((r) => ({
  name: `semilla "${r.name}"`,
  ok: run('share.js', ['--text', r.text, '--name', r.name, '--save']),
}));
if (args.visited) checks.push({ name: 'semilla "QA Visitado"', ok: run('save.js', ['--name', 'QA Visitado', '--state', 'visitado']) });
q.report('qa:seed', checks);
