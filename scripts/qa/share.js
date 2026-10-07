// QA: compartir texto hacia Bite (ACTION_SEND) > se abre "Guardar restaurante" prellenado > opcional: guardar y comprobar que queda Pendiente.
// Uso: npm run qa:share -- --text "Casa Lucio https://www.google.com/maps/place/..." [--state open|closed]
//        [--name "Casa Lucio"] [--banner "Desde Google Maps"] [--save]
// --state closed: mata la app antes de compartir (arranque en frio). --name omitido: se espera que NO haya nombre prellenado.
const q = require('./adb');

const shQuote = (s) => `'${s.replace(/'/g, `'\\''`)}'`;

(async () => {
  const args = q.parseArgs();
  if (!args.text || args.text === true) throw new Error('Falta --text "<texto compartido>"');
  const closed = args.state === 'closed';
  const checks = [];

  q.clearLogcat();
  q.launchApp();
  await q.goToMap();
  if (closed) q.adb(['shell', 'am', 'force-stop', q.PKG]);

  const out = q.adb([
    'shell', 'am', 'start', '-a', 'android.intent.action.SEND', '-t', 'text/plain',
    '--es', 'android.intent.extra.TEXT', shQuote(args.text), '-p', q.PKG,
  ]);
  await q.sleep(closed ? 8000 : 4000);

  // En frio, una development build pasa por el launcher de dev-client y por AuthScreen (lo compartido espera al login).
  let xml = null;
  for (let step = 0; step < 4 && !xml; step++) {
    const hit = await q.waitFor(['Guardar restaurante', /development servers/i, 'Continuar sin cuenta'], closed ? 40000 : 15000);
    if (!hit) break;
    if (hit.label === 'Guardar restaurante') xml = hit.xml;
    else if (hit.label === 'Continuar sin cuenta') q.tap(hit.node.x, hit.node.y);
    else await q.tapLabel(new RegExp(q.METRO_URL.replace(/^https?:\/\//, '').replace(/\./g, '\.')), 8000);
    await q.sleep(2500);
  }
  checks.push({ name: 'se abre "Guardar restaurante"', ok: !!xml, info: xml ? '' : out.trim().slice(0, 120) });
  if (xml) {
    await q.sleep(2500); // el banner pasa de "Leyendo enlace..." al resultado
    const settled = q.parseNodes(await q.dumpUi()).map((n) => n.text || n.desc).filter(Boolean);
    const banner = settled.find((t) => /^(Desde|Leyendo)/.test(t)) || '';
    if (args.banner) checks.push({ name: `banner "${args.banner}"`, ok: banner.startsWith(args.banner), info: banner });
    const i = settled.indexOf('RESTAURANTE');
    const nameField = i >= 0 ? settled[i + 1] : '';
    const hasName = !!nameField && nameField !== 'DIRECCION' && !/^(Nombre|Ej:)/i.test(nameField);
    if (args.name) checks.push({ name: `nombre prellenado "${args.name}"`, ok: nameField === args.name, info: nameField });
    else checks.push({ name: 'sin nombre prellenado', ok: !hasName, info: hasName ? nameField : '' });
  }
  const shot = q.screenshot(`share-${closed ? 'closed' : 'open'}`);

  if (args.save && xml) {
    await q.tapLabel('3 estrellas', 8000);
    await q.revealLabel('Guardar'); // bajo el pliegue en el formulario prellenado
    await q.tapLabel('Guardar', 8000);
    await q.tapLabel('Lista', 15000);
    await q.sleep(1500);
    const name = args.name || '';
    const inAll = await q.inList(name);
    await q.tapLabel(/pendientes/i, 8000);
    await q.sleep(1000);
    const inPending = await q.inList(name);
    await q.tapLabel(/visitados/i, 8000);
    await q.sleep(1000);
    const inVisited = await q.inList(name);
    checks.push({ name: 'guardado: aparece en Lista', ok: inAll });
    checks.push({ name: 'queda Pendiente (esta en Pendientes y no en Visitados)', ok: inPending && !inVisited });
  }

  const errors = q.logcatErrors();
  checks.push({ name: 'sin errores JS en logcat', ok: errors.length === 0, info: errors.length ? `${errors.length} lineas` : '' });
  q.report('qa:share', checks, [`screenshot: ${shot}`, ...errors.slice(0, 8)]);
})().catch((e) => {
  console.error(`FAIL qa:share: ${e.message}`);
  process.exitCode = 1;
});
