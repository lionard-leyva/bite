# Bite

App móvil para parejas y amigos que siempre olvidan los buenos restaurantes. Guardas un sitio en dos toques, lo veis en el mapa y en una lista compartida en tiempo real, y cuando no sabéis dónde cenar, decidís juntos sin ver lo que vota el otro.

## Qué hace

- **Guardar en el sitio correcto**: buscas el restaurante desde 3 letras (sugerencias cerca de ti) y se rellenan solos el nombre, la dirección y el pin. Si no aparece, lo añades a mano y marcas dónde está con tu ubicación, una dirección sugerida o arrastrando el pin. Nunca se adivina la ubicación; si el sitio está a más de 150 km, Bite te pregunta antes de guardar.
- **Mapa**: a pantalla completa, con pines en píldora (terracota pendiente, ✓ visitado), filtros Todos / Pendientes / Visitados y una hoja con foto, "★ 4 · €€ · a 6 min", quién lo guardó, "Ver detalle" e "Ir ahora".
- **Lista**: "Tu lista" o "Vuestra lista", búsqueda sin tildes ni mayúsculas, filtros y tarjetas con foto.
- **¿Dónde cenamos hoy?**: los dos votáis los pendientes a ciegas; cuando coincidís, hay match.
- **Compartir lista**: código de invitación de 6 caracteres y sincronización al instante (Firestore `onSnapshot`).
- **Guardar desde Compartir** (Android): compartes un enlace de Google Maps, Instagram o TikTok con Bite y se abre el formulario prellenado.
- **Sin cuenta**: todo funciona en el móvil (AsyncStorage); al crear cuenta se ofrece migrar los restaurantes.
- **Offline**: los datos se ven sin conexión y lo guardado se sincroniza al volver.

Diseño **A · Terracota**, siempre en claro, con Young Serif y Figtree.

## Stack

- **React Native 0.86 + Expo SDK 57**, TypeScript estricto, NativeWind 4
- **Firebase 12**: Auth, Firestore y Storage
- **react-native-maps**: Google Maps en Android, Apple Maps en iOS
- **Servidor propio** (`server/`, Express): direcciones y resolución de enlaces cortos de Maps. La búsqueda de sitios (`/places/*`) llegará con Firebase Functions; hasta entonces Guardar pasa a "a mano". Las claves de Google viven en el servidor, nunca en la app.

## Puesta en marcha

```bash
npm install
cp .env.example .env      # rellena las variables de abajo
npx expo start            # app (dev build o Expo Go)
cd server && npm install && npm run dev   # servidor en otra terminal (puerto 3001)
```

Variables de la app (`.env`, las lee `app.config.js`):

| Variable | Para qué |
|---|---|
| `FIREBASE_*` | Configuración web del proyecto de Firebase |
| `GOOGLE_MAPS_API_KEY` | Solo el SDK nativo del mapa (restríngela a la app en Google Cloud). El código JS no la lee. |
| `DIRECTIONS_PROXY_URL` | URL del servidor para direcciones (por defecto `http://localhost:3001/api/directions`) |
| `API_BASE_URL` | Opcional: base del servidor para `/places/*`; por defecto la de `DIRECTIONS_PROXY_URL` sin `/directions` |

Variables del servidor (`server/.env`): `GOOGLE_DIRECTIONS_API_KEY`, `CORS_ORIGINS`, `PORT`.

Firebase: activa Authentication (email/contraseña), Firestore y Storage. Las colecciones `users`, `restaurants`, `lists`, `decisionSessions` y `decisionVotes` se crean solas. Las reglas están en `firestore.rules` y el índice que necesita la lista en `firestore.indexes.json`.

## Tests

```bash
npm run typecheck       # tsc --noEmit
npm test                # Jest: unit + components (53 suites, 420 tests)
npm run server:test     # servidor
npm run test:emulator   # reglas de Firestore y dos usuarios en el Firebase Emulator (Java 21+)
```

Los comportamientos se escriben primero en Gherkin, en español (`features/*.feature`), y se ejecutan con `jest-cucumber`. Cada escenario lleva el ID de su caso en `docs/qa/e2e-plan.md`. Las pruebas en el emulador de Android están en `scripts/qa/` (`npm run qa:all`).

## CI y vista previa

- **`ci.yml`** (en cada PR, ~3 min): typecheck, Jest, servidor, bundle de Android y reglas de Firestore. Solo se fusiona con **CI ok** en verde.
- **`qa-e2e.yml`** (~50 min): la app en un emulador de Android. En los PR que tocan pantallas corre los casos P0; de noche, la suite entera.
- **`expo-preview.yml`**: publica en Expo Go (rama `preview`) después de typecheck y Jest, y solo con el E2E P0 del cambio en verde.

## Build

```bash
npm install -g eas-cli && eas login
eas build --platform android --profile preview   # APK para instalar y compartir
eas build --platform android --profile production # AAB para Play Store
```

## Estructura

```
src/
├── screens/     Home (mapa), List, Save, Detail, Match, Profile, Auth
├── components/  MapMarker, MapDetailCard, MiniMap, RestaurantCard, MatchEntryCard, FilterButtons, PriceChips, ...
├── services/    restaurant, list, places, image, localStorage, location, navigation, decision, migration, share
├── hooks/       useRestaurants, useAuth, useLocation, useNavigationETA, useDecisionSession, ...
├── utils/       saveRules, mapFocus, matchLogic, shareParser, searchMatch, userError, price, geo, ...
├── theme/       palette.js (única fuente de colores), ThemeProvider, mapStyle, FontGate
└── config/      firebase.ts, constants.ts
server/          Express: /api/directions, /api/resolve-link
modules/         share-intent (Android, recibir texto compartido)
features/        Gherkin en español
scripts/qa/      E2E por adb
```

## Documentación

- `CLAUDE.md`: arquitectura, decisiones, problemas conocidos y forma de trabajar (TDD con Gherkin, CI por niveles)
- `SPEC.md`: especificación del producto
- `docs/qa/e2e-plan.md`: plan de pruebas con todos los casos
- `CHANGELOG.md`: historial de versiones
