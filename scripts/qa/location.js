// QA: inyectar ubicacion (Madrid por defecto) > abrir Bite > "Ir a mi ubicacion" > verificar coords + logcat.
// Uso: npm run qa:location -- [--lat 40.4168] [--lng -3.7038]
const q = require('./adb');

(async () => {
  const args = q.parseArgs();
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
  q.launchApp();
  await q.goToMap();
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
