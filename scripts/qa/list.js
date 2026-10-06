// QA: Lista con filtros y busqueda (VIS-01, SRC-02).
// Uso: npm run qa:list -- [--filter todos|pendientes|visitados] [--search "texto"] --expect "A,B" [--absent "C,D"] [--restore "C"]
// Varios filtros en un mismo arranque: --filter visitados,pendientes --expect "A;B,C" --absent "B;A" (grupos separados por ';', uno por filtro).
// Con --search tras varios filtros, --expect/--absent se aplican al ultimo grupo (la busqueda parte del ultimo filtro).
// --restore: nombres que deben volver tras "Limpiar busqueda".
const q = require('./adb');

const names = (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

(async () => {
  const args = q.parseArgs();
  const checks = [];
  q.clearLogcat();
  await q.openTab('Lista');

  const filters = (typeof args.filter === 'string' ? args.filter.toLowerCase() : 'todos').split(',').map((s) => s.trim());
  const groups = (v) => (typeof v === 'string' ? v.split(';') : []);
  const expects = groups(args.expect);
  const absents = groups(args.absent);
  const filter = filters[filters.length - 1];
  let shot = '';
  for (let i = 0; i < filters.length - 1; i++) {
    await q.tapLabel(new RegExp(`^${filters[i]}$`, 'i'), 8000);
    await q.sleep(800);
    for (const n of names(expects[i])) checks.push({ name: `[${filters[i]}] muestra "${n}"`, ok: await q.inList(n) });
    for (const n of names(absents[i])) checks.push({ name: `[${filters[i]}] oculta "${n}"`, ok: !(await q.inList(n)) });
    shot = q.screenshot(`list-${filters[i]}`);
  }
  const last = filters.length - 1;
  await q.tapLabel(new RegExp(`^${filter}$`, 'i'), 8000);
  await q.sleep(800);

  if (typeof args.search === 'string') {
    await q.tapLabel('Buscar restaurantes', 8000);
    q.typeText(args.search);
    await q.sleep(1000);
    q.hideKeyboard();
  }

  // inList baja la lista hasta encontrar la tarjeta: en pantallas mas bajas las ultimas quedan bajo el pliegue.
  for (const n of names(expects[last])) checks.push({ name: `muestra "${n}"`, ok: await q.inList(n) });
  for (const n of names(absents[last])) checks.push({ name: `oculta "${n}"`, ok: !(await q.inList(n)) });
  shot = q.screenshot(`list-${filter}${args.search ? '-search' : ''}`);

  if (typeof args.search === 'string') {
    await q.tapLabel('Limpiar busqueda', 8000);
    await q.sleep(800);
    const after = await q.dumpUi();
    checks.push({ name: 'busqueda vacia tras limpiar', ok: !q.findNode(after, 'Limpiar busqueda') });
    for (const n of names(args.restore)) checks.push({ name: `vuelve "${n}" tras limpiar`, ok: await q.inList(n) });
  }

  const errors = q.logcatErrors();
  checks.push({ name: 'sin errores JS en logcat', ok: errors.length === 0, info: errors.length ? `${errors.length} lineas` : '' });
  q.report('qa:list', checks, [`screenshot: ${shot}`, ...errors.slice(0, 8)]);
})().catch((e) => {
  console.error(`FAIL qa:list: ${e.message}`);
  process.exitCode = 1;
});
