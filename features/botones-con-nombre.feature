# language: es
Característica: Los botones de solo icono tienen nombre
  Para que TalkBack anuncie qué hace cada botón y no "botón sin nombre"
  Todo botón que solo lleva un icono declara su etiqueta de accesibilidad

  # Regla estática sobre el código de la interfaz. Que el lector de pantalla lo anuncie bien se revisa con TalkBack.

  @UI-08
  Escenario: Ningún botón de solo icono se queda sin etiqueta
    Dado todos los archivos de interfaz de Bite
    Cuando se buscan botones que solo llevan un icono y no tienen etiqueta
    Entonces no hay ninguno
