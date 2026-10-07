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

  @SHL-02
  Escenario: Bea se une a la lista de Ana con el código de invitación
    Dado que Ana tiene una lista compartible
    Cuando Bea se une con el código de la lista de Ana, escrito en minúsculas y con espacios
    Entonces Bea y Ana son miembros de la lista
    Y la lista de Bea es la de Ana

  @SHL-02
  Escenario: Un código inexistente no da acceso a ninguna lista
    Dado que Ana tiene una lista compartible
    Cuando Bea intenta unirse con el código "ZZZZZZ"
    Entonces Bea recibe el error "Codigo no encontrado"
    Y Ana sigue siendo la única miembro de la lista

  @SHL-02
  Escenario: Ana no puede unirse a su propia lista
    Dado que Ana tiene una lista compartible
    Cuando Ana intenta unirse con el código de su propia lista
    Entonces Ana recibe el error "Ya eres miembro de esta lista"
    Y Ana sigue siendo la única miembro de la lista

  @SHL-03
  Escenario: Bea deja de compartir y vuelve a tener lista propia
    Dado que Ana tiene una lista compartible
    Y que Bea se ha unido a la lista de Ana
    Cuando Bea deja de compartir la lista
    Entonces Bea ya no es miembro de la lista de Ana
    Y Bea tiene una lista propia nueva distinta de la de Ana
    Y Ana sigue siendo la única miembro de la lista
