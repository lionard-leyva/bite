# language: es
Característica: Guardar un restaurante aunque el buscador de sitios no responda
  Para poder guardar un sitio sin red o sin cuota de Google
  Bite pasa a escribir el nombre a mano, lo explica sin tecnicismos y pone el pin donde está Ana para ajustarlo

  # SaveScreen real con el buscador de sitios (placesService) simulado y fallando. No se comprueba Google ni el
  # servidor, solo lo que hace Bite cuando no contestan.

  @ADD-03
  Escenario: Si el buscador no responde, Bite pasa a escribir a mano y lo explica
    Dado que Ana está en Madrid y abre la pantalla de guardar un restaurante
    Cuando escribe "Los horiz" y el buscador de sitios no responde
    Entonces ve el aviso "Ahora no podemos buscar sitios. Escribe el nombre y marca dónde está."
    Y el nombre a mano ya dice "Los horiz"

  @ADD-03
  Escenario: Sin buscador, el pin empieza donde está Ana y se puede guardar ahí
    Dado que Ana está en Madrid y abre la pantalla de guardar un restaurante
    Cuando escribe "Los horiz" y el buscador de sitios no responde
    Y lo valora con 4 estrellas
    Entonces ve el pin donde está ella
    Y al guardar, se guarda "Los horiz" donde está Ana

  @ADD-03
  Escenario: Sin buscador ni ubicación de Ana, hay que marcar dónde está
    Dado que Ana no comparte su ubicación y abre la pantalla de guardar un restaurante
    Cuando escribe "Los horiz" y el buscador de sitios no responde
    Y lo valora con 4 estrellas
    Entonces no puede guardar y ve "Marca dónde está para poder guardar"

  @ADD-03
  Escenario: Si el buscador vuelve, Ana puede volver a buscar
    Dado que Ana está en Madrid y abre la pantalla de guardar un restaurante
    Cuando escribe "Los horiz" y el buscador de sitios no responde
    Y el buscador vuelve a funcionar y Ana pulsa "Volver a buscar"
    Entonces ve la sugerencia "Los Horizontes" para "Los horiz"
