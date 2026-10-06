// QA: detalle de un restaurante (DET-01/02, VIS-02). Lista > tocar restaurante > nombre, estado, "Eliminar".
// Uso: npm run qa:detail -- --restaurant "Casa Lucio" [--state pendiente|visitado] [--toggle] [--delete]
// --toggle: cambia Visitado/Pendiente y lo devuelve a su estado. --delete: elimina y comprueba que desaparece de la Lista.
const q = require('./adb');

const STATE = { pendiente: 'Pendiente de ir', visitado: 'Visitado' };
const stateOf = (xml) => (q.findNode(xml, STATE.visitado) ? 'visitado' : q.findNode(xml, STATE.pendiente) ? 'pendiente' : null);

async function toggle(expected) {
  const hit = await q.tapLabel(new RegExp(`^(${STATE.pendiente}|${STATE.visitado})$`), 8000);
  await q.sleep(1500);
  const now = stateOf(await q.dumpUi());
  return { ok: now === expected, info: `${stateOf(hit.xml)} -> ${now}` };
}

(async () => {
  const args = q.parseArgs();
  if (typeof args.restaurant !== 'string') throw new Error('Falta --restaurant "Nombre"');
  const name = args.restaurant;
  const checks = [];
  q.clearLogcat();
  await q.openTab('Lista');

  await q.waitFor('Todos', 10000);
  await q.tapInList(name);
  const detail = await q.waitFor('Eliminar', 10000);
  checks.push({ name: 'abre el detalle', ok: !!detail });
  if (!detail) return q.report('qa:detail', checks, [`screenshot: ${q.screenshot('detail-error')}`]);
  checks.push({ name: `muestra "${name}"`, ok: !!q.findNode(detail.xml, name) });
  const state = stateOf(detail.xml);
  checks.push({ name: 'muestra estado', ok: !!state, info: state || '' });
  if (typeof args.state === 'string') checks.push({ name: `estado ${args.state}`, ok: state === args.state.toLowerCase() });
  const shot = q.screenshot('detail');

  if (args.toggle && state) {
    const other = state === 'pendiente' ? 'visitado' : 'pendiente';
    const first = await toggle(other);
    checks.push({ name: `toggle a ${other}`, ...first });
    const second = await toggle(state);
    checks.push({ name: `toggle de vuelta a ${state}`, ...second });
  }

  if (args.delete) {
    await q.tapLabel('Eliminar', 8000);
    await q.sleep(800);
    // El modal tiene titulo y boton "Eliminar": el boton es el ultimo nodo con ese texto.
    const nodes = q.findNodes(await q.dumpUi(), 'Eliminar');
    const confirm = nodes[nodes.length - 1];
    if (confirm) q.tap(confirm.x, confirm.y);
    await q.tapLabel('Lista', 15000).catch(() => {});
    await q.sleep(1500);
    await q.tapLabel(/^todos$/i, 8000);
    await q.sleep(800);
    checks.push({ name: 'eliminado: ya no esta en Lista', ok: !(await q.inList(name)) });
  }

  const errors = q.logcatErrors();
  checks.push({ name: 'sin errores JS en logcat', ok: errors.length === 0, info: errors.length ? `${errors.length} lineas` : '' });
  q.report('qa:detail', checks, [`screenshot: ${shot}`, ...errors.slice(0, 8)]);
})().catch((e) => {
  console.error(`FAIL qa:detail: ${e.message}`);
  process.exitCode = 1;
});
