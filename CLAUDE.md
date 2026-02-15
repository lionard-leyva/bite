# CLAUDE.md - Bite

## 1. Resumen del Proyecto

**Bite** - App movil para guardar y recordar restaurantes en pareja/amigos. Guardar un sitio en 2 taps, compartir lista en tiempo real.

**Stack**: React Native + Expo + Firebase (Auth, Firestore, Storage) + TypeScript + NativeWind

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

## 3. Estructura del Proyecto

```
src/
├── __tests__/      # Jest tests (timeAgo, searchFilter, StarRating, RestaurantCard)
├── components/     # Reutilizables: StarRating, RestaurantCard, FAB, SearchBar, FilterButtons, PhotoPicker, ShareListModal, InviteCodeDisplay
├── screens/        # HomeScreen, SaveScreen, ListScreen, DetailScreen, ProfileScreen, AuthScreen
├── navigation/     # RootNavigator (stack) + TabNavigator (Mapa | Lista | Perfil)
├── contexts/       # AuthContext (auth state, skip mode, migracion, refreshListId)
├── services/       # restaurantService, listService, imageService, localStorageService, locationService
├── hooks/          # useRestaurants (onSnapshot/local), useAuth, useLocation
├── types/          # User, Restaurant, RestaurantList (interfaces TypeScript)
├── utils/          # timeAgo
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

## 6. Comandos de Desarrollo

```bash
# Iniciar
npm install
npx expo start

# Testing
npm test

# Build
eas build --platform ios
eas build --platform android
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
```

No commitear `.env`. Usar `app.config.js` con `expo-constants` para acceder en runtime.

## 8. Reglas de Codigo (Code Conventions)

- Componentes: PascalCase (SaveScreen.tsx)
- Hooks: camelCase con prefijo 'use' (useRestaurants.ts)
- Services: camelCase (firebaseService.ts)
- Types: PascalCase en interfaces (Restaurant, User)
- Comentarios: Solo cuando la logica no es obvia
- TODO: Usar `// TODO:` con descripcion clara

## 9. Milestones y Estado Actual

- [x] Milestone 1: Fundacion
- [x] Milestone 2: Core - Guardar
- [x] Milestone 3: Core - Ver
- [x] Milestone 4: Compartir
- [x] Milestone 5: Polish

Marcar con [x] cuando se completen.

## 10. Problemas Conocidos

- **Firebase `getReactNativePersistence` type warning**: La funcion existe en runtime pero carece de declaracion de tipos en Firebase v12. Resuelto con `@ts-ignore` en `src/config/firebase.ts`. No afecta funcionalidad.
- Si Firebase falla en emulador → usar dispositivo real
- Si Google Places excede cuota → fallback automatico a input manual (detectado en `SaveScreen` via `onFail`)
- Si fotos saturan Storage → reducir compresion a quality 0.6 en `src/config/constants.ts`
- **Migracion de fotos locales**: `migrateLocalData()` migra restaurantes pero no re-sube fotos locales a Storage (pasa `photoUri: null`). Las fotos guardadas en modo skip se pierden al migrar. Post-MVP.
- **Toggle visitado en skip mode**: `DetailScreen` deshabilita el toggle en modo sin cuenta. Solo funciona con Firestore.
- **Composite index requerido en Firestore**: La query `where('listId', '==', X) + orderBy('createdAt', 'desc')` en `useRestaurants` requiere un composite index en la coleccion `restaurants`. Crear en Firebase Console: coleccion `restaurants`, campos `listId` (Ascending) + `createdAt` (Descending). Sin este index, el listener falla silenciosamente y los restaurantes no se muestran al estar logueado.
- **Firestore security rules**: Para que guardar funcione con cuenta, las security rules deben permitir write en `restaurants` a usuarios autenticados. Regla minima: `allow read, write: if request.auth != null;` en la coleccion `restaurants`.

## 11. Testing

### Ejecutar tests

```bash
npm test              # Todos (28 tests, 4 suites)
npm run test:watch    # Watch mode
npx jest --no-cache   # Sin cache
```

### Configuracion

Jest usa multi-project config en `package.json`:
- **unit** (node env): tests de logica pura (`timeAgo`, `searchFilter`)
- **components** (jest-expo/ios): tests de componentes React Native (`StarRating`, `RestaurantCard`)

Requiere `react-native-worklets` como dev dependency (peer dep de RN 0.81 para babel transform).

### Tests existentes

| Suite | Archivo | Tests | Que cubre |
|-------|---------|-------|-----------|
| timeAgo | `src/__tests__/timeAgo.test.ts` | 8 | Todos los rangos de tiempo (segundos a anos), singular/plural |
| searchFilter | `src/__tests__/searchFilter.test.ts` | 8 | Filtros visitado/pendiente, busqueda por nombre/direccion, combinaciones, trim |
| StarRating | `src/__tests__/StarRating.test.tsx` | 4 | Render 5 estrellas, onRate callback, estrellas llenas, accessibility labels |
| RestaurantCard | `src/__tests__/RestaurantCard.test.tsx` | 8 | Nombre, direccion, estrellas, onPress, indicador visitado/pendiente, placeholder foto, accessibility |

### Escenarios de prueba manual

**Flujo basico (guardar + ver):**
1. Abrir app → AuthScreen aparece
2. "Continuar sin cuenta" → mapa vacio con hint
3. Tap "+" → SaveScreen modal
4. Buscar restaurante (o input manual si no hay API key)
5. Seleccionar rating, toggle visitado, nota opcional, foto opcional
6. Guardar → vuelve al mapa con pin nuevo
7. Tab "Lista" → card del restaurante aparece
8. Tap card → DetailScreen con toda la info
9. "Como llegar" → abre app de mapas nativa
10. Toggle visitado → pin cambia de color

**Flujo compartir:**
1. Crear cuenta desde Perfil
2. Perfil → "Compartir con pareja" → modal muestra codigo (ej: ABC-123)
3. En otro dispositivo: crear cuenta → Perfil → modal → tab "Unirme" → ingresar codigo
4. Alert "Conectado con [nombre]"
5. Restaurantes de ambos aparecen en ambos dispositivos en tiempo real

**Flujo migracion skip → cuenta:**
1. Usar app en modo skip, guardar restaurantes
2. Perfil → "Crear cuenta" → confirmar
3. Registrarse en AuthScreen
4. Alert "Migrar restaurantes?" → aceptar
5. Restaurantes migrados a Firestore, visibles en lista

**Offline:**
1. Guardar restaurantes con conexion
2. Activar modo avion
3. App muestra datos cacheados (mapa + lista funcionan)
4. Desactivar modo avion → datos se sincronizan

## 12. Referencias Rapidas

- `SPEC.md`: Especificacion completa del producto
- `CHANGELOG.md`: Historial de versiones
- `README.md`: Setup e instrucciones de desarrollo
