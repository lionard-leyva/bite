# language: es
Característica: Guardar un restaurante en el sitio correcto
  Para que cada restaurante aparezca en el mapa donde está de verdad
  Bite lo busca cerca de Ana, rellena solo nombre, dirección y sitio, y nunca adivina la ubicación

  # SaveScreen real; el buscador de sitios (placesService), el mapa y el guardado se simulan. Ana está en Madrid.
  # No se comprueba la API de Google (eso es del servidor), solo lo que hace Bite con lo que le devuelve.

  @ADD-05
  Escenario: Con menos de 3 letras no se busca
    Dado que Ana está en Madrid y abre la pantalla de guardar un restaurante
    Cuando escribe "Lo" en el buscador
    Entonces no se busca ningún sitio

  @ADD-05
  Escenario: Desde 3 letras se buscan sitios cerca de Ana
    Dado que Ana está en Madrid y abre la pantalla de guardar un restaurante
    Cuando escribe "Los horiz" en el buscador
    Entonces se buscan sitios que coinciden con "Los horiz" cerca de Madrid
    Y ve la sugerencia "Los Horizontes" con su dirección y a qué distancia está

  @ADD-06
  Escenario: Elegir una sugerencia rellena nombre, dirección y sitio en el mapa
    Dado que Ana está en Madrid y abre la pantalla de guardar un restaurante
    Y ha buscado "Los horiz"
    Cuando elige la sugerencia "Los Horizontes"
    Entonces ve "Los Horizontes" en "Av. de Felipe II 12, Madrid" con su pin en el mapa
    Y al valorarlo con 4 estrellas y guardar, se guarda en las coordenadas del sitio elegido

  @ADD-07
  Escenario: A mano y sin ubicación no se puede guardar
    Dado que Ana está en Madrid y abre la pantalla de guardar un restaurante
    Cuando elige añadirlo a mano
    Y escribe el nombre "Casa Lu" y lo valora con 4 estrellas
    Entonces no puede guardar y ve "Marca dónde está para poder guardar"
    Y Bite no se inventa la ubicación a partir del nombre

  @ADD-08
  Escenario: A mano, una dirección sugerida pone el pin exacto
    Dado que Ana está en Madrid y abre la pantalla de guardar un restaurante
    Y elige añadirlo a mano con el nombre "Casa Lu" y 4 estrellas
    Cuando escribe "Felipe II 12" en la dirección y elige "Av. de Felipe II 12"
    Entonces ve el pin en el mapa
    Y al guardar, se guarda en las coordenadas de esa dirección

  @ADD-08
  Escenario: A mano, con "Usar mi ubicación" se guarda donde está Ana
    Dado que Ana está en Madrid y abre la pantalla de guardar un restaurante
    Y elige añadirlo a mano con el nombre "Casa Lu" y 4 estrellas
    Cuando pulsa "Usar mi ubicación"
    Entonces al guardar, se guarda donde está Ana

  @ADD-08
  Escenario: A mano, se marca en el mapa y se ajusta arrastrando el pin
    Dado que Ana está en Madrid y abre la pantalla de guardar un restaurante
    Y elige añadirlo a mano con el nombre "Casa Lu" y 4 estrellas
    Cuando pulsa "Marcar en el mapa" y arrastra el pin a otro punto
    Entonces al guardar, se guarda en el punto donde dejó el pin

  @ADD-09
  Escenario: Un sitio a más de 150 km pide confirmación y no se guarda sin ella
    Dado que Ana está en Madrid y abre la pantalla de guardar un restaurante
    Y elige un sitio de Tokio en el buscador y lo valora con 4 estrellas
    Cuando pulsa Guardar
    Entonces ve "Este sitio está en Tokio, a 10.764 km de ti"
    Y si pulsa "Cambiar ubicación" no se guarda nada

  @ADD-09
  Escenario: Si Ana confirma el sitio lejano, se guarda
    Dado que Ana está en Madrid y abre la pantalla de guardar un restaurante
    Y elige un sitio de Tokio en el buscador y lo valora con 4 estrellas
    Cuando pulsa Guardar y confirma "Sí, está en Tokio"
    Entonces se guarda en Tokio

  @ADD-09
  Escenario: Un sitio cercano se guarda sin preguntar
    Dado que Ana está en Madrid y abre la pantalla de guardar un restaurante
    Y ha elegido "Los Horizontes" y lo ha valorado con 4 estrellas
    Cuando pulsa Guardar
    Entonces se guarda sin preguntar nada

  @ADD-10
  Escenario: Un sitio nuevo empieza como Pendiente y el precio se elige con cinco opciones
    Dado que Ana está en Madrid y abre la pantalla de guardar un restaurante
    Cuando elige añadirlo a mano
    Entonces el estado elegido es "Pendiente"
    Y el precio se elige entre "€", "€€", "€€€", "€€€€" y "€€€€€"

  @ADD-10
  Escenario: El precio elegido es el que se guarda
    Dado que Ana está en Madrid y abre la pantalla de guardar un restaurante
    Y ha elegido "Los Horizontes" y lo ha valorado con 4 estrellas
    Cuando elige el precio "€€€" y guarda
    Entonces se guarda Pendiente con 35 € por persona

  @ADD-11
  Escenario: El móvil no lleva ninguna clave de Google para buscar sitios
    Dado el código de la app
    Entonces ninguna pantalla lee la clave de Google ni usa el buscador de Google en el móvil
