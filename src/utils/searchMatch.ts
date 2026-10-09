// Busqueda local: ignora mayusculas y tildes ("cafe" encuentra "Café"); vacia = todo coincide.
const fold = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function matchesQuery(restaurant: { name: string; address?: string | null }, query: string): boolean {
  const q = fold(query.trim());
  if (!q) return true;
  return fold(restaurant.name).includes(q) || fold(restaurant.address ?? '').includes(q);
}
