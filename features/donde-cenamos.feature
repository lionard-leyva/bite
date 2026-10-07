# language: es
Característica: ¿Dónde cenamos hoy?
  Para decidir rápido adónde ir a cenar
  Ana y Bea votan a ciegas los sitios pendientes de su lista compartida

  Antecedentes:
    Dado que Ana y Bea comparten la lista "L1"

  @MCH-01
  Escenario: Solo los 10 pendientes más cercanos entran en la ronda, del más cercano al más lejano
    Dado que la lista tiene 12 restaurantes pendientes a distinta distancia de Ana y uno ya visitado muy cerca
    Cuando Ana abre la decisión desde su ubicación
    Entonces hay 10 candidatos
    Y los candidatos van del más cercano al más lejano
    Y el restaurante visitado no es candidato

  @MCH-02
  Escenario: Una vez marcado el match, una detección tardía no lo cambia
    Dado que Ana y Bea han abierto la decisión con los candidatos "r1" y "r2"
    Cuando los dos dan like a "r2"
    Y un cliente detecta el match
    Y los dos dan like también a "r1"
    Y el otro cliente detecta el match con retraso
    Entonces la ronda queda con match en "r2"

  @MCH-03
  Escenario: Si Ana y Bea abren la decisión a la vez, votan en la misma ronda
    Cuando Ana y Bea abren la decisión a la vez
    Entonces las dos están en la misma ronda
    Y la ronda tiene como participantes a Ana y a Bea

  @MCH-06
  Escenario: Los votos de una no se revelan a la otra mientras no haya match
    Dado que Ana y Bea han abierto la decisión con los candidatos "r1" y "r2"
    Cuando Bea da like a "r1" y Ana da like a "r2"
    Entonces no hay match
    Y la ronda sigue activa sin ningún voto en ella
    Cuando Ana da like también a "r1"
    Entonces el único dato que se revela es el match en "r1"
