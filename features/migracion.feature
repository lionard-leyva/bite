# language: es
Característica: Pasar de usar Bite sin cuenta a tener cuenta
  Para no perder los restaurantes que ya guardé
  Ana, que usaba Bite sin cuenta, crea una cuenta y migra lo guardado en su móvil

  # Se define qué pasa con los datos. El aviso "¿Migrar X restaurantes?" y la comprobación de que hay sesión iniciada
  # son de AuthContext y de RootNavigator (UI), y quedan fuera.

  Antecedentes:
    Dado que Ana usaba Bite sin cuenta y guardó "Casa Lucio" visitado con 2 fotos, "Taco" pendiente sin fotos y "Gyoza" pendiente

  @PRF-03
  Escenario: Ana migra sus restaurantes a su cuenta nueva
    Cuando Ana migra lo guardado en el móvil a su lista con su cuenta nueva
    Entonces su lista de la cuenta tiene los 3 restaurantes con su nombre, dirección, nota, valoración, precio y estado
    Y todos quedan a nombre de su cuenta y no del dispositivo
    Y Ana ve que se han migrado 3

  @PRF-03
  Escenario: Con muchos restaurantes se migran todos
    Dado que Ana además guardó otros 4 restaurantes sin cuenta
    Cuando Ana migra lo guardado en el móvil a su lista con su cuenta nueva
    Entonces su lista de la cuenta tiene 7 restaurantes
    Y Ana ve que se han migrado 7

  @PRF-03
  Escenario: Si falla a medias y Ana reintenta, no se repite nada
    Dado que Ana además guardó otros 4 restaurantes sin cuenta
    Y que el guardado del sexto restaurante falla por falta de red
    Cuando Ana intenta migrar y falla
    Entonces en el móvil queda solo 1 restaurante por migrar
    Cuando Ana vuelve a intentarlo
    Entonces su lista de la cuenta tiene exactamente 7 restaurantes sin repetidos
    Y en el móvil ya no queda ningún restaurante

  @PRF-03
  Escenario: Las fotos locales se suben con la cuenta nueva
    Cuando Ana migra lo guardado en el móvil a su lista con su cuenta nueva
    Entonces las 2 fotos de "Casa Lucio" se suben con su cuenta nueva
    Y "Taco" no sube ninguna foto

  @PRF-03
  Escenario: Tras migrar no quedan datos en el móvil
    Cuando Ana migra lo guardado en el móvil a su lista con su cuenta nueva
    Entonces en el móvil ya no queda ningún restaurante guardado

  @PRF-03
  Escenario: Si no se puede determinar su lista, no se pierde nada del móvil
    Cuando Ana intenta migrar sin que se haya determinado su lista
    Entonces la migración falla con un aviso
    Y en el móvil siguen sus 3 restaurantes
    Y su cuenta no recibe ninguno
