# language: es
Característica: El tema activo llega a toda la app
  Para que el color cambie de claro a oscuro sin tocar cada pantalla
  La app monta su tema una vez y todas las pantallas lo reciben

  # ThemeProvider real con el esquema de color del teléfono simulado. Que el color se vea bien en una pantalla
  # concreta se revisa en el emulador.

  @UI-04
  Escenario: El tema entrega a la app las variables de la paleta activa
    Dado que el teléfono está en el tema "oscuro"
    Cuando la app monta su tema
    Entonces las variables del tema llevan los colores del tema oscuro
    Y quien necesite un color suelto lo recibe del mismo tema
