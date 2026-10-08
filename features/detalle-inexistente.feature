# language: es
Característica: Abrir un restaurante que ya no existe
  Para que nadie se quede ante una pantalla rota
  Bite avisa cuando el restaurante pedido no está en la lista

  # DetailScreen real con la lista de restaurantes simulada.

  @DET-03
  Escenario: Un restaurante que no está en la lista se avisa
    Dado que la lista de Ana tiene "Casa Lucio"
    Cuando Ana abre el detalle de un restaurante que no existe
    Entonces Bite dice "Restaurante no encontrado"
    Y no muestra ninguna acción sobre el restaurante

  @DET-03
  Escenario: Un restaurante que sí está se muestra, no el aviso
    Dado que la lista de Ana tiene "Casa Lucio"
    Cuando Ana abre el detalle de "Casa Lucio"
    Entonces Bite muestra "Casa Lucio"
    Y no dice "Restaurante no encontrado"

  @DET-03
  Escenario: Si el restaurante se borra mientras se mira, aparece el aviso
    Dado que la lista de Ana tiene "Casa Lucio"
    Y que Ana tiene abierto el detalle de "Casa Lucio"
    Cuando su pareja elimina "Casa Lucio"
    Entonces Bite dice "Restaurante no encontrado"
