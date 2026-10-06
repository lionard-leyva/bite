# Plan E2E para QA autonomo

Objetivo: que un agente QA ejecute la regresion end to end sin ayuda, con el mecanismo mas barato por caso y salida `OK/FAIL` + exit code. Base: scripts `scripts/qa/` (adb + uiautomator, sin dependencias) y Jest (`npm test`, `npm run server:test`).

Regla de coste (por orden): test Jest/servidor > script adb determinista > procedimiento documentado > Mobile MCP (solo para mirar un screenshot o explorar un flujo nuevo).

## 1. Precondiciones

| Item | Valor |
|---|---|
| Host | PC Windows, `adb` en PATH, Node instalado, repo en `C:\proyectos\bite` |
| Emulador | Pixel 9, `-gpu swiftshader_indirect`, navegacion por gestos (por defecto) |
| Build dev | `com.lionardleyva.bite` dev-client + Metro `npx expo start --dev-client --lan` (sin `CI=1`) |
| Build release | Solo para arranque en frio de Compartir: `cd android && ./gradlew.bat assembleRelease -PreactNativeArchitectures=x86_64`, `adb install -r`, ejecutar con `BITE_RELEASE=1` |
| Proxy | `cd server && npm run dev` (puerto 3001). Si no esta, el callout cae a Haversine: casos de ETA lo marcan SKIP, no FAIL |
| Firebase | **Sin Firebase real.** Todo el E2E de dispositivo corre en modo "Continuar sin cuenta" (AsyncStorage). Los flujos que exigen cuenta (listas compartidas, Match, toggle visitado) se cubren con Jest + mocks (ver §4) |
| Estado inicial | `adb shell pm clear com.lionardleyva.bite` antes de la suite (borra AsyncStorage) y luego `qa:seed` |
| Ubicacion | `adb emu geo fix -3.7038 40.4168` (Madrid; longitud primero) |

### Datos de prueba (semilla, sin Places API)

Se siembran por Compartir con URLs largas de Maps (coords en `!3d!4d`, no necesitan red ni Places):

| Nombre | Texto compartido | Estado |
|---|---|---|
| Casa Lucio | `https://www.google.com/maps/place/Casa+Lucio/@40.4123,-3.7086,17z/data=!3d40.4123!4d-3.7086` | Pendiente |
| Sobrino de Botin | `https://www.google.com/maps/place/Sobrino+de+Botin/@40.4140,-3.7081,17z/data=!3d40.4140!4d-3.7081` | Pendiente |
| Gyoza Bar jpq | `https://www.google.com/maps/place/Gyoza+Bar+jpq/@40.4250,-3.7000,17z/data=!3d40.4250!4d-3.7000` | Pendiente (nombre con descendentes g j p q y) |

Un restaurante "Visitado" se crea por `qa:save` (alta manual, Estado = Visitado). Textos de Instagram/TikTok/`maps.app.goo.gl`: reutilizar los de `src/__tests__/shareParser.test.ts`.

## 2. Casos por flujo

Prioridad: **P0** bloquea release, **P1** importante, **P2** pulido. Estado: ✅ automatizado, 🟡 parcial, ❌ falta.

### 2.1 Mapa, markers y callouts

| ID | P | Pasos | Esperado | Mecanismo | Estado |
|---|---|---|---|---|---|
| MAP-01 | P0 | Abrir app > Continuar sin cuenta > Mapa > tocar marker "Casa Lucio" | MapDetailCard con nombre, "Ver detalle", "Ir ahora"; sin errores JS | `npm run qa:map -- --restaurant "Casa Lucio"` | ✅ |
| MAP-02 | P1 | Desde MAP-01 tocar "Ver detalle" | Abre DetailScreen del mismo restaurante | extender `map-callout.js` con `--open-detail` | ❌ |
| MAP-03 | P1 | Filtros Todos / Pendientes / Visitados en el Mapa | Markers cambian (Visitado desaparece en Pendientes) | adb: contar markers por `content-desc` (requiere `title` en MapMarker) o screenshot diff | ❌ |
| MAP-04 | P2 | Mapa vacio tras `pm clear` | "Tu mapa esta vacio" + "Guarda tu primer restaurante para empezar" | script adb `qa:empty` (waitFor de los textos) | ❌ |
| MAP-05 | P1 | Callout con proxy caido | Distancia Haversine, sin crash | Jest de `useNavigationETA`/`navigationService` con fetch rechazado | ❌ |
| MAP-06 | P1 | "Expandir mapa" / "Buscar en esta zona" | Se expande; busqueda filtra | adb tapLabel + waitFor | ❌ |

### 2.2 Ubicacion

| ID | P | Pasos | Esperado | Mecanismo | Estado |
|---|---|---|---|---|---|
| LOC-01 | P0 | Permisos + `geo fix` Madrid > "Ir a mi ubicacion" | `dumpsys location` con la posicion; sin rechazos en logcat; mapa centrado (screenshot) | `npm run qa:location` | 🟡 (centrado solo visual; ver nota emulador `Accuracy.Balanced`) |
| LOC-02 | P0 | Permiso denegado (`pm revoke ... ACCESS_FINE_LOCATION`) > "Ir a mi ubicacion" | Sin crash, mensaje/estado de error, sin unhandled rejection | flag `--deny` en `location.js` | ❌ |
| LOC-03 | P1 | Fallo de ubicacion repetido > reintento | El boton vuelve a pedir posicion | `useLocation.test.tsx` | ✅ |
| LOC-04 | P1 | "Rellenar direccion con GPS" en Guardar | Direccion rellenada | adb en `qa:save` | ❌ |

### 2.3 Anadir restaurante (manual)

| ID | P | Pasos | Esperado | Mecanismo | Estado |
|---|---|---|---|---|---|
| ADD-01 | P0 | FAB > nombre, direccion, rating, precio, Estado Visitado, nota > Guardar | Aparece en Lista y Mapa con estado Visitado | `npm run qa:save -- --name "QA Visitado" --state visitado` | ✅ |
| ADD-02 | P0 | Guardar sin nombre | Boton deshabilitado o error de validacion | `npm run qa:save -- --empty` (Guardar con formulario vacio no sale de la pantalla) | ✅ |
| ADD-03 | P1 | Places sin cuota/sin red | Fallback a input manual | Jest de SaveScreen con `onFail` simulado | ❌ |
| ADD-04 | P2 | Foto de galeria | Thumbnail visible; comprimida <200KB | Jest `imageService` (mock manipulator: 800px, q 0.7) + manual galeria | ❌ |

### 2.4 Compartir hacia Bite (Android)

| ID | P | Pasos | Esperado | Mecanismo | Estado |
|---|---|---|---|---|---|
| SHR-01 | P0 | App abierta, compartir URL larga de Maps | "Guardar restaurante", banner "Desde Google Maps", nombre prellenado | `npm run qa:share -- --text "<url>" --name "Casa Lucio" --banner "Desde Google Maps"` | ✅ |
| SHR-02 | P0 | SHR-01 + `--save` | Queda como Pendiente | `qa:share ... --save` | ✅ |
| SHR-03 | P0 | App cerrada (arranque en frio) | Igual que SHR-01 | `BITE_RELEASE=1 npm run qa:share -- --state closed ...` (solo release) | ✅ (requiere release) |
| SHR-04 | P1 | Texto de Instagram / TikTok | Nota "Visto en X: url", sin nombre si el texto es largo | `qa:share` sin `--name` + `shareParser.test.ts` | ✅ |
| SHR-05 | P1 | `maps.app.goo.gl` corto | Resuelve via `/api/resolve-link`; fallback en dispositivo | `server:test` (resolveLink) + `qa:share` con proxy | 🟡 (E2E depende de red) |

### 2.5 Match (¿Donde cenamos hoy?)

Requiere cuenta + lista compartida: **no ejecutable en dispositivo sin Firebase**. Cobertura con Jest.

| ID | P | Pasos | Esperado | Mecanismo | Estado |
|---|---|---|---|---|---|
| MCH-01 | P0 | Candidatos: pendientes ordenados por Haversine, max 10 | Orden y limite correctos | `matchLogic.test.ts` | ✅ |
| MCH-02 | P0 | Ambos LIKE al mismo sitio | MATCHED una sola vez (transaccion) | `decisionService.test.ts` (markMatched concurrente, Firestore en memoria) | ✅ |
| MCH-03 | P0 | Dos clientes crean ronda a la vez | Misma `roundId` | `decisionService.test.ts` (dos getOrStartSession a la vez) | ✅ |
| MCH-04 | P1 | Ronda >12 h | Caduca, se crea nueva | `decisionService.test.ts` (ronda de 13 h) | ✅ |
| MCH-05 | P1 | Sin cuenta / sin pareja | MatchEntryCard oculta o "Hace falta tu pareja" | `MatchEntryCard.test.tsx` + Jest de MatchScreen | 🟡 |
| MCH-06 | P2 | UI no muestra votos del otro | Solo pantalla de match | Jest de MatchScreen | ❌ |

### 2.6 Listas compartidas

| ID | P | Pasos | Esperado | Mecanismo | Estado |
|---|---|---|---|---|---|
| SHL-01 | P0 | Generar inviteCode | 6 chars uppercase en `lists/{id}` | `listService.test.ts` | ✅ |
| SHL-02 | P0 | Unirse con codigo valido / invalido / propio | Se anade a `members[]` y `sharedListId`; invalido da error | `listService.test.ts` | ✅ |
| SHL-03 | P1 | Dejar de compartir | Se quita de `members[]`, vuelve a lista propia | `listService.test.ts` | ✅ |
| SHL-04 | P1 | Sync en tiempo real (pareja anade) | Aparece sin refresh | Jest `useRestaurants` con `onSnapshot` simulado | ❌ |
| SHL-05 | P2 | Dos dispositivos reales | Ambos ven cambios | Manual (CLAUDE.md §10) o Firebase Emulator (§5) | ❌ |

### 2.7 Visitado / Pendiente

| ID | P | Pasos | Esperado | Mecanismo | Estado |
|---|---|---|---|---|---|
| VIS-01 | P0 | Lista > filtro Pendientes / Visitados con semilla | Solo los del estado | `npm run qa:list -- --filter visitados --expect "QA Visitado" --absent "Casa Lucio"` | ✅ |
| VIS-02 | P1 | Detalle en modo sin cuenta > tocar estado | Alterna "Pendiente de ir" / "Visitado" (se guarda en AsyncStorage) | `npm run qa:detail -- --restaurant X --toggle` (cambia y vuelve) | ✅ |
| VIS-03 | P1 | Toggle con cuenta | Persiste en Firestore | Jest `restaurantService` | ❌ |

### 2.8 Detalle

| ID | P | Pasos | Esperado | Mecanismo | Estado |
|---|---|---|---|---|---|
| DET-01 | P0 | Lista > tocar restaurante | Nombre, direccion, estado, rating, nota | `npm run qa:detail -- --restaurant X --state pendiente` | ✅ |
| DET-02 | P0 | "Eliminar" > confirmar | Desaparece de Lista y Mapa | `npm run qa:detail -- --restaurant X --delete` | ✅ |
| DET-03 | P2 | Id inexistente | "Restaurante no encontrado" | Jest de DetailScreen | ❌ |

### 2.9 Busqueda (Lista)

| ID | P | Pasos | Esperado | Mecanismo | Estado |
|---|---|---|---|---|---|
| SRC-01 | P0 | Filtro por nombre/direccion, mayusculas | Coincidencias correctas | `searchFilter.test.ts` | ✅ |
| SRC-02 | P1 | "Buscar restaurantes" > escribir > "Limpiar busqueda" | Filtra y restaura | `npm run qa:list -- --search "lucio" --expect "Casa Lucio" --absent "Sobrino de Botin" --restore "Sobrino de Botin"` | ✅ |

### 2.10 Perfil

| ID | P | Pasos | Esperado | Mecanismo | Estado |
|---|---|---|---|---|---|
| PRF-01 | P1 | Perfil sin cuenta | "Crear cuenta" visible; compartir pide login | `qa:profile` | ❌ |
| PRF-02 | P1 | "Editar perfil" > ciudad > "Guardar cambios" | Datos persistidos | `qa:profile --edit` (solo campos locales) | ❌ |
| PRF-03 | P1 | Migracion skip > cuenta | Modal "Migrar X restaurantes" | Jest `AuthContext`/`localStorageService` + manual | ❌ |

### 2.11 Teclado y descendentes (g j p q y)

| ID | P | Pasos | Esperado | Mecanismo | Estado |
|---|---|---|---|---|---|
| KBD-01 | P1 | Escribir `gjpqy Gyoza` en Nombre, Direccion, Nota, Buscar, codigo de invitacion | Descendentes no recortados | `npm run qa:keyboard` (texto llega al campo + screenshot por campo; recorte de descendentes lo juzga `qa-visual-triage`) | 🟡 (visual) |
| KBD-02 | P1 | Teclado abierto en Guardar | El campo enfocado y "Guardar" quedan visibles (KeyboardForm) | `npm run qa:keyboard` (bounds del campo enfocado <= top del `ime` en `dumpsys window`) | ✅ |
| KBD-03 | P2 | Regla estatica | `TextInput` sin `height` fija menor que `lineHeight` | Jest/grep sobre estilos (test de estilos) | ❌ |

### 2.12 Safe areas

| ID | P | Pasos | Esperado | Mecanismo | Estado |
|---|---|---|---|---|---|
| SAF-01 | P1 | Home, Lista, Detalle, Match, Guardar, Perfil | Ningun elemento interactivo dentro de status bar ni barra de gestos | `npm run qa:safearea -- --restaurant X` (insets de `dumpsys window` vs bounds de nodos de Bite) | ✅ |
| SAF-02 | P2 | Rotacion / modo navegacion 3 botones | Igual que SAF-01 | `cmd overlay enable ...threebutton` + `qa:safearea` | 🟡 (manual el cambio de navegacion) |

### 2.13 Transversales

| ID | P | Mecanismo | Estado |
|---|---|---|---|
| X-01 typecheck | P0 | `npm run typecheck` | ✅ |
| X-02 unit + components | P0 | `npm test` | ✅ |
| X-03 servidor (directions, resolveLink) | P0 | `npm run server:test` | ✅ |
| X-04 errores JS tras la suite | P0 | `npm run qa:logs` | ✅ |
| X-05 offline (modo avion) | P2 | `adb shell cmd connectivity airplane-mode enable` + `qa:list`; con cuenta solo manual | ❌ |

## 3. Que falta

Implementado: `qa:all`, `qa:seed` (+ `seed-data.js`, validado por `qaSeed.test.ts`), `qa:save`, `qa:list`, `qa:detail`, `qa:keyboard`, `qa:safearea`, `listService.test.ts`, `decisionService.test.ts` (Firestore en memoria: `jest/fakeFirestore.js`), `npm run sync` y el subagente `qa-visual-triage`.

Pendiente:
1. **Primera pasada en el emulador** de los scripts nuevos: estan escritos contra los textos/labels del codigo pero aun no se han ejecutado en el Pixel 9 (labels de uiautomator, `hint` de los campos, insets de `dumpsys window`). Ajustar lo que falle en esa pasada.
2. `qa:profile` (PRF-01/02), flags `--deny` en `location.js` (LOC-02) y `--open-detail` en `map-callout.js` (MAP-02), MAP-03..06.
3. Jest de `restaurantService` (VIS-03), `useRestaurants` con `onSnapshot` (SHL-04), MatchScreen (MCH-05/06), migracion (PRF-03).
4. Cambio de app para testabilidad: `title`/`accessibilityLabel` en `MapMarker` (quita `--marker X,Y`). Toca `src/`, va en su propio PR.

Todos los scripts reutilizan `adb.js` (`openTab`, `waitFor`, `tapLabel`, `typeText`, `systemInsets`, `screenshot`, `report`).

## 4. Firestore sin Firebase real

**Jest con `jest/fakeFirestore.js`**: Firestore en memoria (doc/collection/query/where, set/update/add con merge, arrayUnion/arrayRemove, serverTimestamp, writeBatch, onSnapshot y `runTransaction` con concurrencia optimista que reintenta si lo leido cambio, como el real). Se activa con `jest.mock('firebase/firestore', () => require('../../jest/fakeFirestore'))` + `jest.mock('../config/firebase', () => ({ db: {} }))`. Sin red ni dependencias nuevas.

## 5. Propuestas (no creadas, requieren OK)

- **Firebase Emulator Suite** (`firebase-tools` como devDependency, necesita Java 11+): permitiria E2E real de listas compartidas y Match con dos sesiones (emulador Android + segundo cliente Node). Coste: dependencia grande y config de `connectFirestoreEmulator` en `src/config/firebase.ts`. Recomendado solo si los mocks de §4 dejan pasar bugs.
- **Subagente `qa-visual-triage`** (creado, `.claude/agents/qa-visual-triage.md`, modelo haiku, solo Read/Glob): recibe `caso: ruta.png` y devuelve `PASS|FAIL|UNSURE` por linea. Usarlo solo para los casos visuales (LOC-01, KBD-01, SAF) o para ver un `*-error.png`; la suite no lo necesita para ejecutarse.
- Maestro/Detox: descartados; `adb.js` cubre lo necesario sin dependencias.

## 6. Orden de ejecucion y criterio de pase

Orden (para en el primer bloque con FAIL P0):

1. **Estatico**: `typecheck` > `npm test` > `server:test`.
2. **Reset**: `pm clear`, permisos de ubicacion, `geo fix` Madrid.
3. **Semilla**: `qa:seed`.
4. **Dispositivo P0**: MAP-01, LOC-01, SHR-01/02, ADD-01/02, VIS-01, DET-01, DET-02 (al final, borra datos).
5. **Dispositivo P1/P2**: LOC-02, MAP-02..06, SRC-02, PRF-*, KBD-*, SAF-*.
6. **Cierre**: `qa:logs` (sin errores JS en toda la ejecucion).
7. **Release** (opcional, solo si se toco share-intent o intentFilters): SHR-03 con `BITE_RELEASE=1`.

Criterio:
- **PASS**: todos los P0 OK y `qa:logs` limpio. P1 en FAIL se reportan pero no bloquean.
- **FAIL**: cualquier P0 en FAIL, crash, o unhandled rejection en logcat.
- **SKIP** (no FAIL): ETA con proxy caido, casos que piden release sin release instalada.
- Casos visuales (LOC-01 centrado, KBD-01, SAF-02): el script da OK tecnico; el QA adjunta el PNG en el informe.

Informe: una linea por caso `OK|FAIL|SKIP ID nombre (info)` + resumen y rutas de `qa-out/*.png` de los FAIL.

## 7. Runbook: arranque del QA autonomo

```bash
# PC: traer cambios (pull + npm install si cambio el lock + aviso de rebuild nativo)
npm run sync

# Terminal 1: emulador + Metro + proxy
emulator -avd Pixel_9 -gpu swiftshader_indirect
npx expo start --dev-client --lan
cd server && npm run dev

# Terminal 2: suite
npm run qa:all                       # estatico + reset + semilla + P0 + P1 + logs
npm run qa:all -- --p0               # solo bloqueantes
npm run qa:all -- --static           # sin emulador: typecheck + Jest + server
npm run qa:all -- --only MAP-01,DET-01
BITE_RELEASE=1 npm run qa:all -- --release   # incluye SHR-03 (build release instalada)
```

`qa:all` (`scripts/qa/all.js`) ejecuta los bloques de §6 en orden, salta los de dispositivo si `adb get-state` no da `device`, detiene los bloques siguientes tras un P0 en FAIL e imprime `OK|FAIL|SKIP ID P# titulo`. Exit code 1 si falla algun P0. Despues, para los casos visuales: pasar `qa-out/location.png`, `qa-out/keyboard-*.png` y `qa-out/safearea-*.png` al subagente `qa-visual-triage`.

El emulador es compartido: no lanzar `qa:all` si otro hilo lo esta usando (`pm clear` borra sus datos).

### Fusiones en `qa:all` (menos arranques en frio)
SHR-01 lo cubre la semilla (primer compartir con `--banner`); VIS-01/01b en una sola `qa:list` (`--filter visitados,pendientes`, grupos `;`); VIS-02 va dentro de DET-01 (`--toggle`); LOC-01 reutiliza la app tras MAP-01 (`qa:location --keep`). Pendiente de validar en emulador.
