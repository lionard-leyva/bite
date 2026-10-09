# language: es
Característica: Los pines del mapa se entienden de un vistazo
  Para saber a qué sitios ya fuimos y cuáles nos gustan sin abrir nada
  Cada pin es una píldora con un emoji de estado y las estrellas; el pin elegido enseña el nombre

  # Marcador real renderizado (sin mapa). Cómo queda sobre el mapa se revisa en el emulador.

  @PIN-01
  Esquema del escenario: La píldora cuenta el estado y la valoración
    Dado un restaurante <estado> con <estrellas> estrellas
    Cuando se dibuja su pin en el mapa
    Entonces el pin muestra "<emoji>" y "<estrellas>"
    Y no enseña el nombre

    Ejemplos:
      | estado    | estrellas | emoji |
      | pendiente | 4         | 🍽    |
      | visitado  | 5         | ✅    |
      | pendiente | 0         | 🍽    |

  @PIN-02
  Escenario: El pin elegido enseña el nombre
    Dado un restaurante pendiente llamado "Casa Lucio" con 4 estrellas
    Cuando se dibuja su pin elegido en el mapa
    Entonces el pin muestra "Casa Lucio"
