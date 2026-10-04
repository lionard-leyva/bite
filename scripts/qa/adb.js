// Helpers adb sin dependencias para los flujos QA de Bite (Android Emulator).
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PKG = 'com.lionardleyva.bite';
const OUT_DIR = path.join(__dirname, '..', '..', 'qa-out');

function adb(args, opts = {}) {
  return execFileSync('adb', args, { encoding: opts.binary ? 'buffer' : 'utf8', maxBuffer: 32 * 1024 * 1024 });
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
async function dumpUi(retries = 4) {
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
    nodes.push({ text: attr('text'), desc: attr('content-desc'), x: (x1 + x2) >> 1, y: (y1 + y2) >> 1 });
  }
  return nodes;
}

// label: string (coincidencia exacta, sin mayusculas) o RegExp, contra text o content-desc.
function findNode(xml, label) {
  const test = (s) => (label instanceof RegExp ? label.test(s) : s.trim().toLowerCase() === label.toLowerCase());
  return parseNodes(xml).find((n) => test(n.text) || test(n.desc));
}

async function waitFor(labels, timeoutMs = 15000) {
  const list = [].concat(labels);
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const xml = await dumpUi();
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

function screenshot(name) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${name}.png`);
  fs.writeFileSync(file, adb(['exec-out', 'screencap', '-p'], { binary: true }));
  return path.relative(process.cwd(), file);
}

// En una development build, el icono solo abre el launcher de dev-client: hay que abrir el deep link de Metro.
// 10.0.2.2 es el host visto desde el emulador. Cambiar con BITE_METRO_URL (p. ej. si Metro usa otro puerto).
const METRO_URL = process.env.BITE_METRO_URL || 'http://10.0.2.2:8081';

function launchApp() {
  adb(['shell', 'am', 'force-stop', PKG]);
  adb([
    'shell', 'am', 'start', '-a', 'android.intent.action.VIEW',
    '-d', `exp+bite://expo-development-client/?url=${encodeURIComponent(METRO_URL)}`, PKG,
  ]);
}

// Deja la app en la pestana Mapa, pasando por "Continuar sin cuenta" si hace falta.
async function goToMap() {
  const first = await waitFor(['Continuar sin cuenta', 'Mapa'], 30000);
  if (!first) throw new Error('La app no llego a AuthScreen ni al Mapa (Metro arrancado?)');
  if (first.label === 'Continuar sin cuenta') tap(first.node.x, first.node.y);
  await tapLabel('Mapa', 15000);
}

const clearLogcat = () => adb(['logcat', '-c']);

// Errores JS/nativos desde el ultimo clearLogcat: rechazos sin capturar, crashes, redbox.
function logcatErrors() {
  const log = adb(['logcat', '-d', '-v', 'brief', 'ReactNativeJS:V', 'ReactNative:W', 'AndroidRuntime:E', '*:S']);
  return log.split('\n').filter((l) => /unhandled|rejection|error|exception|fatal/i.test(l));
}

function report(name, checks, extra = []) {
  const failed = checks.filter((c) => !c.ok);
  for (const c of checks) console.log(`${c.ok ? 'OK  ' : 'FAIL'} ${c.name}${c.info ? ` (${c.info})` : ''}`);
  for (const l of extra) console.log(l);
  console.log(`${failed.length ? 'FAIL' : 'PASS'} ${name}`);
  process.exitCode = failed.length ? 1 : 0;
}

module.exports = {
  PKG, adb, sleep, parseArgs, dumpUi, parseNodes, findNode, waitFor, tap, tapLabel,
  screenshot, launchApp, goToMap, clearLogcat, logcatErrors, report,
};
