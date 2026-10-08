// Estado de un permiso en la salida de `adb shell dumpsys package <pkg>`: true, false o null si no aparece.
// Si aparece mas de una vez (install y runtime permissions) manda la ultima, que es la de ejecucion.
function isPermissionGranted(dump, permission) {
  const escaped = permission.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...dump.matchAll(new RegExp(`^\\s*${escaped}:\\s*granted=(true|false)`, 'gm'))];
  if (matches.length === 0) return null;
  return matches[matches.length - 1][1] === 'true';
}

module.exports = { isPermissionGranted };
