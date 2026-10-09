// Inicial para el marcador: el primer caracter completo (un emoji no se parte) o "B" si no hay nombre.
export function initialOf(name: string): string {
  const first = Array.from(name.trim())[0];
  return first ? first.toUpperCase() : 'B';
}
