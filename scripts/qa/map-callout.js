// QA: abrir app > continuar sin cuenta > Mapa > tocar restaurante > verificar callout (MapDetailCard).
// Uso: npm run qa:map -- [--restaurant "Nombre"] [--marker X,Y] [--open-detail]
//   --open-detail (MAP-02): ademas pulsa "Ver detalle" y comprueba que abre el DetailScreen del mismo restaurante.
//   Necesita localizar el marker, asi que en CI (donde MAP-01 se omite) solo se usa con --marker.
const q = require('./adb');

(async () => {
  const args = q.parseArgs();
  const name = typeof args.restaurant === 'string' ? args.restaurant : null;
  const checks = [];

  q.clearLogcat();
  q.launchApp();
  await q.goToMap();
  await q.sleep(2500); // tiles + markers

  let target = null;
  if (typeof args.marker === 'string') {
    const [x, y] = args.marker.split(',').map(Number);
    target = { x, y, via: 'coords' };
  } else if (name) {
    const node = q.findNode(await q.dumpUi(), new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    if (node) target = { ...node, via: 'accesibilidad' };
  }
  checks.push({ name: 'marker localizado', ok: !!target, info: target ? `${target.via} ${target.x},${target.y}` : 'pasa --marker X,Y (ver qa-out/map-before.png)' });
  if (!target) {
    q.screenshot('map-before');
    return q.report('qa:map', checks);
  }

  q.tap(target.x, target.y);
  const card = await q.waitFor('Ver detalle', 8000);
  const xml = card ? card.xml : await q.dumpUi();
  checks.push({ name: 'callout "Ver detalle"', ok: !!card });
  checks.push({ name: 'callout "Ir ahora"', ok: !!q.findNode(xml, 'Ir ahora') });
  if (name) checks.push({ name: `callout muestra "${name}"`, ok: !!q.findNode(xml, name) });

  const shot = q.screenshot('map-callout');
  if (args['open-detail']) {
    if (!card) checks.push({ name: '"Ver detalle" abre el detalle (no hay callout)', ok: false });
    else {
      q.tap(card.node.x, card.node.y);
      const detail = await q.waitFor('Eliminar', 10000); // solo existe en DetailScreen
      checks.push({ name: '"Ver detalle" abre el detalle', ok: !!detail });
      if (name) checks.push({ name: `el detalle es del mismo restaurante ("${name}")`, ok: !!detail && !!q.findNode(detail.xml, name) });
      q.screenshot('map-detail');
    }
  }
  const errors = q.logcatErrors();
  checks.push({ name: 'sin errores JS en logcat', ok: errors.length === 0, info: errors.length ? `${errors.length} lineas` : '' });
  q.report('qa:map', checks, [`screenshot: ${shot}`, ...errors.slice(0, 10)]);
})().catch((e) => {
  console.error(`FAIL qa:map: ${e.message}`);
  process.exitCode = 1;
});
