// Helpers adb sin dependencias para los flujos QA de Bite (Android Emulator).
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PKG = 'com.lionardleyva.bite';
const OUT_DIR = path.join(__dirname, '..', '..', 'qa-out');

// timeout: si el emulador se cae, adb se queda en "waiting for device" para siempre y la suite no termina.
function adb(args, opts = {}) {
  return execFileSync('adb', args, {
    encoding: opts.binary ? 'buffer' : 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: opts.timeout || 60000,
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseArgs(argv = process.argv.slice(2)) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    out[key] = next && !next.startsWith('--') ? (i++, next) : true;
  }
  return out;
}

// Mobile MCP deja un DeviceServer en el emulador que ocupa UiAutomation: uiautomator falla con
// "UiAutomationService already registered" (exit 137). Se relanza solo la proxima vez que se usa Mobile MCP.
let uiAutomationFreed = false;
function freeUiAutomation() {
  if (uiAutomationFreed) return;
  uiAutomationFreed = true;
  try {
    adb(['shell', 'pkill', '-f', 'com.mobilenext.mobilecli.DeviceServer']);
  } catch {
    /* no estaba corriendo */
  }
}

// uiautomator falla con "could not get idle state" mientras hay animaciones: reintentar.
async function dumpUi(retries = 10) {
  freeUiAutomation();
  for (let i = 0; i < retries; i++) {
    try {
      // "null root node" (durante transiciones) sale con exit 0 sin escribir el archivo: borrarlo antes y validar el XML.
      adb(['shell', 'rm', '-f', '/sdcard/bite-ui.xml']);
      adb(['shell', 'uiautomator', 'dump', '/sdcard/bite-ui.xml']);
      const xml = adb(['exec-out', 'cat', '/sdcard/bite-ui.xml']);
      if (xml.includes('<hierarchy')) return xml;
    } catch {
      /* reintentar */
    }
    await sleep(700);
  }
  throw new Error('uiautomator dump fallo tras reintentos');
}

function parseNodes(xml) {
  const nodes = [];
  const re = /<node\b([^>]*)>/g;
  let m;
  while ((m = re.exec(xml))) {
    const attr = (name) => (m[1].match(new RegExp(`\\b${name}="([^"]*)"`)) || [])[1] || '';
    const b = attr('bounds').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!b) continue;
    const [x1, y1, x2, y2] = b.slice(1).map(Number);
    nodes.push({
      text: attr('text'), desc: attr('content-desc'), hint: attr('hint'), cls: attr('class'), pkg: attr('package'),
      clickable: attr('clickable') === 'true', focused: attr('focused') === 'true',
      x: (x1 + x2) >> 1, y: (y1 + y2) >> 1, x1, y1, x2, y2,
    });
  }
  return nodes;
}

// label: string (coincidencia exacta, sin mayusculas) o RegExp, contra text, content-desc o hint (placeholder).
function findNode(xml, label) {
  return findNodes(xml, label)[0];
}

function findNodes(xml, label) {
  const test = (s) => (label instanceof RegExp ? label.test(s) : s.trim().toLowerCase() === label.toLowerCase());
  return parseNodes(xml).filter((n) => test(n.text) || test(n.desc) || test(n.hint));
}

async function waitFor(labels, timeoutMs = 15000) {
  const list = [].concat(labels);
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    // Tras `pm clear` la primera carga del bundle da "null root node" durante mas de 10 dumps: seguir hasta el timeout.
    const xml = await dumpUi().catch(() => '');
    for (const l of list) {
      const node = findNode(xml, l);
      if (node) return { label: l, node, xml };
    }
    await sleep(800);
  }
  return null;
}

const tap = (x, y) => adb(['shell', 'input', 'tap', String(x), String(y)]);

async function tapLabel(label, timeoutMs) {
  const hit = await waitFor(label, timeoutMs);
  if (!hit) throw new Error(`No aparece "${label}"`);
  tap(hit.node.x, hit.node.y);
  return hit;
}

// `input text` no admite espacios ni metacaracteres de shell sin escapar. Solo ASCII.
function typeText(text) {
  const escaped = text.replace(/ /g, '%s').replace(/([\\'"`$&|;<>()*?!#~])/g, '\\$1');
  adb(['shell', 'input', 'text', escaped]);
}

// Cierra el teclado sin salir de la pantalla (KEYCODE_ESCAPE).
const hideKeyboard = () => adb(['shell', 'input', 'keyevent', '111']);

// Desliza hacia arriba (contenido baja) en la mitad de la pantalla.
const swipeUp = () => adb(['shell', 'input', 'swipe', '540', '1800', '540', '700', '300']);
const swipeDown = () => adb(['shell', 'input', 'swipe', '540', '700', '540', '1800', '300']);

// La Lista sin cuenta va de mas antiguo a mas nuevo: con 3+ tarjetas las ultimas quedan bajo el pliegue, y una
// tarjeta a medias solo expone su content-desc ("Nombre, 4 estrellas, visitado"). Baja hasta encontrarla.
async function scanList(name, maxSwipes = 5) {
  const label = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(,|$)`, 'i');
  let swipes = 0;
  for (;;) {
    const node = findNode(await dumpUi(), label);
    if (node || swipes >= maxSwipes) return { node, swipes };
    swipeUp();
    swipes++;
    await sleep(700);
  }
}

// Comprueba si la tarjeta esta en la Lista y deja el scroll arriba (los filtros no lo resetean).
async function inList(name) {
  const { node, swipes } = await scanList(name);
  for (let i = 0; i < swipes; i++) swipeDown();
  if (swipes) await sleep(700);
  return !!node;
}

async function tapInList(name) {
  const { node } = await scanList(name);
  if (!node) throw new Error(`No aparece "${name}" en la Lista`);
  tap(node.x, node.y);
}

function screenSize() {
  const m = adb(['shell', 'wm', 'size']).match(/(\d+)x(\d+)\s*$/m);
  return m ? { w: Number(m[1]), h: Number(m[2]) } : { w: 1080, h: 2424 };
}

// Insets del sistema desde dumpsys window (Android 12+: "type=statusBars"/"ITYPE_STATUS_BAR", "navigationBars", "ime").
function systemInsets() {
  const dump = adb(['shell', 'dumpsys', 'window']);
  const frame = (types, needVisible) => {
    for (const line of dump.split('\n')) {
      if (!types.some((t) => new RegExp(`type=${t}\\b`).test(line))) continue;
      if (needVisible && !/visible=true/.test(line)) continue;
      const m = line.match(/frame=\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]/);
      if (m) {
        const [x1, y1, x2, y2] = m.slice(1).map(Number);
        if (y2 > y1) return { x1, y1, x2, y2 };
      }
    }
    return null;
  };
  return {
    status: frame(['statusBars', 'ITYPE_STATUS_BAR']),
    nav: frame(['navigationBars', 'ITYPE_NAVIGATION_BAR']),
    ime: frame(['ime', 'ITYPE_IME'], true),
  };
}

// Abre la pestana indicada con un arranque limpio en modo sin cuenta.
async function openTab(label) {
  launchApp();
  await goToMap();
  if (label !== 'Mapa') await tapLabel(label, 15000);
  await sleep(1500);
}

function screenshot(name) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${name}.png`);
  fs.writeFileSync(file, adb(['exec-out', 'screencap', '-p'], { binary: true }));
  return path.relative(process.cwd(), file);
}

// En una development build, el icono solo abre el launcher de dev-client: hay que abrir el deep link de Metro.
// 10.0.2.2 es el host visto desde el emulador. Cambiar con BITE_METRO_URL (p. ej. si Metro usa otro puerto).
const METRO_URL = process.env.BITE_METRO_URL || 'http://10.0.2.2:8081';

// Gboard en el emulador abre "Try out your stylus" al enfocar un campo: tapa la pantalla y se come el texto de
// `input text`. Se desactiva la escritura con stylus una vez por proceso.
let devicePrepared = false;
function prepareDevice() {
  if (devicePrepared) return;
  devicePrepared = true;
  try {
    adb(['shell', 'settings', 'put', 'secure', 'stylus_handwriting_enabled', '0']);
  } catch {
    /* Android < 14: no existe */
  }
}

function launchApp() {
  prepareDevice();
  adb(['shell', 'am', 'force-stop', PKG]);
  // BITE_RELEASE=1: build release/standalone (sin dev-client ni Metro), se abre con el icono.
  if (process.env.BITE_RELEASE) {
    adb(['shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1']);
    return;
  }
  adb([
    'shell', 'am', 'start', '-a', 'android.intent.action.VIEW',
    '-d', `exp+bite://expo-development-client/?url=${encodeURIComponent(METRO_URL)}`, PKG,
  ]);
}

// Deja la app en la pestana Mapa, pasando por "Continuar sin cuenta" si hace falta.
// Tras `pm clear` el dev-client abre su menu (bienvenida "Continue" y luego el menu con "Go home") y, con el
// emulador recien arrancado, puede salir el ANR "System UI isn't responding" ("Wait"): se cierran todos.
// Los overlays van primero: AuthScreen sigue en el arbol debajo y el tap caeria en el sheet.
const OVERLAYS = ['Continue', 'Wait', 'Go home'];
async function goToMap() {
  let first = null;
  for (let i = 0; i < 5; i++) {
    first = await waitFor([...OVERLAYS, 'Continuar sin cuenta', 'Mapa'], 30000);
    if (!first || !OVERLAYS.includes(first.label)) break;
    if (first.label === 'Go home') adb(['shell', 'input', 'keyevent', '4']);
    else tap(first.node.x, first.node.y);
    await sleep(1500);
  }
  if (!first || OVERLAYS.includes(first.label)) {
    throw new Error('La app no llego a AuthScreen ni al Mapa (Metro arrancado?)');
  }
  if (first.label === 'Continuar sin cuenta') tap(first.node.x, first.node.y);
  await tapLabel('Mapa', 15000);
  await dismissDevMenu();
}

// El menu de dev-client (Reload / Go home) puede abrirse solo tras el primer arranque y tapa el Mapa.
async function dismissDevMenu() {
  await sleep(1200);
  const xml = await dumpUi();
  if (findNode(xml, 'Go home') && findNode(xml, 'Reload')) {
    adb(['shell', 'input', 'keyevent', '4']);
    await sleep(800);
  }
}

const clearLogcat = () => adb(['logcat', '-c']);

// Errores JS/nativos desde el ultimo clearLogcat: rechazos sin capturar, crashes, redbox.
function logcatErrors() {
  const log = adb(['logcat', '-d', '-v', 'brief', 'ReactNativeJS:V', 'ReactNative:W', 'AndroidRuntime:E', '*:S']);
  const lines = log.split('\n');
  // Los crashes del propio `uiautomator dump` ("UiAutomationService already registered") no son de Bite.
  const pidOf = (l) => (l.match(/^\w\/[\w.]+\(\s*(\d+)\)/) || [])[1];
  const toolPids = new Set(lines.filter((l) => /UiAutomation/.test(l)).map(pidOf).filter(Boolean));
  return lines.filter((l) => /unhandled|rejection|error|exception|fatal/i.test(l) && !toolPids.has(pidOf(l)));
}

function report(name, checks, extra = []) {
  const failed = checks.filter((c) => !c.ok);
  for (const c of checks) console.log(`${c.ok ? 'OK  ' : 'FAIL'} ${c.name}${c.info ? ` (${c.info})` : ''}`);
  for (const l of extra) console.log(l);
  console.log(`${failed.length ? 'FAIL' : 'PASS'} ${name}`);
  process.exitCode = failed.length ? 1 : 0;
}

module.exports = {
  PKG, METRO_URL, adb, sleep, parseArgs, dumpUi, parseNodes, findNode, findNodes, waitFor, tap, tapLabel,
  typeText, hideKeyboard, swipeUp, swipeDown, inList, tapInList, screenSize, systemInsets, openTab,
  screenshot, launchApp, goToMap, clearLogcat, logcatErrors, report,
};
