# language: es
Característica: Fotos de los restaurantes
  Para que las fotos pesen poco y no llenen el almacenamiento
  Bite reduce cada foto antes de subirla

  # Se define qué se sube y cómo (imageService con el manipulador de imágenes, Storage y fetch simulados). Que el
  # resultado pese de verdad menos de 200 KB depende del manipulador nativo y no se puede comprobar aquí; el selector
  # de fotos (PhotoPicker) es de UI.

  @ADD-04
  Escenario: La foto se reduce antes de subirla
    Dado que Ana ha elegido una foto de la galería
    Cuando Bite sube la foto de "Casa Lucio" con la cuenta de Ana
    Entonces antes de subir la foto se reduce a 800 píxeles de ancho en JPEG con calidad 0,7

  @ADD-04
  Escenario: Se sube la versión reducida, no el original
    Dado que Ana ha elegido una foto de la galería
    Cuando Bite sube la foto de "Casa Lucio" con la cuenta de Ana
    Entonces lo que llega a Storage es la foto ya reducida y no la original

  @ADD-04
  Escenario: Cada foto va a su sitio y se devuelven en orden
    Dado que Ana ha elegido 3 fotos de la galería
    Cuando Bite sube las fotos de "Casa Lucio" con la cuenta de Ana
    Entonces las 3 fotos se guardan en las rutas "photos/uid-ana/rest-1_0.jpg", "photos/uid-ana/rest-1_1.jpg" y "photos/uid-ana/rest-1_2.jpg"
    Y las direcciones de descarga se devuelven en el mismo orden

  @ADD-04
  Escenario: Si falla la reducción, no se sube nada
    Dado que Ana ha elegido una foto de la galería
    Y que el reductor de imágenes falla
    Cuando Bite sube la foto de "Casa Lucio" con la cuenta de Ana
    Entonces la subida falla con un aviso y no llega nada a Storage
