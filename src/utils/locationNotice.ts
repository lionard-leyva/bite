// Que le decimos al usuario cuando no hay ubicacion. Reglas puras: la pantalla solo las pinta.
export type LocationErrorKind = 'permission' | 'unavailable';

export interface LocationNoticeContent {
  message: string;
  /** Texto del boton de accion, o null si el aviso no ofrece ninguna. */
  actionLabel: string | null;
}

/** El aviso solo sale tras pulsar el boton: quien lo denego a proposito no lo ve en cada arranque. */
export function locationNotice(kind: LocationErrorKind | null, asked: boolean): LocationNoticeContent | null {
  if (!kind || !asked) return null;
  if (kind === 'permission') {
    return { message: 'Bite necesita tu ubicación para centrar el mapa. Actívala en Ajustes.', actionLabel: 'Abrir Ajustes' };
  }
  return { message: 'No encontramos tu posición. Inténtalo de nuevo.', actionLabel: null };
}

// Etiquetas sin tildes, como el resto de etiquetas de accesibilidad que buscan los scripts QA.
export function locationButtonState(kind: LocationErrorKind | null): { label: string; dimmed: boolean } {
  return kind === 'permission'
    ? { label: 'Ubicacion desactivada, toca para activarla', dimmed: true }
    : { label: 'Ir a mi ubicacion', dimmed: false };
}
