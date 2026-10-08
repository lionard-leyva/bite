# language: es
Característica: Distancia y tiempo al tocar un sitio del mapa
  Para saber cuánto cuesta llegar
  Ana toca un restaurante y ve la distancia, y el tiempo en coche si el servidor de rutas responde

  # Se define qué texto sale (hook useNavigationETA con navigationService real, solo `fetch` simulado). Cómo se pinta en
  # MapDetailCard es de UI. La distancia es en línea recta; el tiempo lo calcula el servidor de rutas (proxy).

  Antecedentes:
    Dado que Ana está en Madrid y "Casa Lucio" queda a 1,1 km en línea recta

  @MAP-05
  Escenario: Con el servidor de rutas funcionando, Ana ve distancia y tiempo
    Dado que el servidor de rutas responde que son 8 minutos
    Cuando Ana toca "Casa Lucio" en el mapa
    Entonces ve "1.1km · 8 min"

  @MAP-05
  Escenario: Con el servidor de rutas caído, Ana sigue viendo la distancia
    Dado que el servidor de rutas está caído
    Cuando Ana toca "Casa Lucio" en el mapa
    Entonces ve "1.1km" sin tiempo y no se queda cargando

  @MAP-05
  Escenario: Si el servidor de rutas da error, tampoco se rompe
    Dado que el servidor de rutas responde con un error
    Cuando Ana toca "Casa Lucio" en el mapa
    Entonces ve "1.1km" sin tiempo y no se queda cargando

  @MAP-05
  Escenario: Si el servidor de rutas no contesta, se rinde pasado el tiempo máximo
    Dado que el servidor de rutas no contesta
    Cuando Ana toca "Casa Lucio" en el mapa
    Entonces mientras espera ve la distancia y se indica que está cargando el tiempo
    Y pasados 10 segundos ve "1.1km" sin tiempo y no se queda cargando

  @MAP-05
  Escenario: Un fallo no se recuerda: al recuperarse el servidor, Ana ve el tiempo
    Dado que el servidor de rutas está caído
    Cuando Ana toca "Casa Lucio" en el mapa
    Y el servidor de rutas se recupera y responde que son 8 minutos
    Y Ana toca otro sitio y vuelve a "Casa Lucio"
    Entonces ve "1.1km · 8 min"

  @MAP-05
  Escenario: Si Ana cambia de sitio antes de que responda, no se mezclan los tiempos
    Dado que el servidor de rutas tarda en contestar
    Cuando Ana toca "Casa Lucio" y enseguida toca "Taco"
    Y el servidor contesta primero lo de "Taco" con 5 minutos y después lo de "Casa Lucio" con 20
    Entonces Ana ve "1.1km · 5 min"

  @MAP-05
  Escenario: Al cambiar de sitio, mientras llega el tiempo nuevo no se ve el del anterior
    Dado que el servidor de rutas responde que son 8 minutos
    Cuando Ana toca "Casa Lucio" en el mapa
    Y el servidor de rutas pasa a tardar en contestar
    Y Ana toca "Taco"
    Entonces mientras llega el tiempo de "Taco" ve "1.1km" sin el tiempo del sitio anterior

  @MAP-05
  Escenario: Si el servidor falla en el segundo sitio, no se arrastra el tiempo del primero
    Dado que el servidor de rutas responde que son 8 minutos
    Cuando Ana toca "Casa Lucio" en el mapa
    Y el servidor de rutas se cae
    Y Ana toca "Taco"
    Entonces ve "1.1km" sin tiempo y no se queda cargando

  @MAP-05
  Escenario: Sin la ubicación de Ana no hay distancia ni se pregunta al servidor
    Dado que Bite no sabe dónde está Ana
    Cuando Ana toca "Casa Lucio" en el mapa
    Entonces no ve distancia y no se pregunta al servidor de rutas
