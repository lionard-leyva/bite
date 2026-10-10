// Un error pensado para que lo lea el usuario ("Codigo no encontrado"). Cualquier otro (Firebase, red, un fallo de
// programacion) se cambia por un texto claro: los detalles internos no se ensenan en pantalla (UX-02).
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserError';
  }
}

export function friendlyMessage(error: unknown, fallback: string): string {
  return error instanceof UserError ? error.message : fallback;
}
