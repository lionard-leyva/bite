// QA: inyectar ubicacion (Madrid por defecto) > abrir Bite > "Ir a mi ubicacion" > verificar coords + logcat.
// Uso: npm run qa:location -- [--lat 40.4168] [--lng -3.7038] [--keep] [--deny]
// --keep: reutiliza la app ya abierta (p. ej. justo tras qa:map) en vez de un arranque en frio.
// --deny: LOC-02. Revoca el permiso de ubicacion, pulsa "Ir a mi ubicacion" y comprueba que Bite no se rompe: la app
//         sigue viva y en el Mapa, sin errores JS, y el permiso sigue denegado (si un dialogo lo concedio, el caso no
//         probo nada y falla). Siempre vuelve a conceder el permiso al terminar para no afectar a los casos siguientes.
const q = require('./adb');
const { isPermissionGranted } = require('./permissions');

const PERMS = ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'];
const tryAdb = (args) => {
  try {
    return q.adb(args);
  } catch {
    return '';
  }
};

async function denied() {
  const checks = [];
  try {
    for (const p of PERMS) {
      tryAdb(['shell', 'pm', 'revoke', q.PKG, `android.permission.${p}`]);
      // user-fixed: Android no vuelve a mostrar el dialogo y la peticion se resuelve como denegada.
      tryAdb(['shell', 'pm', 'set-permission-flags', q.PKG, `android.permission.${p}`, 'user-set', 'user-fixed']);
    }
    q.clearLogcat();
    q.launchApp();
    await q.goToMap({ deny: true });
    await q.sleep(1500);
    await q.tapLabel('Ir a mi ubicacion', 10000);
    // Si Android aun enseña el dialogo, se rechaza.
    const dialog = await q.waitFor(["Don't allow", 'Deny'], 2500);
    if (dialog) q.tap(dialog.node.x, dialog.node.y);
    await q.sleep(2500);

    const pid = tryAdb(['shell', 'pidof', q.PKG]).trim();
    checks.push({ name: 'la app sigue viva tras pulsar sin permiso', ok: pid !== '', info: pid ? `pid ${pid}` : 'proceso muerto (crash)' });
    const onMap = pid !== '' && !!q.findNode(await q.dumpUi(), 'Ir a mi ubicacion');
    checks.push({ name: 'sigue en el Mapa con el boton disponible', ok: onMap });
    const errors = q.logcatErrors();
    checks.push({ name: 'sin errores JS en logcat (rechazo sin capturar)', ok: errors.length === 0, info: errors.length ? `${errors.length} lineas` : '' });
    const granted = isPermissionGranted(tryAdb(['shell', 'dumpsys', 'package', q.PKG]), 'android.permission.ACCESS_FINE_LOCATION');
    checks.push({
      name: 'el permiso sigue denegado (el caso probo la denegacion)',
      ok: granted === false,
      info: granted === null ? 'no se pudo leer de dumpsys' : granted ? 'un dialogo lo concedio' : '',
    });
    q.report('qa:location --deny', checks, [`screenshot: ${q.screenshot('location-denied')}`, ...errors.slice(0, 10)]);
  } finally {
    for (const p of PERMS) {
      tryAdb(['shell', 'pm', 'clear-permission-flags', q.PKG, `android.permission.${p}`, 'user-fixed']);
      tryAdb(['shell', 'pm', 'grant', q.PKG, `android.permission.${p}`]);
    }
  }
}

(async () => {
  const args = q.parseArgs();
  if (args.deny) return denied();
  const lat = Number(args.lat ?? 40.4168);
  const lng = Number(args.lng ?? -3.7038);
  const checks = [];

  for (const p of ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION']) {
    q.adb(['shell', 'pm', 'grant', q.PKG, `android.permission.${p}`]);
  }
  // geo fix recibe longitud primero.
  q.adb(['emu', 'geo', 'fix', String(lng), String(lat)]);
  await q.sleep(1500);

  const dump = q.adb(['shell', 'dumpsys', 'location']);
  const near = (v, ref) => Math.abs(Number(v) - ref) < 0.01;
  const fix = [...dump.matchAll(/Location\[\w+ (-?\d+\.\d+),\s?(-?\d+\.\d+)/g)].find((m) => near(m[1], lat) && near(m[2], lng));
  checks.push({ name: 'sistema reporta la ubicacion inyectada', ok: !!fix, info: fix ? `${fix[1]},${fix[2]}` : 'geo fix no aplicado' });

  q.clearLogcat();
  if (args.keep) await q.tapLabel('Mapa', 15000);
  else {
    q.launchApp();
    await q.goToMap();
  }
  await q.sleep(1500);
  await q.tapLabel('Ir a mi ubicacion', 10000);
  await q.sleep(3000); // animacion de camara

  const shot = q.screenshot('location');
  const errors = q.logcatErrors();
  checks.push({ name: 'sin errores JS en logcat (rechazo sin capturar en useLocation)', ok: errors.length === 0, info: errors.length ? `${errors.length} lineas` : '' });
  q.report('qa:location', checks, [`screenshot: ${shot} (mapa debe centrarse en ${lat},${lng})`, ...errors.slice(0, 10)]);
})().catch((e) => {
  console.error(`FAIL qa:location: ${e.message}`);
  process.exitCode = 1;
});
