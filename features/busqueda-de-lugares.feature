# language: es
Característica: Buscar el restaurante al guardarlo
  Para poder guardar un sitio aunque Google no responda
  Bite pasa a escribir el nombre a mano cuando el buscador de lugares falla

  # SaveScreen real con el buscador de Google simulado (se le provoca el fallo de red o de cuota). No se comprueba
  # la API de Google, solo lo que hace Bite cuando no contesta.

  @ADD-03
  Escenario: Con el buscador disponible se busca en Google
    Dado que Bite tiene la clave de Google configurada
    Cuando Ana abre la pantalla de guardar un restaurante
    Entonces Ana busca el restaurante con el buscador de Google
    Y no se le pide escribir el nombre a mano

  @ADD-03
  Escenario: Si Google falla, Bite pasa a escribir a mano y lo explica
    Dado que Bite tiene la clave de Google configurada
    Y que Ana ha abierto la pantalla de guardar un restaurante
    Cuando Google no responde por falta de red o de cuota
    Entonces Ana puede escribir el nombre del restaurante a mano
    Y ve un aviso de que las sugerencias no se pudieron cargar

  @ADD-03
  Escenario: Lo que Ana ya había escrito no se pierde al pasar a mano
    Dado que Bite tiene la clave de Google configurada
    Y que Ana ha abierto la pantalla de guardar un restaurante
    Y que Ana ha escrito "Casa Lu" en el buscador
    Cuando Google no responde por falta de red o de cuota
    Entonces el nombre a mano ya dice "Casa Lu"

  @ADD-03
  Escenario: Si Google falla mientras Ana escribe, el resto del formulario sigue a la vista
    Dado que Bite tiene la clave de Google configurada
    Y que Ana ha abierto la pantalla de guardar un restaurante
    Y que Ana está escribiendo en el buscador
    Cuando Google no responde por falta de red o de cuota
    Entonces Ana ve el campo de la dirección

  @ADD-03
  Escenario: Sin clave de Google se escribe a mano desde el principio
    Dado que Bite no tiene clave de Google
    Cuando Ana abre la pantalla de guardar un restaurante
    Entonces Ana puede escribir el nombre del restaurante a mano
