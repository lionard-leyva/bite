# language: es
Característica: Bite se ve siempre en claro, como el diseño Terracota elegido
  Para que Ana vea la app igual que el diseño que eligió
  La app usa el tema claro aunque el teléfono esté en modo oscuro

  # ThemeProvider real con el esquema de color del teléfono simulado. El diseño elegido (A · Terracota) es claro:
  # el 9 de octubre el iPhone en modo oscuro enseñaba la app en oscuro y no se parecía al diseño.

  @UI-04
  Escenario: Con el teléfono en oscuro, la app entrega los colores claros
    Dado que el teléfono está en el tema "oscuro"
    Cuando la app monta su tema
    Entonces las variables del tema llevan los colores del tema claro
    Y quien necesite un color suelto lo recibe del mismo tema

  @UI-07
  Escenario: La app se declara siempre en claro
    Dado la configuración de la app Bite
    Cuando se lee cómo elige entre tema claro y oscuro
    Entonces usa siempre el tema claro
