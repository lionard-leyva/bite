// QA: safe areas (SAF-01/02). En cada pantalla, ningun elemento de Bite con texto, descripcion o clicable
// puede solaparse con la status bar ni con la barra de navegacion/gestos (insets de `dumpsys window`).
// Uso: npm run qa:safearea -- [--restaurant "Casa Lucio"] [--top PX --bottom PX] [--nav3]
//   --top/--bottom o BITE_INSET_TOP/BOTTOM fuerzan los insets (BITE_INSET_BOTTOM es el de la navegacion por gestos).
//   --nav3 (SAF-02): pasa el sistema a navegacion de 3 botones, mide la barra real con dumpsys (ignora
//          BITE_INSET_BOTTOM) y al terminar, pase lo que pase, devuelve el modo de navegacion que habia.
const q = require('./adb');
const { offenders } = require('./safearea-offenders');

const NAV_CATEGORY = 'com.android.internal.systemui.navbar';
const tryAdb = (args) => {
  try {
    return q.adb(args);
  } catch {
    return '';
  }
};

// Modo activo segun `cmd overlay list android` ("[x] com.android.internal.systemui.navbar.gestural"). Sin dato: gestos.
function currentNavMode(listOutput) {
  const m = listOutput.match(/\[x\]\s+com\.android\.internal\.systemui\.navbar\.(gestural|threebutton|twobutton)/);
  return m ? m[1] : 'gestural';
}

const setNavMode = (mode) => tryAdb(['shell', 'cmd', 'overlay', 'enable-exclusive', '--category', `${NAV_CATEGORY}.${mode}`]);

async function main(args) {
  const checks = [];
  const { h } = q.screenSize();
  const ins = q.systemInsets();
  // dumpsys lista varias fuentes de insets y la primera cambia entre ejecuciones: en CI se fijan los del AVD.
  const top = Number(args.top) || Number(process.env.BITE_INSET_TOP) || (ins.status ? ins.status.y2 : 0);
  const forcedBottom = Number(args.bottom) || (args.nav3 ? 0 : Number(process.env.BITE_INSET_BOTTOM));
  const bottom = forcedBottom || (ins.nav ? ins.nav.y2 - ins.nav.y1 : 0);
  checks.push({ name: 'insets detectados', ok: top > 0 && bottom > 0, info: `top=${top}px bottom=${bottom}px pantalla=${h}px` });

  const screens = [
    { name: 'Mapa', open: () => q.openTab('Mapa') },
    { name: 'Lista', open: () => q.openTab('Lista') },
    { name: 'Perfil', open: () => q.openTab('Perfil') },
    { name: 'Guardar', open: async () => { await q.openTab('Mapa'); await q.tapLabel('Guardar restaurante', 10000); await q.sleep(1500); }, scrollToEnd: true },
  ];
  if (typeof args.restaurant === 'string') {
    screens.push({ name: 'Detalle', open: async () => { await q.openTab('Lista'); await q.tapInList(args.restaurant); await q.waitFor('Eliminar', 10000); } });
  }

  q.clearLogcat();
  for (const s of screens) {
    try {
      await s.open();
      // El contenido desplazable pasa bajo la barra mientras se desplaza; lo que importa es que al llegar al final no quede tapado.
      if (s.scrollToEnd) {
        for (let i = 0; i < 4; i++) { q.swipeUp(); await q.sleep(500); }
      }
      const bad = offenders(await q.dumpUi(), top, bottom, h);
      q.screenshot(`safearea-${s.name.toLowerCase()}`);
      checks.push({
        name: `${s.name}: nada bajo status bar ni barra de gestos`,
        ok: bad.length === 0,
        info: bad.slice(0, 3).map((n) => `"${n.text || n.desc || n.cls}" [${n.y1}-${n.y2}]`).join(', '),
      });
    } catch (e) {
      checks.push({ name: `${s.name}: abrir pantalla`, ok: false, info: e.message });
    }
  }

  const errors = q.logcatErrors();
  checks.push({ name: 'sin errores JS en logcat', ok: errors.length === 0, info: errors.length ? `${errors.length} lineas` : '' });
  q.report(args.nav3 ? 'qa:safearea --nav3' : 'qa:safearea', checks, ['screenshots: qa-out/safearea-*.png', ...errors.slice(0, 8)]);
}

(async () => {
  const args = q.parseArgs();
  if (!args.nav3) return main(args);
  const previous = currentNavMode(tryAdb(['shell', 'cmd', 'overlay', 'list', 'android']));
  try {
    setNavMode('threebutton');
    await q.sleep(3000); // SystemUI reconstruye la barra
    await main(args);
  } finally {
    setNavMode(previous);
  }
})().catch((e) => {
  console.error(`FAIL qa:safearea: ${e.message}`);
  process.exitCode = 1;
});
