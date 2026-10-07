# language: es
Característica: Compartir la lista con la pareja
  Para guardar y recordar sitios juntos
  Ana quiere invitar a Bea a su lista de restaurantes

  @SHL-01
  Escenario: Ana crea su lista y obtiene un código de invitación
    Dado que Ana todavía no tiene lista
    Cuando Ana crea su lista personal
    Entonces la lista tiene un código de invitación de 6 caracteres
    Y Ana es la única miembro de la lista
