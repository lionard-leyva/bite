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
