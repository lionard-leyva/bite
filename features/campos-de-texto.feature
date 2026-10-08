# language: es
Característica: Los campos de texto no cortan las letras
  Para que se lean bien las letras con descendentes (g, j, p, q, y)
  Ningún campo de texto fija una altura menor que el interlineado de su texto

  # Regla estática sobre el código de las pantallas y componentes. Que en el móvil se vea bien lo comprueba
  # `npm run qa:keyboard` (KBD-01) con capturas.

  @KBD-03
  Escenario: Ningún campo fija una altura menor que su interlineado
    Dado el código de todas las pantallas y componentes de Bite
    Cuando se revisan los campos de texto
    Entonces ninguno fija una altura menor que el interlineado de su texto

  @KBD-03
  Escenario: La regla detecta un campo mal hecho
    Dado un campo de texto con altura 18 e interlineado 24
    Cuando se revisa ese campo
    Entonces se señala como incorrecto

  @KBD-03
  Escenario: Un campo con altura mínima suficiente es correcto
    Dado un campo de texto con altura mínima 48 e interlineado 24
    Cuando se revisa ese campo
    Entonces no se señala

  @KBD-03
  Escenario: Un campo con altura igual al interlineado es correcto
    Dado un campo de texto con altura 24 e interlineado 24
    Cuando se revisa ese campo
    Entonces no se señala

  @KBD-03
  Escenario: Se señala un campo cuyo estilo está definido aparte
    Dado el código de una pantalla donde el campo usa el estilo "buscador" con altura 12 y letra de 15
    Cuando se revisa ese código
    Entonces se señala 1 campo incorrecto

  @KBD-03
  Escenario: Una altura mínima en el código no se señala
    Dado el código de una pantalla donde el campo usa una altura mínima de 48 y un interlineado de 24
    Cuando se revisa ese código
    Entonces no se señala ningún campo
