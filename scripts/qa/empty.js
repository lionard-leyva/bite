// QA: mapa vacio (MAP-04). Con la app recien limpiada (`pm clear`, sin restaurantes) el Mapa dice que esta vacio y
// no ofrece la tarjeta de "¿Donde cenamos hoy?" (no hay pendientes). Solo lee: no guarda nada.
// Uso: npm run qa:empty   (ejecutar antes de sembrar datos)
const q = require('./adb');

(async () => {
  const checks = [];
  q.clearLogcat();
  await q.openTab('Mapa');

  const title = await q.waitFor('Tu mapa esta vacio', 10000);
  checks.push({ name: 'dice "Tu mapa esta vacio"', ok: !!title });
  const xml = title ? title.xml : await q.dumpUi();
  checks.push({ name: 'invita a "Guardar tu primer restaurante"', ok: !!q.findNode(xml, 'Guarda tu primer restaurante para empezar') });
  checks.push({ name: 'sin la tarjeta de "Donde cenamos hoy" (no hay pendientes)', ok: !q.findNode(xml, /cenamos hoy/i) });

  const shot = q.screenshot('map-empty');
  const errors = q.logcatErrors();
  checks.push({ name: 'sin errores JS en logcat', ok: errors.length === 0, info: errors.length ? `${errors.length} lineas` : '' });
  q.report('qa:empty', checks, [`screenshot: ${shot}`, ...errors.slice(0, 8)]);
})().catch((e) => {
  q.screenshot('empty-error');
  console.error(`FAIL qa:empty: ${e.message}`);
  process.exitCode = 1;
});
