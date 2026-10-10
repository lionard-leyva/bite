# language: es
Característica: Las coordenadas del perfil siguen a la ciudad y a la dirección que se guardan
  Para que el perfil no mezcle una ciudad nueva con las coordenadas de la anterior
  Cada vez que se guardan los cambios, lo que queda en el perfil es lo último que Ana ha elegido

  # Función pura buildProfilePayload (sin Firestore). Que el borrado llegue a la base de datos lo
  # comprueba deleteField de Firestore, que aquí se simula con un centinela.

  @PRF-02
  Escenario: Escribir otra ciudad a mano borra las coordenadas de la anterior
    Dado que el perfil de Ana tiene la ciudad "Madrid" con sus coordenadas
    Cuando Ana escribe la ciudad "Valencia" a mano y guarda los cambios
    Entonces la ciudad guardada es "Valencia"
    Y las coordenadas de la ciudad se borran en vez de quedarse las de Madrid

  @PRF-02
  Escenario: Elegir una ciudad con coordenadas las guarda
    Dado que el perfil de Ana tiene la ciudad "Madrid" con sus coordenadas
    Cuando Ana elige "Valencia" con sus coordenadas y guarda los cambios
    Entonces se guardan las coordenadas de "Valencia"

  @PRF-02
  Escenario: Cambiar la dirección a mano borra también sus coordenadas
    Dado que el perfil de Ana tiene la dirección "Calle Mayor 1" con sus coordenadas
    Cuando Ana escribe la dirección "Gran Vía 2" a mano y guarda los cambios
    Entonces las coordenadas de la dirección se borran en vez de quedarse las de la anterior
