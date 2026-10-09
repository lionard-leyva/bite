# language: es
Característica: Los toques finales del diseño
  Para que Bite se sienta cálido y con vida sin estorbar
  Toque táctil al actuar, estado vacío con personalidad, celebración al hacer match y avatares de la pareja

  # Componentes y pantallas reales con expo-haptics y el aviso de accesibilidad simulados. Cómo se sienten y se ven se revisa en el móvil.

  @HAP-01
  Esquema del escenario: Las acciones importantes dan un toque táctil
    Dado que Ana usa Bite
    Cuando <acción>
    Entonces el móvil da un toque <toque>

    Ejemplos:
      | acción                          | toque   |
      | pulsa el botón de guardar       | ligero  |
      | vota que iría a un sitio        | medio   |
      | los dos coinciden en un sitio   | de éxito |

  @EMP-01
  Escenario: La lista vacía invita con calidez
    Dado que Ana todavía no ha guardado ningún restaurante
    Cuando abre su lista
    Entonces ve "Aquí aparecerán vuestros sitios"
    Y sigue viendo "No tienes restaurantes guardados"

  @CEL-01
  Esquema del escenario: El match se celebra solo si el movimiento está permitido
    Dado que el movimiento <movimiento>
    Cuando los dos coinciden en un sitio
    Entonces <confeti> confeti

    Ejemplos:
      | movimiento           | confeti |
      | está permitido       | se ve   |
      | está reducido        | no se ve |

  @AVA-01
  Escenario: La pareja aparece con sus iniciales superpuestas
    Dado que Ana y Bea han coincidido
    Cuando se muestra el match
    Entonces ven las iniciales "T" y "B" una junto a otra
