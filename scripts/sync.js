// Ciclo repetido en el PC: git pull + npm install si cambiaron lockfiles + aviso si hace falta rebuild nativo.
// Uso: npm run sync
const { execSync } = require('child_process');

const sh = (cmd, opts = {}) => execSync(cmd, { encoding: 'utf8', stdio: opts.inherit ? 'inherit' : 'pipe' });

const before = sh('git rev-parse HEAD').trim();
sh('git pull --ff-only', { inherit: true });
const after = sh('git rev-parse HEAD').trim();
if (before === after) {
  console.log('sync: sin cambios');
  process.exit(0);
}

const changed = sh(`git diff --name-only ${before} ${after}`).split('\n').filter(Boolean);
if (changed.includes('package-lock.json')) sh('npm install --no-audit --no-fund', { inherit: true });
if (changed.includes('server/package-lock.json')) sh('npm install --no-audit --no-fund --prefix server', { inherit: true });

// Cambios que no recarga Metro: config nativa, modulos locales, dependencias nativas.
const nativeFiles = changed.filter((f) => /^(app\.config\.js|app\.json|eas\.json|modules\/|plugins\/)/.test(f));
let nativeDeps = [];
if (changed.includes('package.json')) {
  const diff = sh(`git diff ${before} ${after} -- package.json`);
  nativeDeps = diff.split('\n').filter((l) => /^[+-]\s+"(expo-|react-native|@react-native)/.test(l)).map((l) => l.trim());
}

console.log(`sync: ${changed.length} archivos nuevos (${before.slice(0, 7)}..${after.slice(0, 7)})`);
if (nativeFiles.length || nativeDeps.length) {
  console.log('REBUILD NATIVO necesario (Metro no basta):');
  for (const f of [...nativeFiles, ...nativeDeps]) console.log(`  ${f}`);
  console.log('  npx expo run:android   (o eas build); recuerda revertir los scripts android/ios de package.json si prebuild los toca');
} else {
  console.log('sync: solo JS, basta con recargar Metro');
}
