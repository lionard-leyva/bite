# language: es
Característica: El final del formulario de guardar no queda bajo la barra del sistema
  Para que Ana pueda pulsar el último campo aunque el teléfono tenga barra de gestos o de tres botones
  Al llegar al final del formulario hay un margen igual a la barra inferior del sistema

  # SaveScreen real con la barra inferior simulada (126 px). Que se vea bien con la barra real lo mide qa:safearea --nav3 (SAF-02).

  @SAF-03
  Escenario: Al desplazar hasta el final queda un margen mayor que la barra inferior
    Dado que el teléfono tiene una barra inferior de 126 píxeles
    Cuando Ana abre la pantalla de guardar un restaurante
    Entonces el final del formulario deja un margen de al menos 126 píxeles
