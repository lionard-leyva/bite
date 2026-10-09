# language: es
Característica: El mapa se abre con los sitios guardados en el móvil
  Para que Ana pueda usar Bite sin cuenta desde el primer día
  Los restaurantes guardados en el teléfono se cargan en el mapa sin errores, aunque Bite aún no sepa dónde está

  # HomeScreen y useRestaurants reales leyendo del almacenamiento local (AsyncStorage simulado con los datos tal como se guardan,
  # fechas en texto). El mapa nativo se sustituye por una vista. Reproduce el cierre de la vista previa del 9 de octubre.

  @MAP-09
  Escenario: Abrir el mapa sin cuenta con sitios guardados y sin ubicación
    Dado que Ana usa Bite sin cuenta y tiene guardados "Casa Lucio" y "Sobrino de Botín" en el móvil
    Y que Bite todavía no sabe dónde está
    Cuando abre el mapa
    Entonces ve el mapa con sus sitios y sin errores
