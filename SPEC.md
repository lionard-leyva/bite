# SPEC: Bite - Guarda tus restaurantes favoritos

## 1. Overview

### Problema
Las parejas y amigos frecuentemente descubren buenos restaurantes pero los olvidan. No existe una herramienta simple y rápida enfocada exclusivamente en guardar y recordar sitios visitados para compartir con personas cercanas.

### Solución
Bite es una app móvil minimalista que permite guardar un restaurante en menos de 15 segundos: ubicación auto-detectada, rating rápido, foto opcional y nota corta. Las listas se comparten entre parejas/amigos en tiempo real.

### Usuarios objetivo
- Parejas que salen a comer frecuentemente
- Grupos de amigos que comparten recomendaciones gastronómicas
- Personas que viajan y quieren recordar dónde comieron

## 2. Goals & Non-Goals

### Goals
- Guardar un restaurante en **menos de 15 segundos** (2 taps mínimo si vas rápido)
- **UNA lista compartida** por pareja: ambos ven y agregan, sync automático en tiempo real vía Firestore `onSnapshot` listeners
- Ver restaurantes guardados en mapa y lista, con búsqueda de texto local
- Marcar restaurantes como "Visitado" o "Pendiente de ir" con un simple toggle
- Funcionar en iOS y Android desde una sola base de código
- Carga inicial < 2 segundos
- **Offline-first**: Firestore persistence habilitado, la lista se ve sin conexión y se sincroniza al reconectar
- Permitir uso sin login (datos locales) para reducir fricción; login requerido solo para sync/compartir

### Non-Goals
- NO es una red social pública
- NO incluye reviews de otros usuarios
- NO tiene sistema de reservas
- NO tiene gamificación compleja (badges, puntos, etc.)
- NO es una plataforma de descubrimiento (no sugiere restaurantes)
- NO tiene chat integrado
- NO tiene múltiples listas por usuario en MVP (una lista personal + una compartida)
- NO permite editar restaurante en v1 (si se equivoca, elimina y re-guarda; editar es post-MVP por conflictos de edicion concurrente)

## 3. User Stories

### US-1: Guardar restaurante rápido (2-3 taps)
**Como** usuario, **quiero** guardar un restaurante en 2-3 taps **para** no olvidarlo después.
- Abro la app, toco "+", se auto-detecta ubicación y sugiere nombre del lugar
- Toco estrellas (1-5) y toco "Guardar" = **2 taps** (ruta rápida)
- Opcionalmente: tomo foto (1 tap cámara/galería) y/o escribo nota corta
- Foto y nota son **siempre opcionales**, nunca bloquean el guardado

### US-2: Ver mis restaurantes en mapa
**Como** usuario, **quiero** ver pins en un mapa con mis restaurantes guardados **para** encontrar opciones cercanas rápido.

### US-3: Ver mis restaurantes en lista
**Como** usuario, **quiero** ver una lista con foto, nombre y estrellas **para** recordar mis favoritos de un vistazo.
- Incluye búsqueda de texto simple para filtrar mis restaurantes guardados

### US-4: Compartir lista con pareja
**Como** usuario, **quiero** compartir UNA lista con mi pareja mediante código de invitación **para** que ambos veamos y agreguemos restaurantes automáticamente.
- Al unirse, la pareja ve todos los restaurantes en tiempo real (Firestore onSnapshot)
- No hay que "invitar" por cada restaurante, la lista entera es compartida

### US-5: Ver detalle de restaurante
**Como** usuario, **quiero** ver la foto, nota, estrellas y ubicación de un restaurante **para** decidir si vuelvo y cómo llegar.

### US-6: Autenticación simple (con skip)
**Como** usuario, **quiero** poder probar la app sin registrarme **para** decidir si me gusta antes de crear cuenta.
- Skip login: datos guardados en AsyncStorage localmente, funcionalidad completa excepto compartir
- Login con email o Google: habilita sync entre dispositivos y compartir lista
- **Migración al hacer login posterior:**
  - Detectar datos locales en AsyncStorage
  - Mostrar modal: "Tienes X restaurantes guardados. ¿Migrarlos a tu cuenta?"
  - Si acepta: crear lista en Firestore y migrar restaurants + fotos
  - Si rechaza: mantener solo en local (no sincroniza, puede migrar después desde Perfil)

### US-7: Marcar como "Pendiente de ir"
**Como** usuario, **quiero** marcar restaurantes como "visitado" o "pendiente" **para** tener una lista de sitios por probar.
- Toggle simple: `visited: true/false`
- La lista se puede filtrar por visitados / pendientes

## 4. Architecture

### Diagrama de componentes

```
┌─────────────────────────────────────────────┐
│              React Native + Expo             │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Screens  │  │Components│  │Navigation │  │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  │
│       │              │              │         │
│  ┌────┴──────────────┴──────────────┴─────┐  │
│  │            Custom Hooks                 │  │
│  └────────────────┬────────────────────────┘  │
│                   │                           │
│  ┌────────────────┴────────────────────────┐  │
│  │             Services Layer              │  │
│  │  ┌──────────┐ ┌──────┐ ┌────────────┐  │  │
│  │  │ Firebase │ │ Maps │ │   Image    │  │  │
│  │  │ Service  │ │  API │ │ Compressor │  │  │
│  │  └──────────┘ └──────┘ └────────────┘  │  │
│  └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌──────────────┐         ┌──────────────┐
│  Firebase    │         │ Google Maps  │
│  - Auth      │         │     API      │
│  - Firestore │         └──────────────┘
│  - Storage   │
└──────────────┘
```

### Flujo de datos
1. Usuario interactúa con **Screen**
2. Screen usa **Custom Hook** que llama al **Service**
3. Service se comunica con **Firebase/Maps API**
4. **Firestore `onSnapshot` listeners** actualizan datos en tiempo real (no polling)
5. Componentes se re-renderizan con datos nuevos
6. **Offline**: Firestore persistence habilitado (`enablePersistentCacheIndexAutoCreation`), datos cacheados localmente

### Decisiones de arquitectura
- **Top-level collections** (no subcollections): `users`, `restaurants`, `lists` son colecciones raíz con referencias por `listId`. Esto permite queries flexibles y reduce costes de Firestore (un read por documento, no nested reads)
- **Firestore `onSnapshot`** para real-time sync (no polling): cuando la pareja agrega un restaurante, aparece inmediatamente
- **Fotos**: compresión con `expo-image-manipulator` (resize a max 800px, quality 0.7) ANTES de subir a Storage. Resultado < 200KB típico
- **Maps API**: Google Places Autocomplete (gratis hasta 5,000 sesiones/mes). Fallback: input manual de nombre + dirección si se excede cuota
- **Skip login**: AsyncStorage para datos locales. Al hacer login, se migran datos locales a Firestore
- **Búsqueda local**: NO usa Firestore queries (no soporta full-text search). Filtrado en cliente sobre datos cacheados:
  ```typescript
  restaurants.filter(r =>
    r.name.toLowerCase().includes(query.toLowerCase()) ||
    r.address.toLowerCase().includes(query.toLowerCase())
  )
  ```
  Funciona offline porque filtra datos ya cacheados localmente

### Estructura Firebase

```
Firestore (top-level collections, no subcollections):
├── users/{userId}
│   ├── email: string
│   ├── displayName: string
│   ├── createdAt: timestamp
│   └── sharedListId: string | null    ← UNA sola lista compartida
│
├── restaurants/{restaurantId}
│   ├── name: string
│   ├── address: string
│   ├── latitude: number
│   ├── longitude: number
│   ├── rating: number (1-5)
│   ├── note: string
│   ├── photoURL: string | null
│   ├── visited: boolean               ← true = visitado, false = pendiente
│   ├── createdBy: string (userId)
│   ├── createdAt: timestamp
│   ├── updatedAt: timestamp
│   └── listId: string
│
├── lists/{listId}
│   ├── name: string
│   ├── ownerId: string (userId)
│   ├── members: string[] (userIds)
│   ├── createdAt: timestamp
│   └── inviteCode: string (6 chars, uppercase)

Storage:
└── photos/{userId}/{restaurantId}.jpg  ← comprimido < 200KB antes de subir
    // {userId} en vez de {listId} para que funcione en modo skip
    // (userId = deviceId temporal en skip, Firebase UID al loguearse)
```

**Por que top-level y no subcollections:**
- Queries: `where("listId", "==", X)` sobre coleccion raiz = simple y barato
- No collection group queries necesarias (mas costosas)
- Un listener en `restaurants` filtrado por `listId` = sync eficiente

## 5. API / Data Models (TypeScript)

```typescript
// types/user.ts
interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
  sharedListId: string | null; // UNA lista compartida con pareja
}

// types/restaurant.ts
interface Restaurant {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number; // 1-5
  note: string;
  photoURL: string | null;
  visited: boolean; // true = visitado, false = pendiente de ir
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  listId: string;
}

// types/list.ts
interface RestaurantList {
  id: string;
  name: string;
  ownerId: string;
  members: string[];
  createdAt: Date;
  inviteCode: string; // 6 chars uppercase para compartir
}
```

## 6. UI/UX Flow

### Pantalla 1: Home (Mapa)
```
┌─────────────────────────┐
│  ☰  Bite         🔍    │
│─────────────────────────│
│                         │
│     [  MAPA CON PINS  ]│
│     [  de restaurantes ]│
│     [                  ]│
│     [       📍         ]│
│     [    📍      📍    ]│
│     [                  ]│
│                         │
│─────────────────────────│
│              ┌───┐      │
│              │ + │      │  ← Botón flotante
│              └───┘      │
│─────────────────────────│
│  🗺️ Mapa  │  📋 Lista │  │  ← Tab navigation
└─────────────────────────┘
```

### Pantalla 2: Guardar restaurante (1 pantalla, 2 taps minimo)
```
┌─────────────────────────┐
│  ← Guardar restaurante  │
│─────────────────────────│
│  📍 Restaurante La Plaza│  ← Auto-detectado por ubicacion
│  [🔍 Buscar otro...   ]│  ← Solo si el auto no acerto
│                         │
│  ★ ★ ★ ★ ☆             │  ← Tap 1: seleccionar estrellas
│                         │
│  ○ Visitado  ● Pendiente│  ← Toggle visited/pendiente
│                         │
│  📝 Nota (opcional):    │
│  [                     ]│
│                         │
│  📷 Foto (opcional):    │
│  [Tomar foto / Galería]│
│                         │
│       [Guardar ✓]       │  ← Tap 2: guardar
└─────────────────────────┘

Ruta rapida: ubicacion auto + tap estrellas + tap guardar = 2 taps, <10s
Ruta completa: buscar + estrellas + nota + foto + guardar = ~15s

Si Places API falla o se excede cuota:
  - Input manual de nombre (obligatorio)
  - Input manual de direccion (opcional, para pin en mapa)
  - Si no hay direccion: usar coordenadas GPS actuales
  - Banner: "No pudimos buscar restaurantes. Introduce el nombre manualmente."
```

### Pantalla 3: Lista
```
┌─────────────────────────┐
│  ☰  Mis Restaurantes    │
│─────────────────────────│
│  [🔍 Buscar...]        │  ← Busqueda texto local
│  [Todos][Visitados][Pend]│  ← Filtro por estado
│─────────────────────────│
│ ┌─────────────────────┐ │
│ │ 🖼️ │ La Plaza    ✓  │ │  ← ✓ = visitado
│ │    │ ★★★★☆  · 2 sem│ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ 🖼️ │ Sushi Master ○ │ │  ← ○ = pendiente
│ │    │ ★★★★★  · 1 mes│ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ 🖼️ │ Taco Loco   ✓ │ │
│ │    │ ★★★☆☆  · 3 mes│ │
│ └─────────────────────┘ │
│─────────────────────────│
│  🗺️ Mapa  │  📋 Lista │  │
└─────────────────────────┘
```

### Pantalla 4: Detalle
```
┌─────────────────────────┐
│  ←                      │
│  ┌─────────────────────┐│
│  │                     ││
│  │   [FOTO GRANDE]     ││
│  │                     ││
│  └─────────────────────┘│
│                         │
│  La Plaza               │
│  ★★★★☆                 │
│  📍 Calle Mayor 15      │
│  📝 "La pasta increíble"│
│  🕐 Hace 2 semanas      │
│                         │
│  [🧭 Cómo llegar]      │
│  [🗑️ Eliminar]          │  ← Si se equivocó, elimina y re-guarda
└─────────────────────────┘

Nota: NO hay editar en v1. Si el usuario se equivocó, elimina y vuelve
a guardar. Editar se considera post-MVP (conflictos si pareja edita a la vez).
```

### Pantalla 5: Perfil
```
┌─────────────────────────┐
│  ← Perfil               │
│─────────────────────────│
│       👤                │
│   usuario@email.com     │
│                         │
│  📋 Mi lista            │
│  [Compartir con pareja] │
│  Código: ABC-123        │
│                         │
│  ⚙️ Configuración       │
│  [Cerrar sesión]        │
└─────────────────────────┘
```

### Flujo de navegación
```
Onboarding (primera vez)
  └→ Skip login? ──→ Modo local (sin sync)
  └→ Login/Register (email/Google)
      └→ Tab Navigator
          ├── Home (Mapa) ──→ Detalle restaurante
          ├── Lista (con busqueda + filtro visited/pendiente) ──→ Detalle
          └── Perfil (compartir lista, login si modo skip)
          └── [+] FAB ──→ Guardar restaurante (Modal/Stack)
```

## 7. Security & Privacy

### Reglas Firestore
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Usuarios: solo lectura/escritura de su propio documento
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Restaurantes: lectura/escritura solo para miembros de la lista
    match /restaurants/{restaurantId} {
      allow read: if request.auth != null &&
        isListMember(resource.data.listId);
      allow create: if request.auth != null &&
        isListMember(request.resource.data.listId);
      allow update, delete: if request.auth != null &&
        isListMember(resource.data.listId);
    }

    // Listas: solo miembros pueden leer, solo owner gestiona
    match /lists/{listId} {
      allow read: if request.auth != null &&
        request.auth.uid in resource.data.members;
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
        request.auth.uid == resource.data.ownerId;
    }

    function isListMember(listId) {
      return request.auth.uid in
        get(/databases/$(database)/documents/lists/$(listId)).data.members;
    }
  }
}
```

### Storage rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /photos/{userId}/{restaurantId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.auth.uid == userId
        && request.resource.size < 2 * 1024 * 1024; // max 2MB
    }
  }
}
```

### Privacidad
- Los datos de restaurantes solo son visibles para miembros de la lista
- No se recopilan datos de uso ni ubicación en segundo plano
- La ubicación solo se usa al momento de guardar un restaurante
- Las fotos se almacenan en Firebase Storage con acceso restringido

## 8. Success Metrics

| Métrica | Objetivo | Cómo medir |
|---------|----------|------------|
| Tiempo guardar restaurante | < 15 segundos (ruta completa), < 10s (ruta rápida) | Analytics: timestamp desde tap "+" hasta "Guardar" |
| **Time-to-first-save** | < 2 minutos desde instalar | Analytics: install → primer restaurante guardado |
| Carga inicial app | < 2 segundos | Performance monitoring Firebase |
| Tasa de retención semanal | > 40% | Firebase Analytics |
| Restaurantes guardados/usuario/mes | > 3 | Query Firestore |
| Listas compartidas | > 50% usuarios comparten | Query Firestore |
| **Weekly active pairs** | > 30% de parejas ambos activos/semana | Query: ambos miembros de lista con actividad en 7 dias |
| Crash-free rate | > 99% | Firebase Crashlytics |
| Skip-to-login conversion | > 25% de usuarios skip hacen login | Analytics: skip → eventual login |

## 9. Timeline & Milestones

### Milestone 1: Fundacion
- Setup proyecto Expo + TypeScript
- Configurar Firebase (Auth, Firestore con persistence, Storage)
- Configurar Firebase Analytics + eventos basicos:
  - `restaurant_saved` (con property `time_taken_seconds`)
  - `first_save_completed`
  - `list_shared`
  - `app_opened`
  - `skip_login` / `login_completed`
- Navegacion base (Tab Navigator + Stack)
- Pantalla Auth (Login/Register + opcion Skip)
- Migracion datos locales a Firestore al hacer login (con modal de confirmacion)

### Milestone 2: Core - Guardar
- Pantalla Guardar restaurante (1 pantalla, 2 taps minimo)
- Auto-deteccion ubicacion + busqueda Google Places Autocomplete
- Fallback a input manual si se excede cuota Maps API
- Rating (estrellas) + toggle visited/pendiente
- Foto (camara/galeria) con compresion via `expo-image-manipulator` (800px, quality 0.7)
- Nota de texto opcional
- Guardar en Firestore + Storage

### Milestone 3: Core - Ver
- Pantalla Home con mapa y pins (diferente color para visitado/pendiente)
- Pantalla Lista con cards + busqueda texto local + filtro visitado/pendiente
- Pantalla Detalle restaurante
- Boton "Como llegar" (deep link a Google Maps/Apple Maps)

### Milestone 4: Compartir
- UNA lista compartida por pareja (modelo simplificado)
- Generar/usar codigo de invitacion (6 chars uppercase)
- Sync en tiempo real via `onSnapshot` listeners
- Pantalla Perfil con gestion de lista compartida

### Milestone 5: Polish
- Verificar offline funciona (Firestore persistence ya habilitado desde M1)
- Animaciones y transiciones
- Manejo de errores y estados vacios
- Accesibilidad basica
- Testing de componentes criticos
- **Monitoreo Free Tier:**
  - Dashboard simple que trackee:
    - Firestore reads/writes diarios (alerta al 80% del limite)
    - Storage usage total
    - Places API calls/mes
  - Plan B si se excede:
    - Places API: Fallback a input manual (ya implementado en M2)
    - Firestore: Implementar debounce en busqueda y throttling en queries
    - Storage: Reducir calidad compresion a 0.6 si storage > 4GB

### Limites Free Tier (verificacion)
- **Firebase Auth**: 10K usuarios/mes gratis -- suficiente para MVP
- **Firestore**: 50K reads, 20K writes/dia -- suficiente para ~100 usuarios activos
- **Firebase Storage**: 5GB total, 1GB/dia descarga -- con compresion ~25K fotos caben
- **Google Places Autocomplete**: ~5,000 sesiones/mes gratis -- fallback manual si se excede
