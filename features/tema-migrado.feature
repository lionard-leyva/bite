# language: es
Característica: Las pantallas migradas usan solo colores del tema
  Para que el tema oscuro y cualquier cambio de paleta lleguen a toda la pantalla
  Un componente migrado no lleva colores sueltos: los toma del tema

  # Regla estática sobre el código de los archivos ya migrados (el listado crece con cada pantalla). Que el color se
  # vea bien se revisa en el emulador.

  @UI-05
  Escenario: Los archivos migrados no llevan colores sueltos
    Dado los archivos de interfaz ya migrados al tema
    Cuando se buscan colores escritos a mano en su código
    Entonces no hay ninguno
