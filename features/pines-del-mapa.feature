# language: es
Característica: Los pines del mapa se entienden de un vistazo, como en el diseño Terracota
  Para saber a qué sitios ya fuimos sin abrir nada
  Cada pin es una píldora con su emoji: terracota si está pendiente, blanca con borde salvia y ✓ si ya fuimos;
  el pin elegido enseña el nombre

  # Marcador real renderizado (sin mapa). Cómo queda sobre el mapa se revisa en el móvil.

  @PIN-01
  Esquema del escenario: La píldora cuenta el estado
    Dado un restaurante <estado>
    Cuando se dibuja su pin en el mapa
    Entonces el pin muestra "<marca>" sobre fondo <fondo>
    Y no enseña el nombre

    Ejemplos:
      | estado    | marca | fondo                      |
      | pendiente | 🍽    | terracota                  |
      | visitado  | ✓     | blanco con borde salvia    |

  @PIN-02
  Escenario: El pin elegido enseña el nombre
    Dado un restaurante pendiente llamado "Casa Lucio"
    Cuando se dibuja su pin elegido en el mapa
    Entonces el pin muestra "Casa Lucio" junto a "🍽"
