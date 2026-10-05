# CLAUDE.md - Bite

## 1. Resumen del Proyecto

**Bite** - App movil para guardar y recordar restaurantes en pareja/amigos. Guardar un sitio en 2 taps, compartir lista en tiempo real.

**Stack**: React Native + Expo + Firebase (Auth, Firestore, Storage) + TypeScript + NativeWind + Express proxy (directions)

Spec completa en `SPEC.md`.

## 2. Decisiones de Arquitectura Criticas

**Top-level collections vs subcollections**: `users`, `restaurants`, `lists` son colecciones raiz con referencias por `listId`. No subcollections. Queries simples (`where("listId", "==", X)`), un read por documento, no nested reads. Menor coste Firestore y collection group queries innecesarias.

**onSnapshot vs polling**: Firestore `onSnapshot` listeners para real-time sync. Cuando la pareja agrega un restaurante, aparece inmediatamente sin necesidad de refresh ni intervalo de polling.

**Skip login habilitado**: Reduce friccion de onboarding. Datos guardados en AsyncStorage localmente. Funcionalidad completa excepto compartir. Al hacer login posterior, modal pregunta si migrar X restaurantes a Firestore. Login solo requerido para sync entre dispositivos y compartir lista.

**Storage path**: `photos/{userId}/{restaurantId}.jpg` (no `{listId}`) para que funcione en modo skip donde userId = deviceId temporal. Al loguearse, se re-sube con Firebase UID. Security rule: `request.auth.uid == userId`.

**Compresion de fotos**: `expo-image-manipulator`, resize max 800px, quality 0.7. Resultado < 200KB tipico. Siempre ANTES de subir a Storage. Si storage > 4GB, reducir a quality 0.6.

**Busqueda local**: Filtro en cliente sobre array cacheado, no Firestore queries (no soporta full-text search). Funciona offline:
```typescript
restaurants.filter(r =>
  r.name.toLowerCase().includes(query) ||
  r.address.toLowerCase().includes(query)
)
```

**No editar restaurantes en v1**: Si se equivoca, eliminar y re-guardar. Evita conflictos de edicion concurrente entre pareja. Editar es post-MVP.

**Directions proxy**: El cliente NO llama a Google Directions API directamente. Un servidor Express ligero en `server/` actua como proxy (`POST /api/directions`), mantiene la API key server-side, cachea respuestas 5 min, deduplica requests simultaneos y aplica rate limiting. El cliente solo envia `{ origin: {lat,lng}, destination: {lat,lng} }` y recibe `{ distanceKm, durationMinutes }`. Si el proxy no responde, el callout muestra distancia Haversine como fallback.

## 3. Estructura del Proyecto

```
server/             # Express proxy (directions API, resolve-link de Maps, rate limit, cache)
modules/share-intent/ # Modulo Expo local (Android): texto compartido a Bite (ACTION_SEND)
src/
├── __tests__/      # Jest tests (timeAgo, searchFilter, matchLogic, StarRating, RestaurantCard, MatchEntryCard)
├── components/     # Reutilizables: StarRating, RestaurantCard, FAB, SearchBar, FilterButtons, PhotoPicker, ShareListModal, InviteCodeDisplay, MatchEntryCard
├── screens/        # HomeScreen, SaveScreen, ListScreen, DetailScreen, ProfileScreen, AuthScreen, MatchScreen
├── navigation/     # RootNavigator (stack) + TabNavigator (Mapa | Lista | Perfil)
├── contexts/       # AuthContext (auth state, skip mode, migracion, refreshListId)
├── services/       # restaurantService, listService, imageService, localStorageService, locationService, navigationService, decisionService
├── hooks/          # useRestaurants (onSnapshot/local), useAuth, useLocation, useNavigationETA, useDecisionSession
├── types/          # User, Restaurant, RestaurantList, DecisionSession (interfaces TypeScript)
├── utils/          # timeAgo, geo (haversine), matchLogic, shareParser
└── config/         # firebase.ts, constants.ts
```

## 4. Flujo de Datos Critico

### Skip login + migracion a Firestore
1. Primera apertura: usuario toca "Saltar" en AuthScreen
2. Se genera un deviceId temporal, datos se guardan en AsyncStorage
3. App funciona completa (guardar, ver, buscar) excepto compartir
4. Cuando decide loguearse (desde Perfil o al intentar compartir):
   - Login con email o Google
   - Se detectan datos en AsyncStorage
   - Modal: "Tienes X restaurantes guardados. Migrarlos a tu cuenta?"
   - Si acepta: crea lista en Firestore, sube restaurants + fotos con nuevo userId
   - Si rechaza: datos quedan en local, puede migrar despues desde Perfil
5. AsyncStorage se limpia tras migracion exitosa

### Compartir lista (inviteCode)
1. Owner va a Perfil → "Compartir con pareja"
2. Se genera inviteCode de 6 chars uppercase en `lists/{listId}.inviteCode`
3. Owner comparte el codigo (copiar, mensaje, etc.)
4. Pareja va a Perfil → "Unirse a lista" → ingresa codigo
5. Query: `lists where inviteCode == codigo` → se agrega pareja a `members[]`
6. Se actualiza `users/{parejaId}.sharedListId = listId`
7. Listener `onSnapshot` en `restaurants where listId == X` sincroniza todo automaticamente

### Sync en tiempo real (onSnapshot)
1. Al abrir app (logged in), se activa listener: `onSnapshot(query(restaurants, where("listId", "==", userListId)))`
2. Cada cambio (add/modify/remove) dispara callback que actualiza estado local
3. UI se re-renderiza automaticamente con datos nuevos
4. Si pareja agrega restaurante → aparece en tu lista/mapa sin refresh
5. Listener se desuscribe al cerrar app o hacer logout

### ¿Dónde cenamos hoy? (Match)
1. En el Mapa, la tarjeta "¿Dónde cenamos hoy?" abre `MatchScreen` (solo con cuenta y lista compartida)
2. `decisionSessions/{listId}`: una ronda activa por lista (`roundId`, `participants`, `restaurantIds`, `status: ACTIVE | MATCHED | CLOSED`, `matchedRestaurantId`). Se crea en transaccion para que ambos caigan en la misma ronda; caduca a las 12 h
3. Candidatos: pendientes ordenados por Haversine, maximo 10. ETA real del proxy solo para la tarjeta visible
4. Votos en `decisionVotes/{roundId}_{userId}` (`votes: { restaurantId: LIKE | PASS }`). La UI nunca muestra los votos del otro, solo el match
5. Cuando todos los participantes dan LIKE al mismo sitio, el primer cliente que lo detecta marca `MATCHED` en transaccion y ambos ven la pantalla de match

### Guardar desde Compartir (Android)
1. `intentFilters` SEND text/plain en `app.config.js` + `modules/share-intent` (lee EXTRA_SUBJECT/EXTRA_TEXT; arranque en frio `getInitialShare`, en caliente evento `onShare`)
2. `useShareIntent` (montado en TabNavigator) abre `Save` con `{ sharedText }`
3. `shareParser`: Google Maps largo → nombre (`/place/`) + coords (`!3d!4d` > `?q=` > `@`); `maps.app.goo.gl` → `POST /api/resolve-link` (sigue redirects solo a hosts de Maps, desenvuelve consent.google.com; fallback: fetch en el dispositivo). Instagram/TikTok → nombre del texto si es corto, nota "Visto en X: url"
4. SaveScreen prellena como Pendiente: con coords en modo manual; sin coords en el buscador de Places para confirmar

### Offline (Firestore persistence)
1. `enablePersistentCacheIndexAutoCreation` activado en init de Firebase
2. Datos se cachean automaticamente en dispositivo
3. Sin conexion: reads sirven datos cacheados, lista/mapa se ven normal
4. Sin conexion: writes se encolan localmente
5. Al reconectar: writes encolados se sincronizan automaticamente con servidor
6. En modo skip login: AsyncStorage ya es 100% local, offline por defecto

## 5. Dependencias Clave y Por Que

```json
{
  "@react-navigation/native": "navegacion",
  "firebase": "backend",
  "react-native-maps": "mapa de restaurantes",
  "expo-image-picker": "fotos",
  "expo-image-manipulator": "compresion",
  "expo-location": "auto-detectar ubicacion",
  "@react-native-async-storage/async-storage": "modo skip login",
  "nativewind": "Tailwind para React Native",
  "react-native-google-places-autocomplete": "buscar restaurantes por nombre"
}
```

## 6. Comandos

```bash
npm install && npx expo start          # app (dev build en Android Emulator)
cd server && npm install && npm run dev # proxy directions (otra terminal)
npm run sync                            # PC: git pull + npm install si cambio el lock + aviso de rebuild nativo
npm test                                # client (jest)
npm run server:test                     # server (directions + resolveLink)
npm run test:emulator                   # 2 usuarios + firestore.rules contra Firebase Emulator (necesita Java 21+; no toca bite-ba28f)
npm run typecheck                       # tsc --noEmit
npx jest src/__tests__/<archivo>        # test especifico antes que regresion completa
eas build --platform android            # build (ios igual)
```

## 7. Variables de Entorno Necesarias

```
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
GOOGLE_MAPS_API_KEY=
DIRECTIONS_PROXY_URL=http://localhost:3001/api/directions
```

Server (`server/.env`):
```
GOOGLE_DIRECTIONS_API_KEY=
CORS_ORIGINS=
PORT=3001
```

No commitear `.env`. App usa `app.config.js` con `expo-constants`. Server usa `process.env` directamente. `GOOGLE_DIRECTIONS_API_KEY` solo vive en el server, nunca en el cliente.

## 8. Reglas de Codigo (Code Conventions)

- Componentes: PascalCase (SaveScreen.tsx)
- Hooks: camelCase con prefijo 'use' (useRestaurants.ts)
- Services: camelCase (firebaseService.ts)
- Types: PascalCase en interfaces (Restaurant, User)
- Comentarios: Solo cuando la logica no es obvia
- TODO: Usar `// TODO:` con descripcion clara

## 9. Problemas Conocidos

- **Firebase `getReactNativePersistence` type warning**: La funcion existe en runtime pero carece de declaracion de tipos en Firebase v12. Resuelto con `@ts-ignore` en `src/config/firebase.ts`. No afecta funcionalidad.
- Si Firebase falla en emulador → usar dispositivo real
- Si Google Places excede cuota → fallback automatico a input manual (detectado en `SaveScreen` via `onFail`)
- Si fotos saturan Storage → reducir compresion a quality 0.6 en `src/config/constants.ts`
- **Migracion de fotos locales**: `migrateLocalData()` migra restaurantes pero no re-sube fotos locales a Storage (pasa `photoUri: null`). Las fotos guardadas en modo skip se pierden al migrar. Post-MVP.
- **Toggle visitado en skip mode**: en modo sin cuenta `DetailScreen` lo guarda en AsyncStorage (`updateLocalRestaurantVisited`).
- **Composite index requerido en Firestore**: La query `where('listId', '==', X) + orderBy('createdAt', 'desc')` en `useRestaurants` requiere un composite index en la coleccion `restaurants`. Crear en Firebase Console: coleccion `restaurants`, campos `listId` (Ascending) + `createdAt` (Descending). Sin este index, el listener falla silenciosamente y los restaurantes no se muestran al estar logueado.
- **Match: votos a ciegas solo en la UI**: Los clientes leen los votos de la ronda para detectar el match, asi que el secreto es de interfaz, no de seguridad. `firestore.rules` (propuesta, no desplegada) limita `decisionSessions` y `decisionVotes` a miembros de la lista; `subscribeVotes` filtra por `listId` + `roundId` para que la regla acepte la query. Minimo si no se despliegan: `request.auth != null`.
- **Compartir a Bite**: solo Android y solo en dev/prod build (el modulo nativo es `null` en Expo Go/iOS/Jest). Cambios en `modules/share-intent` o `intentFilters` requieren rebuild nativo. Instagram/TikTok no dan el nombre del local, solo URL/caption.
- **Firestore security rules**: Para que guardar funcione con cuenta, las security rules deben permitir write en `restaurants` a usuarios autenticados. Regla minima: `allow read, write: if request.auth != null;` en la coleccion `restaurants`.

## 10. Testing y QA

Orden: test especifico > `npm test` > QA en emulador solo si el cambio es visual/nativo.

Plan E2E completo, casos y runbook: `docs/qa/e2e-plan.md` (`npm run qa:all`, `-- --static` sin emulador).

Jest multi-project en `package.json`: **unit** (node: `timeAgo`, `searchFilter`, `matchLogic`, `shareParser`, `qaSeed`, `listService` y `decisionService` contra Firestore en memoria `jest/fakeFirestore.js`) y **components** (jest-expo/ios: `StarRating`, `RestaurantCard`, `MatchEntryCard`, `useLocation`). Requiere `react-native-worklets` (peer dep de RN 0.81). Server: `server/__tests__/` (directions: validacion + cache; resolveLink: allowlist, consent, loops).

### QA automatizado (adb, sin dependencias)

Entorno: PC Windows, Android Emulator Pixel 9, `adb` en PATH, Metro corriendo y dev build instalado (`com.lionardleyva.bite`). Scripts en `scripts/qa/` (helpers en `adb.js`: dump UI por uiautomator, tap por texto/accessibilityLabel, screenshot, logcat). Salida compacta `OK/FAIL` por check, exit code 1 si falla, screenshots en `qa-out/` (ignorado). Usar estos scripts en vez de navegar paso a paso con Mobile MCP; Mobile MCP solo para mirar el screenshot o flujos nuevos.

| Comando | Flujo | Verifica |
|---|---|---|
| `npm run qa:map -- --restaurant "Nombre" [--marker X,Y]` | abrir app > Continuar sin cuenta > Mapa > tocar marker | MapDetailCard con nombre, "Ver detalle", "Ir ahora"; sin errores JS en logcat |
| `npm run qa:location -- [--lat 40.4168 --lng -3.7038]` | permisos + `adb emu geo fix` (Madrid por defecto) > abrir app > Mapa > "Ir a mi ubicacion" | `dumpsys location` tiene la ubicacion inyectada; sin rechazos/errores en logcat; screenshot del mapa centrado |
| `npm run qa:logs` | - | errores JS/nativos recientes en logcat |
| `npm run qa:share -- --text "<texto>" [--state closed] [--name X] [--banner "Desde Google Maps"] [--save]` | compartir texto hacia Bite (`ACTION_SEND`) > Guardar restaurante prellenado > con `--save` guardar y comprobar que queda Pendiente | pantalla abierta, banner `Desde <origen>`, nombre esperado (o ninguno), sin errores JS |
| `npm run qa:all [-- --p0 \| --static \| --only IDs \| --release]` | suite E2E por bloques (estatico > reset+semilla > P0 > P1 > logs) | resumen `OK/FAIL/SKIP` por caso; exit 1 si falla un P0 |
| `npm run qa:seed [-- --visited]` | 3 restaurantes por Compartir (URLs de `seed-data.js`) + "QA Visitado" manual | quedan guardados |
| `npm run qa:save -- --name X [--state visitado] [--note T] \| --empty` | FAB > Ingresar manualmente > rellenar > Guardar | aparece en Lista con su estado; vacio no guarda |
| `npm run qa:list -- [--filter F] [--search T] --expect A,B [--absent C] [--restore C]` | Lista > filtro/busqueda > limpiar | nombres visibles/ocultos |
| `npm run qa:detail -- --restaurant X [--state S] [--toggle] [--delete]` | Lista > detalle | nombre, estado, toggle, eliminar |
| `npm run qa:keyboard` | escribe `gjpqy Gyoza` en Nombre, Direccion, Nota y Buscar | texto en el campo, campo sobre el teclado; descendentes en `qa-out/keyboard-*.png` |
| `npm run qa:safearea -- [--restaurant X]` | Mapa, Lista, Perfil, Guardar, Detalle | ningun nodo de Bite bajo status bar ni barra de gestos |

Notas:
- Los markers de Google Maps no salen en el arbol de accesibilidad si no tienen `title`: si `qa:map` no lo localiza, mira `qa-out/map-before.png` y pasa `--marker X,Y`.
- `qa:map` necesita al menos un restaurante guardado en modo sin cuenta (AsyncStorage persiste entre lanzamientos).
- `qa:location` no puede leer las coords del estado JS; la verificacion de que el mapa se centra es el screenshot.
- `adb emu geo fix` recibe longitud primero.
- `qa:share --state closed` no vale en una development build: el icono pasa por el launcher de dev-client y el texto compartido se pierde. Para el arranque en frio compila una release (`cd android && ./gradlew.bat assembleRelease -PreactNativeArchitectures=x86_64`, instalar con `adb install -r`) y ejecuta con `BITE_RELEASE=1`.
- `qa:location` da PASS aunque el mapa no se centre: solo comprueba `dumpsys` y logcat. Mira siempre `qa-out/location.png`. En el emulador la posicion solo llega con `Accuracy.High` (o con una posicion ya en cache); con `Balanced` (el valor de `locationService`) la peticion no se resuelve, no es un bug de Bite. Para forzarla usa un movil real.
- Metro con `npx expo start --dev-client --lan` sin `CI=1` (en modo CI no recarga los cambios). Emulador con `-gpu swiftshader_indirect` (con la GPU del host las capturas salen negras).
- Mobile MCP deja un `DeviceServer` que ocupa UiAutomation; `adb.js` lo cierra antes de volcar la UI (si no, `uiautomator` falla con "already registered").
- Tras `pm clear` el dev-client muestra su bienvenida/menu y Gboard el aviso "Try out your stylus": `adb.js` cierra el menu y desactiva `stylus_handwriting_enabled`. El boton flotante de engranaje (arriba a la derecha) es del dev-client, no de Bite.
- Capturas que hay que juzgar a ojo (`location.png`, `keyboard-*.png`, `safearea-*.png`): subagente `qa-visual-triage` (`.claude/agents/`), no Mobile MCP.
- `expo prebuild` reescribe los scripts `android`/`ios` de `package.json`: revertirlos.

### Manual (solo flujos no automatizados)

- **Compartir**: cuenta A > Perfil > "Compartir con pareja" (codigo) > cuenta B > Perfil > "Unirme" > codigo > ambos ven restaurantes en tiempo real.
- **Migracion**: modo sin cuenta con restaurantes > Perfil > "Crear cuenta" > registrarse > aceptar "Migrar restaurantes?".
- **Offline**: guardar con conexion > modo avion > mapa/lista siguen > reconectar > sync.

## 11. Referencias Rapidas

- `SPEC.md`: Especificacion completa del producto
- `CHANGELOG.md`: Historial de versiones
- `README.md`: Setup e instrucciones de desarrollo
