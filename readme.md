# Bite

App movil para parejas y amigos que siempre olvidan buenos restaurantes. Guarda un sitio en 2 taps, comparte tu lista en tiempo real.

**Problema**: Descubres un restaurante increible, lo olvidas en 2 dias. Tu pareja te pregunta "donde era ese sitio?" y ninguno se acuerda.

**Solucion**: Bite te permite guardar restaurantes al instante (nombre, foto, estrellas, ubicacion), verlos en mapa o lista, y compartir una lista sincronizada con tu pareja en tiempo real.

## Features (MVP)

- **Guardar rapido**: Busqueda por nombre con Google Places o input manual, foto desde camara/galeria, rating 1-5 estrellas, nota opcional
- **Vista mapa**: Pins de colores (verde = visitado, naranja = pendiente) con tu ubicacion
- **Vista lista**: Cards con foto, estrellas, busqueda y filtros (todos/visitados/pendientes)
- **Detalle**: Foto, rating, nota, boton "como llegar", toggle visitado/pendiente, eliminar
- **Compartir lista**: Codigo de invitacion de 6 caracteres, sync en tiempo real via Firestore
- **Modo sin cuenta**: Funcionalidad completa sin registro, datos locales, migracion al crear cuenta
- **Offline**: Datos cacheados, writes encolados, sync automatico al reconectar

## Stack

- **React Native + Expo SDK 54** — iOS + Android desde una base
- **Firebase** — Auth (email/password), Firestore (datos), Storage (fotos)
- **Google Maps** — Mapa, pins, busqueda de lugares
- **TypeScript** — Strict mode
- **NativeWind v4** — Tailwind CSS para React Native

## Setup

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Rellena `.env` con tus credenciales:

```
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
GOOGLE_MAPS_API_KEY=
```

Las variables se leen en `app.config.js` y se exponen via `expo-constants` en runtime.

### 3. Firebase

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com)
2. Activa **Authentication** → Email/Password
3. Crea una base de datos **Firestore** (produccion o test mode)
4. Activa **Storage**
5. Copia las credenciales del SDK web a tu `.env`

Colecciones Firestore (se crean automaticamente):
- `users` — perfil y referencia a lista
- `restaurants` — restaurantes con `listId` para filtrar
- `lists` — listas compartidas con `members[]` e `inviteCode`

### 4. Google Maps

1. En [Google Cloud Console](https://console.cloud.google.com), activa:
   - Maps SDK for iOS
   - Maps SDK for Android
   - Places API
2. Copia la API key a `GOOGLE_MAPS_API_KEY` en `.env`

## Desarrollo

```bash
# Iniciar Expo dev server
npx expo start

# Plataforma especifica
npx expo start --ios
npx expo start --android
```

## Tests

```bash
# Ejecutar todos los tests (28 tests, 4 suites)
npm test

# Watch mode
npm run test:watch
```

Tests incluyen:
- `timeAgo` — utilidad de formato de tiempo relativo
- `searchFilter` — logica de busqueda y filtrado de restaurantes
- `StarRating` — componente de rating interactivo
- `RestaurantCard` — card de restaurante con datos y accesibilidad

## Build

```bash
eas build --platform ios
eas build --platform android
```

## Arquitectura

```
src/
├── components/     # Reutilizables: StarRating, RestaurantCard, FAB, SearchBar, FilterButtons, PhotoPicker, ShareListModal, InviteCodeDisplay
├── screens/        # HomeScreen (mapa), ListScreen, SaveScreen (modal), DetailScreen, ProfileScreen, AuthScreen
├── navigation/     # RootNavigator (stack) + TabNavigator (tabs: Mapa | Lista | Perfil)
├── contexts/       # AuthContext — estado global de auth, skip mode, migracion
├── hooks/          # useRestaurants (onSnapshot), useAuth, useLocation
├── services/       # restaurantService, listService, imageService, localStorageService, locationService
├── types/          # User, Restaurant, RestaurantList
├── utils/          # timeAgo
└── config/         # firebase.ts, constants.ts
```

Flujo de datos: Screen → Hook → Service → Firebase/AsyncStorage. Real-time sync via `onSnapshot` listeners.

Para detalles de arquitectura, decisiones criticas y flujos de datos, ver `CLAUDE.md`.

## Documentacion

- `SPEC.md` — Especificacion completa del producto (user stories, data models, wireframes, security rules)
- `CLAUDE.md` — Guia de arquitectura y decisiones para desarrollo asistido por IA
- `CHANGELOG.md` — Historial de versiones

## Screenshots

<!-- TODO: Añadir screenshots de las pantallas principales -->
<!-- Mapa | Lista | Guardar | Detalle | Perfil | Compartir -->
