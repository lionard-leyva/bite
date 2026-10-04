export type Vote = 'LIKE' | 'PASS';

export type DecisionStatus = 'ACTIVE' | 'MATCHED' | 'CLOSED';

/**
 * One "¿Dónde cenamos hoy?" round per list. The doc id is the listId so both
 * partners always land on the same round; `roundId` changes on every restart.
 */
export interface DecisionSession {
  id: string;
  roundId: string;
  listId: string;
  createdBy: string;
  participants: string[];
  restaurantIds: string[];
  status: DecisionStatus;
  matchedRestaurantId: string | null;
  createdAt: Date;
}

/** userId -> restaurantId -> vote */
export type VotesByUser = Record<string, Record<string, Vote>>;
