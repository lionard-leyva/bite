# language: es
Característica: El color de Bite se lee bien y cambia con el tema
  Para que la app se vea cuidada y se pueda leer de día y de noche
  Todos los colores salen de una sola paleta con versión clara y oscura

  # La paleta (src/theme/palette.js) es la única fuente de colores. Tailwind los pide como variables y el tema activo
  # las entrega. El contraste se mide de verdad (WCAG 2.x): 4,5 a 1 para texto y 3 a 1 para elementos gráficos.
  # Cómo se ve en una pantalla concreta no se puede comprobar aquí: se revisa en el emulador.

  @UI-01
  Escenario: En el tema claro todos los textos cumplen el contraste mínimo
    Dado la paleta de Bite en el tema "claro"
    Cuando se mide el contraste de cada texto con el fondo que lo lleva
    Entonces ningún texto baja de 4,5 a 1

  @UI-01
  Escenario: En el tema oscuro todos los textos cumplen el contraste mínimo
    Dado la paleta de Bite en el tema "oscuro"
    Cuando se mide el contraste de cada texto con el fondo que lo lleva
    Entonces ningún texto baja de 4,5 a 1

  @UI-01
  Escenario: Los colores gráficos se distinguen del fondo
    Dado la paleta de Bite en el tema "claro"
    Cuando se mide el contraste de las estrellas con la tarjeta
    Entonces las estrellas no bajan de 3 a 1

  @UI-02
  Escenario: Cada color existe en el tema claro y en el oscuro
    Dado la paleta de Bite
    Cuando se comparan los colores del tema claro y del oscuro
    Entonces los dos temas tienen exactamente los mismos colores

  @UI-02
  Escenario: Los dos temas no son un simple invertido
    Dado la paleta de Bite
    Cuando se comparan el fondo y la marca de los dos temas
    Entonces el fondo oscuro es oscuro y el claro es claro
    Y la marca es distinta en cada tema para seguir cumpliendo el contraste

  @UI-03
  Escenario: Las clases de color de Tailwind leen las variables del tema
    Dado el Tailwind real de Bite
    Cuando se compila la clase "bg-background"
    Entonces el color sale de la variable "--color-background"

  @UI-03
  Escenario: Los colores aceptan transparencia
    Dado el Tailwind real de Bite
    Cuando se compila la clase "bg-primary/10"
    Entonces el color sale de la variable "--color-primary" con un 10 % de opacidad
