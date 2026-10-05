// QA: safe areas (SAF-01/02). En cada pantalla, ningun elemento de Bite con texto, descripcion o clicable
// puede solaparse con la status bar ni con la barra de navegacion/gestos (insets de `dumpsys window`).
// Uso: npm run qa:safearea -- [--restaurant "Casa Lucio"] [--top PX --bottom PX]   (--top/--bottom fuerzan los insets)
const q = require('./adb');

// Tolerancia en px: bordes/sombras de 1-5 px bajo el inset no son contenido tapado (falso positivo).
const TOL = 6;

function offenders(xml, top, bottom, screenH) {
  return q.parseNodes(xml).filter((n) => {
    if (n.pkg !== q.PKG || n.y2 <= n.y1) return false;
    if (!(n.clickable || n.text || n.desc)) return false;
    if ((n.y2 - n.y1) > screenH * 0.6) return false; // contenedores y el mapa a pantalla completa
    // Contenedor clicable sin texto ni descripcion (fondo de pantalla/scroll): no es contenido visible.
    if (!n.text && !n.desc && (n.y2 - n.y1) > screenH * 0.3) return false;
    return n.y1 < top - TOL || n.y2 > screenH - bottom + TOL;
  });
}

(async () => {
  const args = q.parseArgs();
  const checks = [];
  const { h } = q.screenSize();
  const ins = q.systemInsets();
  const top = Number(args.top) || (ins.status ? ins.status.y2 : 0);
  const bottom = Number(args.bottom) || (ins.nav ? ins.nav.y2 - ins.nav.y1 : 0);
  checks.push({ name: 'insets detectados', ok: top > 0 && bottom > 0, info: `top=${top}px bottom=${bottom}px pantalla=${h}px` });

  const screens = [
    { name: 'Mapa', open: () => q.openTab('Mapa') },
    { name: 'Lista', open: () => q.openTab('Lista') },
    { name: 'Perfil', open: () => q.openTab('Perfil') },
    { name: 'Guardar', open: async () => { await q.openTab('Mapa'); await q.tapLabel('Guardar restaurante', 10000); await q.sleep(1500); } },
  ];
  if (typeof args.restaurant === 'string') {
    screens.push({ name: 'Detalle', open: async () => { await q.openTab('Lista'); await q.tapInList(args.restaurant); await q.waitFor('Eliminar', 10000); } });
  }

  q.clearLogcat();
  for (const s of screens) {
    try {
      await s.open();
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
  q.report('qa:safearea', checks, ['screenshots: qa-out/safearea-*.png', ...errors.slice(0, 8)]);
})().catch((e) => {
  console.error(`FAIL qa:safearea: ${e.message}`);
  process.exitCode = 1;
});
