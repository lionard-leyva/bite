# language: es
Característica: Bite aguanta los datos reales más incómodos
  Para que nombres con emoji, tildes, notas largas o valores raros no rompan nada
  Cada caso extremo que se encontró revisando la interfaz con datos difíciles tiene su regla

  # Se usan los componentes reales con datos extremos. Cómo se ve en pantalla se revisa en el emulador.

  @EDG-01
  Esquema del escenario: La inicial del marcador respeta emoji, mayúsculas y espacios
    Dado un restaurante que se llama "<nombre>"
    Cuando Bite calcula la inicial de su marcador
    Entonces la inicial es "<inicial>"

    Ejemplos:
      | nombre         | inicial |
      | 🍣 Sushi Zen   | 🍣      |
      |   casa lucio   | C       |
      | Ñandú          | Ñ       |
      |                | B       |

  @EDG-02
  Esquema del escenario: La búsqueda ignora tildes y mayúsculas
    Dado un restaurante en "<dirección>" que se llama "<nombre>"
    Cuando Ana busca "<búsqueda>"
    Entonces <resultado> aparece

    Ejemplos:
      | nombre               | dirección      | búsqueda  | resultado   |
      | Café Comercial       | Glorieta 1     | cafe      | el sitio    |
      | Cafe Comercial       | Glorieta 1     | CAFÉ      | el sitio    |
      | Taberna Los Cañizares | Calle Mayor 3 | cañizares | el sitio    |
      | Café Comercial       | Glorieta 1     | pizza     | ningún sitio |
      | Casa Lucio           | Cava Baja 35   | baja      | el sitio    |

  @EDG-03
  Escenario: En el detalle la nota se lee entera
    Dado un restaurante con una nota de 200 caracteres
    Cuando Ana abre su detalle
    Entonces la nota no se recorta

  @EDG-04
  Esquema del escenario: Las etiquetas hablan en singular cuando hay uno
    Dado <situación>
    Cuando un lector de pantalla lee el elemento
    Entonces oye "<etiqueta>"

    Ejemplos:
      | situación                                    | etiqueta                                   |
      | un restaurante pendiente con 1 estrella      | Casa Lucio, 1 estrella, pendiente          |
      | un restaurante pendiente con 4 estrellas     | Casa Lucio, 4 estrellas, pendiente         |
      | 1 restaurante pendiente en la tarjeta de hoy | ¿Dónde cenamos hoy? 1 pendiente            |
      | 5 restaurantes pendientes en la tarjeta de hoy | ¿Dónde cenamos hoy? 5 pendientes         |

  @EDG-05
  Esquema del escenario: La tarjeta del mapa no se rompe con un rating fuera de rango
    Dado un restaurante guardado con rating <rating>
    Cuando Ana lo abre en la tarjeta del mapa
    Entonces ve <estrellas> estrellas

    Ejemplos:
      | rating | estrellas |
      | -1     | 0         |
      | 0      | 0         |
      | 3      | 3         |
      | 9      | 5         |

  @EDG-06
  Escenario: El formulario de guardar limita nombre y dirección
    Dado que Ana abre la pantalla de guardar a mano
    Entonces el nombre admite como máximo 120 caracteres
    Y la dirección admite como máximo 200 caracteres
