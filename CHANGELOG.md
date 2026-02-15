# Changelog

## v1.0.0 — MVP

### Milestone 1: Fundacion
- Proyecto Expo SDK 54 con TypeScript strict
- NativeWind v4 (Tailwind CSS para React Native)
- Firebase init: Auth con AsyncStorage persistence, Firestore con persistent cache, Storage
- React Navigation v7: bottom tabs (Mapa | Lista | Perfil) + stack (Save modal, Detail)
- Tipos base: User, Restaurant, RestaurantList
- Variables de entorno via `app.config.js` + `expo-constants`

### Milestone 2: Core — Guardar
- AuthScreen: login, registro, y modo sin cuenta (skip login)
- AuthContext: estado global de auth, skip mode con deviceId, migracion de datos locales
- SaveScreen: busqueda Google Places con fallback a input manual, rating 1-5 estrellas, toggle visitado/pendiente, nota, foto (camara/galeria)
- Compresion de fotos: resize max 800px, JPEG quality 0.7 via expo-image-manipulator
- Upload a Firebase Storage en `photos/{userId}/{restaurantId}.jpg`
- Modo skip: guardado completo en AsyncStorage sin necesidad de cuenta

### Milestone 3: Core — Ver
- HomeScreen: mapa con pins de colores (verde visitado, naranja pendiente), ubicacion del usuario, FAB "+"
- ListScreen: FlatList con RestaurantCard, busqueda por nombre/direccion, filtros (todos/visitados/pendientes)
- DetailScreen: foto, rating (solo lectura), direccion, nota, tiempo relativo, toggle visitado, boton "como llegar" (abre maps nativo), eliminar
- useRestaurants: listener onSnapshot para sync en tiempo real, carga local en skip mode
- useLocation: GPS + reverse geocode via expo-location
- Empty states para mapa y lista sin restaurantes

### Milestone 4: Compartir
- ProfileScreen: info usuario, seccion "Mi lista", compartir/gestionar lista, crear cuenta desde skip mode, cerrar sesion
- ShareListModal: tabs "Mi codigo" / "Unirme con codigo"
- InviteCodeDisplay: codigo formateado (ABC-123) + boton compartir via Share API
- listService: generacion de invite codes (6 chars, sin caracteres ambiguos), crear lista, unirse por codigo, dejar lista compartida
- Migracion automatica: al crear cuenta desde skip mode, detecta restaurantes locales y ofrece migrarlos a Firestore
- Sync en tiempo real: al unirse a lista compartida, useRestaurants re-subscribe con nuevo listId

### Milestone 5: Polish
- Accesibilidad: accessibilityLabel y accessibilityRole en SearchBar, FilterButtons, RestaurantCard, PhotoPicker, FAB, StarRating
- Performance: React.memo en RestaurantCard, useCallback en ListScreen renderItem, useMemo en HomeScreen initialRegion y DetailScreen restaurant find, useEffect para auto-fill en SaveScreen
- Testing: Jest 29 + jest-expo + @testing-library/react-native, 28 tests en 4 suites (timeAgo, searchFilter, StarRating, RestaurantCard)
- Code cleanup: unused imports removidos, search trim bug corregido, Firebase type warning resuelto con ts-ignore
- README.md: setup completo con instrucciones de Firebase, Google Maps, env vars, dev/test/build commands
