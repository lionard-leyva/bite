# language: es
Característica: Bite se puede ver en Expo Go desde el móvil
  Para enseñar la última versión sin tener un PC delante
  La app publica vistas previas en el proyecto de Expo y las builds propias no las descargan solas

  # Solo la configuración de la app. Que el enlace abra la vista previa en Expo Go se comprueba abriéndolo en el iPhone.

  @PRE-01
  Escenario: La configuración apunta las vistas previas al proyecto de Expo
    Dado la configuración de la app Bite
    Cuando se leen sus actualizaciones
    Entonces apuntan al proyecto de Expo de Bite
    Y comparten versión de ejecución con la versión de la app
    Y las builds propias no las descargan solas
