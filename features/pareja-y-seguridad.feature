# language: es
Característica: La pareja comparte lista y nadie más entra
  Para guardar y decidir juntos sin que nadie ajeno lo vea
  Ana y Bea comparten su lista de restaurantes con las reglas de seguridad reales

  # Se ejecuta contra el Firestore Emulator con firestore.rules (no toca la consola de Firebase).

  @EMU-01
  Escenario: Bea se une a la lista de Ana con el código
    Dado que Ana ha creado su lista
    Cuando Bea se une con el código de la lista de Ana
    Entonces Ana y Bea son miembros de la lista
    Y la lista de Bea es la de Ana

  @EMU-02
  @SHL-04
  Escenario: Lo que guarda una lo ve la otra al momento, en los dos sentidos
    Dado que Ana y Bea comparten lista y las dos están mirando los restaurantes
    Cuando Ana guarda "Gyoza" y Bea guarda "Taco"
    Entonces Ana ve "Gyoza" y "Taco"
    Y Bea ve "Gyoza" y "Taco"

  @EMU-05
  Escenario: Si las dos abren la decisión a la vez, votan en la misma ronda
    Dado que Ana y Bea comparten lista
    Cuando las dos abren ¿Dónde cenamos hoy? a la vez
    Entonces las dos están en la misma ronda
    Y esa ronda es la única que hay guardada para la lista

  @EMU-06
  Escenario: Si las dos dan like al mismo sitio, el match se marca una sola vez
    Dado que Ana y Bea comparten lista
    Y que las dos han abierto ¿Dónde cenamos hoy?
    Cuando las dos dan like a "r1"
    Y llega una detección tardía de una ronda anterior para "r2"
    Y los dos clientes marcan el match a la vez
    Entonces la ronda queda con match en "r1"

  @EMU-07
  Escenario: Bea no puede votar en nombre de Ana
    Dado que Ana y Bea comparten lista
    Cuando Bea intenta guardar un voto firmado como Ana
    Entonces el sistema lo deniega
    Y Ana no tiene ningún voto registrado

  @RUL-01
  Escenario: Una persona ajena a la lista no ve ni toca nada de ella
    Dado que Ana y Bea comparten lista con un restaurante guardado y una decisión en marcha
    Cuando Eva, que tiene cuenta pero no es miembro, intenta leer y escribir en esa lista
    Entonces no puede leer el restaurante, la decisión ni los votos
    Y no puede guardar restaurantes, votar ni modificar la lista

  @RUL-02
  Escenario: Sin iniciar sesión no hay acceso a nada
    Dado que Ana y Bea comparten lista con un restaurante guardado y una decisión en marcha
    Cuando alguien sin sesión intenta leer y escribir en esa lista
    Entonces el sistema lo deniega todo
