// QA: alta manual (ADD-01/02). FAB > "Ingresar manualmente" > nombre, direccion, rating, estado, nota > Guardar > aparece en Lista con su estado.
// Uso: npm run qa:save -- --name "Bar Visitado" [--address "Calle Mayor 1, Madrid"] [--state visitado|pendiente] [--note "gjpqy"]
//      npm run qa:save -- --empty   (Guardar con el formulario vacio no debe guardar nada)
const q = require('./adb');

const MANUAL = /Ingresar manualmente/i;

async function fill(hint, value) {
  await q.tapLabel(hint, 8000);
  await q.sleep(400);
  q.typeText(value);
  await q.sleep(400);
}

async function inList(name, filter) {
  await q.tapLabel(filter, 8000);
  await q.sleep(1000);
  // Una tarjeta bajo el pliegue solo expone su content-desc ("Nombre, 4 estrellas, visitado"), no el titulo.
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return !!q.findNode(await q.dumpUi(), new RegExp(`^${esc}(,|$)`, 'i'));
}

(async () => {
  const args = q.parseArgs();
  const checks = [];
  q.clearLogcat();
  await q.openTab('Mapa');
  await q.tapLabel('Guardar restaurante', 15000); // FAB
  await q.tapLabel(MANUAL, 15000);
  await q.sleep(800);

  if (args.empty) {
    q.hideKeyboard();
    await q.sleep(500);
    for (let i = 0; i < 3 && !q.findNode(await q.dumpUi(), 'Guardar'); i++) q.swipeUp();
    await q.tapLabel('Guardar', 8000);
    await q.sleep(2000);
    const xml = await q.dumpUi();
    checks.push({ name: 'sigue en "Guardar restaurante" (no guarda vacio)', ok: !!q.findNode(xml, 'Guardar restaurante') && !!q.findNode(xml, 'Guardar') });
  } else {
    const name = typeof args.name === 'string' ? args.name : 'QA Manual';
    const visited = String(args.state || 'pendiente').toLowerCase().startsWith('v');
    await fill('Nombre del restaurante', name);
    await fill('Direccion del restaurante', typeof args.address === 'string' ? args.address : 'Calle Mayor 1, Madrid');
    q.hideKeyboard();
    await q.sleep(500);
    await q.tapLabel('4 estrellas', 8000);
    await q.tapLabel(visited ? 'Visitado' : 'Pendiente', 8000);
    if (typeof args.note === 'string') {
      for (let i = 0; i < 3 && !q.findNode(await q.dumpUi(), 'Ej: La pasta increible'); i++) q.swipeUp();
      await fill('Ej: La pasta increible', args.note);
      q.hideKeyboard();
    }
    for (let i = 0; i < 3 && !q.findNode(await q.dumpUi(), 'Guardar'); i++) q.swipeUp();
    q.screenshot('save-form');
    await q.tapLabel('Guardar', 8000);

    const back = await q.waitFor(['Lista', 'Mapa'], 20000);
    checks.push({ name: 'vuelve de la pantalla Guardar', ok: !!back });
    await q.tapLabel('Lista', 10000);
    await q.sleep(1500);
    checks.push({ name: `"${name}" aparece en Lista`, ok: await inList(name, /^todos$/i) });
    const inV = await inList(name, /visitados/i);
    const inP = await inList(name, /pendientes/i);
    checks.push({ name: `queda ${visited ? 'Visitado' : 'Pendiente'}`, ok: visited ? inV && !inP : inP && !inV });
  }

  const shot = q.screenshot(args.empty ? 'save-empty' : 'save-done');
  const errors = q.logcatErrors();
  checks.push({ name: 'sin errores JS en logcat', ok: errors.length === 0, info: errors.length ? `${errors.length} lineas` : '' });
  q.report('qa:save', checks, [`screenshot: ${shot}`, ...errors.slice(0, 8)]);
})().catch((e) => {
  q.screenshot('save-error');
  console.error(`FAIL qa:save: ${e.message}`);
  process.exitCode = 1;
});
