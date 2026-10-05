// QA: Lista con filtros y busqueda (VIS-01, SRC-02).
// Uso: npm run qa:list -- [--filter todos|pendientes|visitados] [--search "texto"] --expect "A,B" [--absent "C,D"] [--restore "C"]
// --restore: nombres que deben volver tras "Limpiar busqueda".
const q = require('./adb');

const names = (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

(async () => {
  const args = q.parseArgs();
  const checks = [];
  q.clearLogcat();
  await q.openTab('Lista');

  const filter = typeof args.filter === 'string' ? args.filter.toLowerCase() : 'todos';
  await q.tapLabel(new RegExp(`^${filter}$`, 'i'), 8000);
  await q.sleep(800);

  if (typeof args.search === 'string') {
    await q.tapLabel('Buscar restaurantes', 8000);
    q.typeText(args.search);
    await q.sleep(1000);
    q.hideKeyboard();
  }

  const xml = await q.dumpUi();
  for (const n of names(args.expect)) checks.push({ name: `muestra "${n}"`, ok: !!q.findNode(xml, n) });
  for (const n of names(args.absent)) checks.push({ name: `oculta "${n}"`, ok: !q.findNode(xml, n) });
  const shot = q.screenshot(`list-${filter}${args.search ? '-search' : ''}`);

  if (typeof args.search === 'string') {
    await q.tapLabel('Limpiar busqueda', 8000);
    await q.sleep(800);
    const after = await q.dumpUi();
    checks.push({ name: 'busqueda vacia tras limpiar', ok: !q.findNode(after, 'Limpiar busqueda') });
    for (const n of names(args.restore)) checks.push({ name: `vuelve "${n}" tras limpiar`, ok: !!q.findNode(after, n) });
  }

  const errors = q.logcatErrors();
  checks.push({ name: 'sin errores JS en logcat', ok: errors.length === 0, info: errors.length ? `${errors.length} lineas` : '' });
  q.report('qa:list', checks, [`screenshot: ${shot}`, ...errors.slice(0, 8)]);
})().catch((e) => {
  console.error(`FAIL qa:list: ${e.message}`);
  process.exitCode = 1;
});
