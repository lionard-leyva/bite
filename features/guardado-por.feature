# language: es
Característica: En una lista compartida se ve quién guardó cada sitio
  Para que la pareja sepa de quién fue la idea
  El detalle y la tarjeta dicen "Guardado por Ana"; en una lista personal no se dice nada

  # Etiqueta calculada por utils/savedBy y mostrada por el Detalle real, con los miembros de la lista simulados.

  @SAV-01
  Esquema del escenario: La etiqueta depende de quién guardó y de cuántos miembros hay
    Dado una lista con <miembros>
    Cuando el sitio lo guardó <autor> y lo mira Ana
    Entonces la etiqueta es "<etiqueta>"

    Ejemplos:
      | miembros                                  | autor   | etiqueta               |
      | Ana y Bea                                 | Bea     | Guardado por Bea       |
      | Ana y Bea                                 | Ana     | Guardado por ti        |
      | solo Ana                                  | Ana     |                        |
      | Ana y bea@correo.com sin nombre           | bea@correo.com | Guardado por bea |
      | Ana y Bea                                 | alguien desconocido |           |

  @SAV-02
  Escenario: El detalle muestra quién guardó el sitio
    Dado que Ana y Bea comparten la lista y Bea guardó "Casa Lucio"
    Cuando Ana abre el detalle de "Casa Lucio"
    Entonces ve "Guardado por Bea"

  @SAV-03
  Esquema del escenario: La tarjeta de la lista añade el autor solo cuando es otra persona
    Dado una tarjeta de restaurante guardada <cuando> <autor>
    Cuando Ana mira la lista
    Entonces la tarjeta dice "<texto>"

    Ejemplos:
      | cuando       | autor           | texto                  |
      | justo ahora  | por Bea         | Bea · Justo ahora      |
      | justo ahora  | por Ana misma   | Justo ahora            |
      | justo ahora  | sin autor conocido | Justo ahora         |
