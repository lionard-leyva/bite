# language: es
Característica: El Mapa y la Lista se ven como el diseño Terracota elegido
  Para que Ana vea en su móvil el diseño que eligió (A · Terracota)
  El Mapa lleva solo el buscador, los filtros y los botones de guardar y de ubicación, y la Lista abre con el título,
  la decisión de la cena y tarjetas con foto

  # HomeScreen y ListScreen reales con los restaurantes y la lista simulados. El mapa nativo se sustituye por una vista.
  # Cómo se ve de verdad se revisa en el móvil; aquí se comprueba qué hay y en qué orden.

  @UI-12
  Escenario: El mapa solo lleva el buscador, los filtros, guardar y mi ubicación
    Dado que Ana usa Bite sin cuenta con "Casa Lucio" pendiente guardado
    Cuando abre el mapa
    Entonces ve el buscador "Buscar en esta zona" y los filtros "Todos", "Pendientes" y "Visitados" en ese orden
    Y puede guardar un restaurante y volver a su ubicación
    Y no hay botón de perfil, de expandir el mapa ni la tarjeta de "¿Dónde cenamos hoy?"

  @UI-12
  Escenario: El filtro elegido va en tinta, no en terracota
    Dado que Ana usa Bite sin cuenta con "Casa Lucio" pendiente guardado
    Cuando abre el mapa
    Entonces el filtro "Todos" va en tinta y los demás en blanco

  @UI-12
  Escenario: Con pareja, el buscador enseña a los dos
    Dado que Ana y Bea comparten la lista con "Casa Lucio" y "Gyoza Bar" pendientes y "Sobrino de Botín" visitado
    Cuando Ana abre el mapa
    Entonces el buscador enseña las iniciales "A" y "B"

  @UI-13
  Escenario: Sin pareja, la lista es tuya
    Dado que Ana usa Bite sin cuenta con "Casa Lucio" pendiente guardado
    Cuando abre la lista
    Entonces el título es "Tu lista"

  @UI-13
  Escenario: Con pareja, la lista es vuestra y abre con la decisión de la cena
    Dado que Ana y Bea comparten la lista con "Casa Lucio" y "Gyoza Bar" pendientes y "Sobrino de Botín" visitado
    Cuando Ana abre la lista
    Entonces el título es "Vuestra lista"
    Y arriba está "¿Dónde cenamos hoy?" con "2 pendientes · votad sin ver lo del otro"
    Y la tarjeta de "Sobrino de Botín" dice "Visitado", "★ 4 · €€ · Calle Mayor 1, Madrid" y "Guardado por Bea"

  @UI-13
  Escenario: Buscar algo que no está no cierra el teclado
    Dado que Ana usa Bite sin cuenta con "Casa Lucio" pendiente guardado
    Cuando abre la lista y busca "zzz"
    Entonces ve "Sin resultados"
    Y sigue escribiendo en el mismo buscador, sin que se cierre el teclado
