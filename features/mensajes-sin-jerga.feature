# language: es
Característica: Los avisos hablan el idioma de Ana, no el del programador
  Para que Ana entienda qué pasa y qué puede hacer, y nadie vea detalles internos de la app
  Ningún aviso menciona claves, la API ni errores técnicos; los errores pensados para Ana se muestran tal cual

  # utils/userError (qué error se puede enseñar), HomeScreen real con los datos simulados y una revisión de todos los
  # textos de src/ (salvo pruebas y configuración). El aviso del buscador de sitios lo cubre ADD-03.

  @UX-01
  Escenario: Ningún texto de la app menciona claves ni la API
    Dado todos los textos que Bite puede enseñar en pantalla
    Cuando se buscan menciones a claves o a la API
    Entonces no aparece ninguna
    Y ningún error técnico pasa su mensaje a la pantalla sin traducir

  @UX-02
  Escenario: Un error inesperado se explica sin detalles técnicos
    Dado que guardar falla con "FirebaseError: Missing or insufficient permissions"
    Cuando Bite decide qué decirle a Ana
    Entonces le dice "Inténtalo de nuevo en un momento."

  @UX-02
  Escenario: Un error pensado para Ana se muestra tal cual
    Dado que unirse a una lista falla porque el código no existe
    Cuando Bite decide qué decirle a Ana
    Entonces le dice "Codigo no encontrado"

  @UX-03
  Escenario: Si no cargan los restaurantes, el mapa lo explica sin detalles técnicos
    Dado que cargar los restaurantes falla con "FirebaseError: The query requires an index"
    Cuando Ana abre el mapa
    Entonces ve "No pudimos cargar tus restaurantes. Revisa tu conexión."
    Y no ve "FirebaseError"
