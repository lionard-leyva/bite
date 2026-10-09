# language: es
Característica: El mapa usa los colores del tema activo
  Para que el mapa se vea como el resto de Bite, claro u oscuro
  El estilo del mapa sale de la paleta y no de colores propios

  # Estilo de Google Maps construido por src/theme/mapStyle. Cómo se ve sobre el mapa real se revisa en el emulador.

  @UI-06
  Escenario: El estilo del mapa solo usa colores de la paleta del tema
    Dado el tema "<tema>" de Bite
    Cuando se construye el estilo del mapa
    Entonces el terreno del mapa es el fondo de la app
    Y todos los colores del estilo son colores de la paleta de ese tema
    Y el agua y los parques tienen su propio color

    Ejemplos:
      | tema   |
      | claro  |
      | oscuro |
