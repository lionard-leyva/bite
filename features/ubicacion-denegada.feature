# language: es
Característica: Ubicación cuando Ana no da permiso
  Para que Bite no se rompa si no puede localizarme
  Ana toca "Ir a mi ubicación" con el permiso del sistema denegado o con un fallo al pedirlo

  # Aquí se define qué ocurre con la posición y el estado de error. Cómo se ve el aviso en el mapa y el centrado
  # (HomeScreen) son de UI; el comportamiento real en un móvil virtual lo comprueba qa:location --deny.

  @LOC-02
  Escenario: Con el permiso denegado no se calcula ninguna posición y Bite no se rompe
    Dado que Ana ha denegado el permiso de ubicación
    Cuando Bite intenta localizarla
    Entonces no se calcula ninguna posición y queda el estado "No se pudo obtener la ubicacion"
    Y Bite ni siquiera pide la posición al sistema

  @LOC-02
  Escenario: Si luego concede el permiso, al volver a pulsar se localiza
    Dado que Ana ha denegado el permiso de ubicación
    Y que Bite ya ha intentado localizarla
    Cuando Ana concede el permiso y vuelve a pulsar "Ir a mi ubicación"
    Entonces Bite la localiza en Madrid y desaparece el estado de error

  @LOC-02
  Escenario: Si el sistema falla al pedir el permiso, tampoco se rompe
    Dado que el sistema falla al pedir el permiso de ubicación
    Cuando Bite intenta localizarla
    Entonces no se calcula ninguna posición y queda el estado "No se pudo obtener la ubicacion"
    Y la petición termina sin lanzar ningún error sin capturar
