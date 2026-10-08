# language: es
Característica: Quién puede decidir dónde cenar
  Para que "¿Dónde cenamos hoy?" solo se juegue en pareja
  Bite pide cuenta, lista compartida y a la otra persona antes de empezar

  # La decisión es de MatchScreen (acceso) y de la ronda (participantes). La tarjeta del mapa que abre la pantalla
  # (HomeScreen) y lo que se pinta en cada aviso quedan fuera: aquí se define quién llega a jugar y quién no.

  @MCH-05
  Escenario: Sin cuenta no se puede decidir en pareja
    Dado que Ana usa Bite sin cuenta
    Cuando Ana abre ¿Dónde cenamos hoy?
    Entonces no puede jugar y se le pide crear una cuenta y compartir su lista

  @MCH-05
  Escenario: Con cuenta pero sin lista tampoco
    Dado que Ana ha iniciado sesión pero todavía no tiene lista
    Cuando Ana abre ¿Dónde cenamos hoy?
    Entonces no puede jugar y se le pide crear una cuenta y compartir su lista

  @MCH-05
  Escenario: Con la sesión recién iniciada pero en modo sin cuenta todavía no juega
    Dado que Ana ha iniciado sesión y tiene lista, pero Bite sigue en modo sin cuenta
    Cuando Ana abre ¿Dónde cenamos hoy?
    Entonces no puede jugar y se le pide crear una cuenta y compartir su lista

  @MCH-05
  Escenario: Con lista guardada pero sin sesión no juega
    Dado que Ana tiene una lista guardada pero ya no hay sesión iniciada
    Cuando Ana abre ¿Dónde cenamos hoy?
    Entonces no puede jugar y se le pide crear una cuenta y compartir su lista

  @MCH-05
  Escenario: Con cuenta y lista ya puede entrar
    Dado que Ana ha iniciado sesión y tiene su lista
    Cuando Ana abre ¿Dónde cenamos hoy?
    Entonces puede jugar

  @MCH-05
  Escenario: Sola en la lista, hace falta la pareja
    Dado que Ana ha iniciado sesión y es la única persona de su ronda
    Cuando Ana mira quién participa
    Entonces hace falta que se una su pareja

  @MCH-05
  Escenario: Con su pareja en la ronda ya no hace falta nadie más
    Dado que Ana y Bea están en la misma ronda
    Cuando Ana mira quién participa
    Entonces no hace falta nadie más
