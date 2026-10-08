# language: es
Característica: Marcar un sitio como visitado o pendiente
  Para recordar adónde hemos ido ya y adónde queremos ir
  Ana, con cuenta, cambia el estado de un restaurante de su lista

  # Aquí se define el efecto en los datos (Firestore). Los botones y el aspecto del estado en Detalle son de UI.

  Antecedentes:
    Dado que la lista de Ana tiene "Casa Lucio" pendiente y "Taco" visitado

  @VIS-03
  Escenario: Ana marca como visitado un sitio pendiente
    Cuando Ana marca "Casa Lucio" como visitado
    Entonces "Casa Lucio" figura como visitado

  @VIS-03
  Escenario: Ana devuelve a pendiente un sitio visitado
    Cuando Ana marca "Taco" como pendiente
    Entonces "Taco" figura como pendiente

  @VIS-03
  Escenario: Cambiar el estado no toca nada más
    Cuando Ana marca "Casa Lucio" como visitado
    Entonces el nombre, la dirección, la nota, la valoración y la lista de "Casa Lucio" siguen igual
    Y "Taco" no ha cambiado

  @VIS-03
  Escenario: Queda anotado cuándo cambió el estado
    Cuando Ana marca "Casa Lucio" como visitado
    Entonces la fecha de modificación de "Casa Lucio" es posterior a la anterior
