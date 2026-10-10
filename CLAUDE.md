# CLAUDE.md — Bite

App móvil para parejas: guardar un restaurante en 2 toques y compartir la lista en tiempo real.
React Native + Expo 57 · Firebase 12 (Auth, Firestore, Storage) · TypeScript · NativeWind · servidor Express en `server/`.
Producto: `SPEC.md`. Plan de pruebas: `docs/qa/e2e-plan.md`. Comportamientos: `features/*.feature`.

## Reglas de trabajo
- Rama de trabajo: `master-hzgidc`. No subir a otra rama sin permiso.
- Un comportamiento nuevo empieza en un `.feature` en español con su ID del plan. Verlo fallar, luego implementar.
- Tras implementar, muta el código a propósito: si un escenario sobrevive, es decorativo.
- No afirmes que algo funciona sin haber ejecutado `npm run typecheck` y `npm test` en esa respuesta.
- No saltes, desactives ni borres tests para pasar. Corrige el código o el script.
- Sin atribución a Claude ni a ningún modelo: ni en commits, ni en PRs, ni en comentarios, código o docs (sin `Co-Authored-By`, `Claude-Session`, "Generated with", enlaces de sesión, nombres de modelo).
- PRs en borrador. Se fusionan con squash y solo con `CI ok` en verde.
- No despliegues en Firebase ni toques reglas, índices o credenciales desde aquí.
- Secretos fuera de git. `.env` nunca se commitea.
- Comentarios solo si la lógica no es obvia. Textos de UI y nombres de features en español.
- Un push nuevo cancela el E2E en marcha de la misma rama: espera a que termine antes de subir cambios pequeños.

## Vista previa y E2E
- `expo-preview.yml` publica en Expo Go tras typecheck y Jest, y solo con el E2E P0 del cambio en verde.
- El E2E se revisa cuando termina; no se espera parado.
- Si un caso P0 falla: depurar, corregir con un push validado y no publicar.

## Arquitectura
- Colecciones raíz: `users`, `restaurants`, `lists`, `decisionSessions`, `decisionVotes`. Se enlazan por `listId`, sin subcolecciones.
- Tiempo real con `onSnapshot`. La búsqueda es local (`utils/searchMatch`: sin tildes ni mayúsculas).
- Modo sin cuenta en AsyncStorage. Al loguearse se ofrece migrar (`migrationService`).
- Fotos: 800 px, calidad 0,7, antes de subir a `photos/{userId}/{id}.jpg`.
- Restaurantes no se editan en v1: se borran y se guardan de nuevo.
- Guardar (`SaveScreen`): buscador de sitios desde 3 letras, vía `placesService` y el servidor. Nunca se geocodifica el nombre. Sin ubicación, el pin se arrastra. A más de 150 km se pide confirmar (`utils/saveRules`).
- Lista compartida: código de 6 caracteres en `lists/{id}.inviteCode`.
- "¿Dónde cenamos hoy?": ronda en `decisionSessions/{listId}`, votos ocultos solo en la UI, caduca a las 12 h.
- Guardar desde Compartir (Android): `modules/share-intent` + `utils/shareParser`.
- La clave de Google vive solo en el servidor. El JS no la lee.

## Tema Terracota
- Colores solo desde `src/theme/palette.js`, vía `useTheme()` o clases Tailwind. Nada de hex ni `rgba()` en la UI.
- Siempre claro (`userInterfaceStyle: light`).
- Títulos en Young Serif (`font-display`); texto en Figtree (`font-sans*`). No uses `font-bold`.
- Botones de solo icono con `accessibilityLabel`. Las animaciones respetan `useReducedMotion`.
- iOS: Apple Maps ignora `customMapStyle`; se usa `mapType: mutedStandard`.

## Comandos
```bash
npm install && npx expo start
cd server && npm install && npm run dev   # directions en :3001
npm run typecheck                         # tsc --noEmit
npm test                                  # Jest unit + components
npm run server:test
npm run test:emulator                     # reglas de Firestore (Java 21+)
npm run qa:all -- --p0                    # E2E en emulador Android (ver e2e-plan)
```

## Variables de entorno
- App (`.env`, lee `app.config.js`): `FIREBASE_*`, `GOOGLE_MAPS_API_KEY` (solo SDK nativo), `DIRECTIONS_PROXY_URL`, `API_BASE_URL` (opcional).
- Servidor (`server/.env`): `GOOGLE_DIRECTIONS_API_KEY`, `CORS_ORIGINS`, `PORT`.

## Trampas conocidas
- `getReactNativePersistence` sin tipos en Firebase 12: `@ts-ignore` en `src/config/firebase.ts`.
- La lista necesita el índice de `firestore.indexes.json`; sin él no aparecen restaurantes con sesión.
- El buscador de sitios falla en el móvil hasta desplegar `/api/places/*` (PR B). Entonces Guardar pasa a "a mano" con aviso.
- Compartir a Bite: solo Android, en build de desarrollo o producción. Cambiar `modules/` o `intentFilters` exige recompilar.
- Perfil: al cambiar la ciudad a mano, `cityLat/cityLng` anteriores quedan en Firestore (nadie los lee hoy).
