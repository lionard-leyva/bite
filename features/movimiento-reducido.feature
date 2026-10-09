# language: es
Característica: Bite respeta "reducir movimiento"
  Para que quien se maree con las animaciones no las sufra
  Con la opción del sistema activada, los elementos no se encogen ni rebotan al pulsarlos

  # Componentes reales con el aviso de accesibilidad del sistema simulado; se vigila la animación que piden (Animated.spring).
  # Cómo se siente el movimiento se revisa en el emulador.

  @UI-09
  Esquema del escenario: Con reducir movimiento el elemento no se anima al pulsarlo
    Dado que el teléfono tiene activado reducir movimiento
    Cuando Ana pulsa <elemento>
    Entonces <elemento> no se encoge

    Ejemplos:
      | elemento                |
      | la tarjeta de restaurante |
      | el botón de guardar     |

  @UI-09
  Escenario: Sin reducir movimiento la tarjeta se encoge al pulsarla
    Dado que el teléfono no tiene activado reducir movimiento
    Cuando Ana pulsa la tarjeta de restaurante
    Entonces la tarjeta de restaurante se encoge un poco

  @UI-09
  Escenario: Con reducir movimiento el punto de tu ubicación no pulsa
    Dado que el teléfono tiene activado reducir movimiento
    Cuando se muestra el punto de la ubicación de Ana en el mapa
    Entonces el punto se queda quieto
