// QA: controles del Mapa (MAP-06). "Buscar en esta zona" filtra y "Expandir mapa" abre el mapa a pantalla completa.
// Los markers no salen en el arbol de accesibilidad, asi que el filtro se comprueba por el mensaje de mapa vacio:
// una busqueda sin coincidencias lo muestra, una con coincidencia no.
// Uso: npm run qa:map-controls -- [--match lucio]   (parte del nombre de un restaurante guardado; requiere semilla)
const q = require('./adb');

const SEARCH = 'Buscar en esta zona';
const EMPTY = 'Tu mapa esta vacio';
const NO_MATCH = 'zzzz';

// Con texto, el campo se anuncia con ese texto y ya no con su placeholder (visto en el emulador real de CI).
const searchField = (typed) => new RegExp(`^(${SEARCH}|${typed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})$`, 'i');

// El campo conserva el texto: se borra con DEL (keyevent 67) desde el final.
async function clearSearch(typed) {
  await q.tapLabel(searchField(typed), 8000);
  q.adb(['shell', 'input', 'keyevent', '123']); // MOVE_END
  for (let i = 0; i < typed.length + 2; i++) q.adb(['shell', 'input', 'keyevent', '67']);
  q.hideKeyboard();
  await q.sleep(800);
}

async function search(text) {
  await q.tapLabel(SEARCH, 8000);
  q.typeText(text);
  q.hideKeyboard();
  await q.sleep(1000);
}

(async () => {
  const args = q.parseArgs();
  const match = typeof args.match === 'string' ? args.match : 'lucio';
  const checks = [];
  q.clearLogcat();
  await q.openTab('Mapa');

  await search(NO_MATCH);
  checks.push({ name: 'busqueda sin coincidencias vacia el mapa', ok: !!(await q.waitFor(EMPTY, 6000)) });
  await clearSearch(NO_MATCH);
  checks.push({ name: 'al borrar la busqueda vuelve el mapa', ok: !q.findNode(await q.dumpUi(), EMPTY) });

  await search(match);
  checks.push({ name: `busqueda "${match}" con coincidencia mantiene el mapa`, ok: !q.findNode(await q.dumpUi(), EMPTY) });
  await clearSearch(match);

  await q.tapLabel('Expandir mapa', 8000);
  const expanded = await q.waitFor('Explorar mapa', 8000);
  checks.push({ name: '"Expandir mapa" abre el mapa a pantalla completa', ok: !!expanded });
  checks.push({ name: 'el mapa expandido no lleva el buscador', ok: !!expanded && !q.findNode(expanded.xml, SEARCH) });
  const shot = q.screenshot('map-expanded');
  q.adb(['shell', 'input', 'keyevent', '4']); // atras cierra el modal
  checks.push({ name: 'atras vuelve al mapa normal', ok: !!(await q.waitFor('Expandir mapa', 8000)) });

  const errors = q.logcatErrors();
  checks.push({ name: 'sin errores JS en logcat', ok: errors.length === 0, info: errors.length ? `${errors.length} lineas` : '' });
  q.report('qa:map-controls', checks, [`screenshot: ${shot}`, ...errors.slice(0, 8)]);
})().catch((e) => {
  q.screenshot('map-controls-error');
  console.error(`FAIL qa:map-controls: ${e.message}`);
  process.exitCode = 1;
});
