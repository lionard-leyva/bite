# language: es
Característica: Bite espera a sus fuentes antes de dibujarse
  Para que los títulos no parpadeen con otra letra al abrir la app
  La app muestra su contenido cuando las fuentes están cargadas, y si no cargan sigue con la del sistema

  # FontGate real con expo-font simulado. Cómo se ven Young Serif y Figtree se revisa en el emulador.

  @UI-10
  Esquema del escenario: La app se dibuja según el estado de las fuentes
    Dado que las fuentes están <estado>
    Cuando Ana abre Bite
    Entonces <resultado>

    Ejemplos:
      | estado        | resultado                      |
      | cargando      | no se dibuja todavía el contenido |
      | cargadas      | se dibuja el contenido         |
      | con un fallo  | se dibuja el contenido con la fuente del sistema |

  @UI-11
  Escenario: Los títulos grandes usan la fuente de títulos
    Dado todos los archivos de interfaz de Bite
    Cuando se buscan títulos grandes sin la fuente de títulos
    Entonces no hay ninguno
