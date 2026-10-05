// QA: teclado y descendentes (KBD-01/02). En Guardar (modo manual) y en la busqueda de Lista escribe "gjpqy Gyoza" en cada campo y
// comprueba: el texto llega al campo y el campo enfocado queda por encima del teclado. El recorte de g j p q y es visual:
// revisar qa-out/keyboard-*.png (subagente qa-visual-triage).
// Uso: npm run qa:keyboard
const q = require('./adb');

const SAMPLE = 'gjpqy Gyoza';

async function checkField(checks, screen, hint) {
  await q.tapLabel(hint, 8000);
  await q.sleep(600);
  q.typeText(SAMPLE);
  await q.sleep(1200);
  const xml = await q.dumpUi();
  const field = q.parseNodes(xml).find((n) => n.focused && /EditText/.test(n.cls)) || q.findNode(xml, SAMPLE);
  const ime = q.systemInsets().ime;
  const tag = `${screen}-${hint.split(' ')[0].toLowerCase()}`;
  q.screenshot(`keyboard-${tag}`);
  checks.push({ name: `${screen}/${hint}: texto escrito`, ok: !!field && field.text === SAMPLE, info: field ? field.text : 'sin campo enfocado' });
  checks.push({
    name: `${screen}/${hint}: campo por encima del teclado`,
    ok: !!field && (!ime || field.y2 <= ime.y1),
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
