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
    Y Bite sabe que el motivo es el permiso

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
    Y Bite sabe que el motivo es que no se pudo localizar, no el permiso

  @LOC-02
  Escenario: Con permiso pero sin señal, el motivo es otro
    Dado que Ana ha concedido el permiso pero no hay señal GPS
    Cuando Bite intenta localizarla
    Entonces no se calcula ninguna posición y queda el estado "No se pudo obtener la ubicacion"
    Y Bite sabe que el motivo es que no se pudo localizar, no el permiso

  @LOC-02
  Escenario: Sin permiso, el aviso explica qué hacer y ofrece abrir Ajustes
    Dado que Ana ha denegado el permiso de ubicación
    Cuando Ana pulsa "Ir a mi ubicación" y Bite no puede localizarla
    Entonces ve el aviso "Bite necesita tu ubicación para centrar el mapa. Actívala en Ajustes."
    Y al tocar "Abrir Ajustes" se abren los Ajustes del sistema

  @LOC-02
  Escenario: Sin señal, el aviso es distinto y no manda a Ajustes
    Dado que Ana ha concedido el permiso pero no hay señal GPS
    Cuando Ana pulsa "Ir a mi ubicación" y Bite no puede localizarla
    Entonces ve el aviso "No encontramos tu posición. Inténtalo de nuevo."
    Y el aviso no ofrece abrir los Ajustes

  @LOC-02
  Escenario: El aviso no molesta hasta que Ana pulsa el botón
    Dado que Ana ha denegado el permiso de ubicación
    Cuando Bite intenta localizarla sin que Ana haya pulsado el botón
    Entonces no se muestra ningún aviso

  @LOC-02
  Escenario: El aviso se puede cerrar
    Dado que Ana ha denegado el permiso de ubicación
    Cuando Ana pulsa "Ir a mi ubicación" y Bite no puede localizarla
    Y Ana cierra el aviso
    Entonces el aviso desaparece

  @LOC-02
  Escenario: Con el permiso denegado, el botón avisa de que la ubicación está desactivada
    Dado que Ana ha denegado el permiso de ubicación
    Cuando Bite intenta localizarla sin que Ana haya pulsado el botón
    Entonces el botón se ve atenuado y se anuncia como "Ubicacion desactivada, toca para activarla"
    Pero con el permiso concedido el botón se anuncia como "Ir a mi ubicacion" y se ve normal

