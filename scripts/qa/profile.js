// QA: Perfil sin cuenta (PRF-01). Ofrece "Crear cuenta" (con el numero de restaurantes locales), no ofrece compartir
// la lista (solo con cuenta) y el aviso de "Crear cuenta" se cancela sin cerrar la sesion. NUNCA pulsa "Continuar":
// cerraria la sesion sin cuenta y dejaria el dispositivo en AuthScreen para los casos siguientes.
// Uso: npm run qa:profile -- [--count 4]   (restaurantes guardados en local; requiere semilla)
const q = require('./adb');

const SHARE_ENTRIES = [/^Compartir con pareja o grupo$/i, /^Gestionar lista compartida$/i];

(async () => {
  const args = q.parseArgs();
  const checks = [];
  q.clearLogcat();
  await q.openTab('Perfil');
  // El contenido puede tardar en salir tras cambiar de pestana (visto en el emulador real de CI): se espera antes de juzgarlo.
  await q.waitFor('Modo sin cuenta', 10000);

  // Lo que no existe no sale en el volcado, y lo que esta bajo el pliegue tampoco: la ausencia se comprueba en todo el scroll.
  const seen = [await q.dumpUi()];
  for (let i = 0; i < 2; i++) {
    q.swipeUp();
    await q.sleep(600);
    seen.push(await q.dumpUi());
  }
  for (let i = 0; i < 2; i++) q.swipeDown();
  await q.sleep(600);

  checks.push({ name: 'Perfil dice "Modo sin cuenta"', ok: seen.some((x) => !!q.findNode(x, 'Modo sin cuenta')) });
  const offered = SHARE_ENTRIES.filter((re) => seen.some((x) => !!q.findNode(x, re)));
  checks.push({ name: 'no ofrece compartir la lista sin cuenta', ok: offered.length === 0, info: offered.length ? 'aparece la opcion de compartir' : '' });
  if (args.count) {
    const n = Number(args.count);
    const re = new RegExp(`Tienes ${n} restaurantes? guardados? localmente`, 'i');
    checks.push({ name: `cuenta ${n} restaurantes guardados en el dispositivo`, ok: seen.some((x) => !!q.findNode(x, re)) });
  }

  const create = await q.revealLabel('Crear cuenta');
  checks.push({ name: 'ofrece "Crear cuenta"', ok: !!create });
  if (create) {
    q.tap(create.x, create.y);
    const dialog = await q.waitFor(/Al crear cuenta/i, 8000);
    checks.push({ name: '"Crear cuenta" abre el aviso', ok: !!dialog });
    if (dialog) {
      q.screenshot('profile-create-account');
      await q.tapLabel('Cancelar', 8000);
      await q.sleep(800);
      const after = await q.dumpUi();
      checks.push({ name: 'cancelar cierra el aviso y sigue sin cuenta', ok: !q.findNode(after, /Al crear cuenta/i) && !!q.findNode(after, 'Modo sin cuenta') });
    }
  }

  const shot = q.screenshot('profile');
  const errors = q.logcatErrors();
  checks.push({ name: 'sin errores JS en logcat', ok: errors.length === 0, info: errors.length ? `${errors.length} lineas` : '' });
  q.report('qa:profile', checks, [`screenshot: ${shot}`, ...errors.slice(0, 8)]);
})().catch((e) => {
  q.screenshot('profile-error');
  console.error(`FAIL qa:profile: ${e.message}`);
  process.exitCode = 1;
});
