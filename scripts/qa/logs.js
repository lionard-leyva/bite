// Diagnostico rapido: errores JS/nativos recientes de Bite en logcat (sin limpiar el buffer).
// Uso: npm run qa:logs
const q = require('./adb');

const errors = q.logcatErrors();
console.log(errors.length ? errors.slice(-40).join('\n') : 'Sin errores en logcat');
