# language: es
Característica: Guardar un sitio compartido desde otra app
  Para guardar un sitio en dos toques sin escribirlo a mano
  Ana comparte a Bite lo que ve en Google Maps, Instagram o TikTok

  # El estado "Pendiente" y la composición de la nota los decide SaveScreen (UI):
  # aquí se define y comprueba lo que Bite entiende del texto compartido.

  @SHR-01
  Escenario: Un enlace largo de Google Maps trae el nombre y la ubicación exacta
    Dado que Ana comparte el enlace largo de Google Maps de "Casa Lucio" con la ubicación 40.4123, -3.7086
    Cuando Bite interpreta lo compartido
    Entonces el origen es "Google Maps"
    Y el nombre propuesto es "Casa Lucio"
    Y la ubicación es 40.4123, -3.7086
    Y no hace falta resolver el enlace

  @SHR-02
  Escenario: Con la ubicación de Maps el sitio se puede guardar sin buscarlo
    Dado que Ana comparte el enlace largo de Google Maps de "Casa Lucio" con la ubicación 40.4123, -3.7086
    Cuando Bite interpreta lo compartido
    Entonces el sitio llega con nombre y ubicación

  @SHR-02
  Escenario: Un enlace corto de Maps se completa al resolver su destino
    Dado que Ana comparte "Ramen Kagura" con un enlace corto de Google Maps
    Cuando Bite interpreta lo compartido
    Entonces el enlace corto hay que resolverlo y todavía no tiene ubicación
    Cuando el enlace corto se resuelve a la ficha de "Ramen Kagura" en 40.4189, -3.7095
    Entonces el sitio llega con nombre y ubicación
    Y no hace falta resolver el enlace

  @SHR-02
  Escenario: Sin ubicación el sitio debe confirmarse en el buscador
    Dado que Ana comparte el texto "Casa Mono"
    Cuando Bite interpreta lo compartido
    Entonces el nombre propuesto es "Casa Mono"
    Y el sitio llega sin ubicación

  @SHR-04
  Escenario: Un reel de Instagram solo con enlace no inventa nombre
    Dado que Ana comparte el texto "https://www.instagram.com/reel/C9xYz/?igsh=MWQ1"
    Cuando Bite interpreta lo compartido
    Entonces el origen es "Instagram"
    Y no hay nombre propuesto
    Y el enlace para la nota es "https://www.instagram.com/reel/C9xYz/"

  @SHR-04
  Escenario: Un TikTok con descripción corta propone el nombre
    Dado que Ana comparte el texto "Sala de Despiece #madrid https://vm.tiktok.com/ZMabc/"
    Cuando Bite interpreta lo compartido
    Entonces el origen es "TikTok"
    Y el nombre propuesto es "Sala de Despiece"

  @SHR-04
  Escenario: Una descripción larga no se toma por nombre
    Dado que Ana comparte el texto "El mejor ramen que he probado en mi vida, tenéis que ir sí o sí este finde con amigos https://www.instagram.com/p/abc/"
    Cuando Bite interpreta lo compartido
    Entonces no hay nombre propuesto
