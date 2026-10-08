# language: es
Característica: Lo que ve cada persona en ¿Dónde cenamos hoy?
  Para decidir a ciegas
  Ana solo ve su propia baraja y el resultado final, nunca lo que vota Bea

  # Se comprueba lo que MatchScreen enseña a Ana (pantalla real, con los datos de la ronda simulados). Que la sesión de
  # Firestore no lleve votos y que no haya match antes de tiempo lo define donde-cenamos.feature.

  Antecedentes:
    Dado que Ana y Bea están en la misma ronda con "Casa Lucio" y "Taco" pendientes

  @MCH-06
  Escenario: Lo que vota Bea no cambia lo que ve Ana mientras vota
    Dado que Ana todavía no ha votado nada
    Cuando Bea no ha votado nada, o ha dado like a "Casa Lucio", o ha dado like a "Taco"
    Entonces Ana ve exactamente la misma pantalla en los tres casos
    Y esa pantalla le propone "Casa Lucio"

  @MCH-06
  Escenario: Si Ana ya votó todo, solo sabe que Bea no ha terminado
    Dado que Ana ya ha votado todos los sitios
    Cuando Bea no ha votado nada, o ha votado solo uno
    Entonces Ana ve exactamente la misma pantalla en los dos casos
    Y esa pantalla dice "Esperando a Bea…"

  @MCH-06
  Escenario: Cuando coinciden, los dos ven el match
    Dado que los dos han dado like a "Taco" y la ronda se ha marcado como match
    Cuando Ana mira su pantalla
    Entonces ve "¡Es un match!", "Taco" y "❤ Tú + Bea"
