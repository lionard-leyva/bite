# Estrategia de cobertura: qué se prueba, cómo y cuándo

Una página. Detalle de cada caso en `e2e-plan.md`; reglas de Gherkin en `CLAUDE.md` §10.

## Las tres formas de comprobar

| Forma | Quién la ejecuta | Cuándo | Tarda | Para qué |
|---|---|---|---|---|
| **1. Robot rápido** (Jest y Gherkin) | `ci.yml` | en cada PR | ~3 min | reglas internas y servicios, sin móvil |
| **2. Robot lento** (scripts `adb` en un móvil virtual) | `qa-e2e.yml` | de noche y a mano | 35–55 min | tocar pantallas, permisos, gestos |
| **3. Manual** (móviles reales) | una persona | antes de publicar una versión | ~10 min | lo que un robot no puede comprobar |

## Qué casos van a cada forma

| Forma | Casos | Estado |
|---|---|---|
| 1. Robot rápido | `MAP-05` sin proxy, `ADD-04` fotos (parcial), `ADD-03` Places sin red, `DET-03` id inexistente, `KBD-03` regla de campos, `PRF-03` migración, `MCH-05` acceso, `MCH-06` pantalla, `LOC-02` (lógica), `VIS-03` visitado, `SHL-04` sincronía, `SHL-01..03`, `MCH-01..04`, `SHR-01/02/04`, `EMU-*`, `RUL-*` | hecho |
| 2. Robot lento | `LOC-02` (P0, `qa:location --deny`, validado en CI), `ADD-01/02`, `SHR-03`, `VIS-01/02`, `DET-01/02`, `SRC-01/02`, `KBD-02`, `SAF-01` | hecho |
| 2. Robot lento | `LOC-04`, `MAP-02`, `MAP-04`, `MAP-06`, `PRF-01`, `PRF-02`, `SAF-02` | pendiente |
| 2. Robot lento | `MAP-01`, `MAP-03`, `LOC-01` | omitidos: los marcadores del mapa no salen en el árbol de accesibilidad sin `title` |
| 3. Manual | `SHL-05`, `EMU-08` (dos móviles reales), `EMU-09` (reglas en consola), `LOC-01` (centrado), `SHR-05` (red) | lista de comprobación |

## Orden por riesgo

1. `PRF-03` migración (perder los datos del usuario es lo peor): hecho en `migracion.feature`.
2. `LOC-02` permiso de ubicación denegado (P0) y `MCH-06`: hechos (`LOC-02` en el móvil virtual validado en el E2E de CI, ejecución 17).
3. Resto de Jest pendientes: `MAP-05`, `ADD-04`, `ADD-03`, `DET-03` y `KBD-03` hechos: no queda ningún caso de Jest pendiente.
4. Scripts `adb` pendientes.
5. Lista manual antes de cada versión.

## Reglas

- Un comportamiento nuevo se describe primero en un `.feature` o en una fila del plan; `featureLinks.test.ts` falla si una etiqueta `@ID` no está enlazada.
- Un caso no se da por cubierto hasta que una mutación a propósito rompe su test.
- Hay límites conocidos: el E2E nocturno no avisa a nadie si falla y `master` no se puede proteger en este plan de GitHub; por eso la regla de equipo es no mergear con `ci.yml` en rojo.
