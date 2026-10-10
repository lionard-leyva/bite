# language: es
Característica: El formulario vuelve a su sitio al cerrar el teclado
  Para no perder de vista los primeros campos después de escribir
  Al abrir el teclado el formulario puede desplazarse para enseñar el final; al cerrarlo vuelve a donde estaba

  # KeyboardForm real con el teclado de Android simulado. Cómo se ve en pantalla lo miden qa:keyboard y qa:save.

  @KBD-04
  Escenario: Al cerrar el teclado el formulario recupera su posición anterior
    Dado que Ana tiene un formulario largo en Android, desplazado 120 píxeles
    Cuando el teclado se abre y el formulario se desplaza hacia el final
    Y el teclado se cierra
    Entonces el formulario vuelve a los 120 píxeles

  @KBD-02
  Escenario: En la pantalla de acceso, el teclado no tapa el campo que Ana escribe
    Dado que la pantalla de acceso tiene varios campos de texto
    Cuando Ana abre el teclado para escribir en cualquiera de ellos
    Entonces el formulario de acceso se ajusta al teclado
