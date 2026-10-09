# language: es
Característica: El mapa se abre donde están tus sitios y te enseña el que acabas de guardar
  Para que Ana vea sus restaurantes sin buscarlos por el mundo
  Un sitio guardado en otro continente no aleja el mapa, y al guardar uno nuevo el mapa lo enfoca

  # Reglas de encuadre en utils/mapFocus. Cómo se mueve el mapa de verdad se ve en el móvil.

  @MAP-07
  Escenario: Los sitios lejanos no alejan el mapa de donde estás
    Dado que Ana está en Madrid
    Y que tiene guardados "Casa Lucio" y "Sobrino de Botín" en Madrid y "Sushi Tokio" en Tokio guardado hace un minuto
    Cuando Bite elige qué encuadrar en el mapa
    Entonces encuadra "Casa Lucio" y "Sobrino de Botín"
    Y no encuadra "Sushi Tokio"

  @MAP-07
  Escenario: Cerca es una escapada de unas decenas de kilómetros, no otra ciudad lejana
    Dado que Ana está en Madrid
    Y que tiene guardados "Casa Lucio" en Madrid, "Mesón de Alcalá" a 30 km y "Tapas Barcelona" a 500 km
    Cuando Bite elige qué encuadrar en el mapa
    Entonces encuadra "Casa Lucio" y "Mesón de Alcalá"
    Y no encuadra "Tapas Barcelona"

  @MAP-07
  Escenario: Sin ubicación, el mapa se centra en la zona del último sitio guardado
    Dado que Bite no sabe dónde está Ana
    Y que tiene guardados "Sushi Tokio" hace una semana y "Casa Lucio" y "Sobrino de Botín" en Madrid ayer
    Cuando Bite elige qué encuadrar en el mapa
    Entonces encuadra "Casa Lucio" y "Sobrino de Botín"
    Y no encuadra "Sushi Tokio"

  @MAP-07
  Escenario: Si todo queda lejos de ti, se ven todos
    Dado que Ana está en Madrid
    Y que tiene guardados "Sushi Tokio" y "Ramen Shibuya" en Tokio
    Cuando Bite elige qué encuadrar en el mapa
    Entonces encuadra "Sushi Tokio" y "Ramen Shibuya"

  @MAP-08
  Escenario: Un restaurante recién guardado se enfoca aunque esté lejos
    Dado que el mapa de Ana ya conocía "Casa Lucio"
    Cuando Ana guarda "Sushi Tokio" y vuelve al mapa
    Entonces el mapa se enfoca en "Sushi Tokio"

  @MAP-08
  Escenario: Al abrir el mapa por primera vez ningún sitio cuenta como nuevo
    Dado que el mapa de Ana todavía no conocía ningún restaurante
    Cuando le llegan "Casa Lucio" y "Sobrino de Botín"
    Entonces el mapa no se enfoca en ninguno por ser nuevo

  @MAP-08
  Escenario: Si aparecen dos a la vez se enfoca el último guardado
    Dado que el mapa de Ana ya conocía "Casa Lucio"
    Cuando le llegan "Sobrino de Botín" guardado hace una hora y "Sushi Tokio" guardado hace un minuto
    Entonces el mapa se enfoca en "Sushi Tokio"

  @MAP-08
  Escenario: Si no hay restaurantes nuevos el mapa no se mueve
    Dado que el mapa de Ana ya conocía "Casa Lucio"
    Cuando vuelve a leer la misma lista
    Entonces el mapa no se enfoca en ninguno por ser nuevo
