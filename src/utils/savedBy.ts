export interface ListMember {
  userId: string;
  email: string;
  displayName: string;
}

export const nameOf = (m: ListMember) => m.displayName || m.email.split('@')[0] || '';

// Nombre de quien guardo el sitio cuando es otra persona de la lista; null en listas personales o si no se conoce.
export function otherAuthorName(createdBy: string, members: ListMember[], currentUserId: string | null): string | null {
  if (members.length < 2 || createdBy === currentUserId) return null;
  const member = members.find((m) => m.userId === createdBy);
  return member ? nameOf(member) || null : null;
}

// "Guardado por Bea" / "Guardado por ti"; null si la lista es personal o el autor no se conoce.
export function savedByLabel(createdBy: string, members: ListMember[], currentUserId: string | null): string | null {
  if (members.length < 2) return null;
  if (createdBy === currentUserId) return 'Guardado por ti';
  const name = otherAuthorName(createdBy, members, currentUserId);
  return name ? `Guardado por ${name}` : null;
}
