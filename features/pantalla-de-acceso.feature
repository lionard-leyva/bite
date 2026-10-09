# language: es
Característica: La pantalla de acceso respeta la barra de estado del teléfono
  Para que el logo de Bite no quede tapado por la hora, la cobertura o la isla dinámica
  El contenido empieza por debajo de la barra superior del sistema

  # AuthScreen real con la barra superior simulada (59 px, un iPhone con isla dinámica). Que se vea bien lo confirma el móvil.

  @SAF-04
  Escenario: El logo empieza por debajo de la barra de estado
    Dado que el teléfono tiene una barra superior de 59 píxeles
    Cuando Ana abre la pantalla de acceso
    Entonces el contenido deja un margen superior de al menos 59 píxeles
