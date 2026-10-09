// QA: teclado y descendentes (KBD-01/02). En Guardar (modo manual) y en la busqueda de Lista escribe "gjpqy Gyoza" en cada campo y
// comprueba: el texto llega al campo y el campo enfocado queda por encima del teclado. El recorte de g j p q y es visual:
// revisar qa-out/keyboard-*.png (subagente qa-visual-triage).
// Uso: npm run qa:keyboard
const q = require('./adb');

const SAMPLE = 'gjpqy Gyoza';
// Margen en px: el nodo del campo incluye padding/sombra y el frame del IME puede ir unos px por delante.
const TOL = 24;

const box = (n) => (n ? `[${n.y1}-${n.y2}]` : 'no esta');

async function checkField(checks, screen, hint) {
  // Diagnostico (KBD-01 fallo en CI con el margen inferior nuevo): donde esta el campo antes de tocarlo y cual queda enfocado.
  const pre = q.parseNodes(await q.dumpUi());
  const preField = q.findNode(await q.dumpUi(), hint);
  const scroller = pre.find((n) => /ScrollView/.test(n.cls));
  await q.tapLabel(hint, 8000);
  await q.sleep(600);
  const post = q.parseNodes(await q.dumpUi());
  const enfocado = post.find((n) => n.focused && /EditText/.test(n.cls));
  console.log(`diag ${screen}/${hint}: campo ${box(preField)} scroll ${box(scroller)} enfocado tras tocar ${box(enfocado)} texto="${enfocado ? enfocado.text : ''}"`);
  q.typeText(SAMPLE);
  await q.sleep(1200);
  const xml = await q.dumpUi();
  const field = q.parseNodes(xml).find((n) => n.focused && /EditText/.test(n.cls)) || q.findNode(xml, SAMPLE);
  const { h } = q.screenSize();
  const raw = q.systemInsets().ime;
  // Un frame de IME que no es una franja inferior (p. ej. de otra ventana) se ignora: solo valdria el screenshot.
  const ime = raw && raw.y1 > h * 0.4 ? raw : null;
  const tag = `${screen}-${hint.split(' ')[0].toLowerCase()}`;
  q.screenshot(`keyboard-${tag}`);
  checks.push({ name: `${screen}/${hint}: texto escrito`, ok: !!field && field.text === SAMPLE, info: field ? field.text : 'sin campo enfocado' });
  checks.push({
    name: `${screen}/${hint}: campo por encima del teclado`,
    ok: !!field && (!ime || field.y2 <= ime.y1 + TOL),
    info: ime ? `campo y2=${field ? field.y2 : '?'} teclado y1=${ime.y1}` : 'teclado no detectado en dumpsys (solo screenshot)',
  });
  q.hideKeyboard();
  await q.sleep(500);
}

(async () => {
  const checks = [];
  q.clearLogcat();

  await q.openTab('Mapa');
  await q.tapLabel('Guardar restaurante', 10000);
  await q.tapLabel(/Ingresar manualmente/i, 15000);
  await q.sleep(800);
  await checkField(checks, 'Guardar', 'Nombre del restaurante');
  await checkField(checks, 'Guardar', 'Direccion del restaurante');
  for (let i = 0; i < 3 && !q.findNode(await q.dumpUi(), 'Ej: La pasta increible'); i++) q.swipeUp();
  await checkField(checks, 'Guardar', 'Ej: La pasta increible');

  await q.openTab('Lista');
  await checkField(checks, 'Lista', 'Buscar restaurantes');

  const errors = q.logcatErrors();
  checks.push({ name: 'sin errores JS en logcat', ok: errors.length === 0, info: errors.length ? `${errors.length} lineas` : '' });
  q.report('qa:keyboard', checks, ['screenshots: qa-out/keyboard-*.png (revisar descendentes)', ...errors.slice(0, 8)]);
})().catch((e) => {
  console.error(`FAIL qa:keyboard: ${e.message}`);
  process.exitCode = 1;
});
