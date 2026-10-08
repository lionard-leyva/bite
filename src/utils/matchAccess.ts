// Quien llega a jugar "¿Donde cenamos hoy?": hace falta cuenta (no modo sin cuenta), sesion y lista compartible.
interface MatchAccessInput {
  skipMode: boolean;
  hasUser: boolean;
  listId: string | null;
}

export function canPlayMatch({ skipMode, hasUser, listId }: MatchAccessInput): boolean {
  return !skipMode && hasUser && !!listId;
}

/** Una ronda con menos de dos participantes no se puede jugar: falta la pareja. */
export function needsPartner(participants: string[]): boolean {
  return participants.length < 2;
}
