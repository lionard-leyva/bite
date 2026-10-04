import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { isSessionFresh } from '../utils/matchLogic';
import type { DecisionSession, Vote, VotesByUser } from '../types';

function toDate(val: Timestamp | Date | null | undefined): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val.toDate === 'function') return val.toDate();
  return new Date();
}

function newRoundId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function parseSession(id: string, data: Record<string, any>): DecisionSession {
  return {
    id,
    roundId: data.roundId,
    listId: data.listId,
    createdBy: data.createdBy,
    participants: data.participants ?? [],
    restaurantIds: data.restaurantIds ?? [],
    status: data.status,
    matchedRestaurantId: data.matchedRestaurantId ?? null,
    createdAt: toDate(data.createdAt),
  };
}

/**
 * Joins the list's current round, or starts a new one when there is none,
 * it is stale, or `forceNew` is set. Runs in a transaction so two partners
 * opening the screen at once end up in the same round.
 */
export async function getOrStartSession(params: {
  listId: string;
  userId: string;
  candidateIds: string[];
  forceNew?: boolean;
}): Promise<DecisionSession> {
  const { listId, userId, candidateIds, forceNew = false } = params;
  const listSnap = await getDoc(doc(db, 'lists', listId));
  const members: string[] = listSnap.exists() ? listSnap.data()?.members ?? [userId] : [userId];
  const sessionRef = doc(db, 'decisionSessions', listId);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(sessionRef);
    if (snap.exists() && !forceNew) {
      const current = parseSession(snap.id, snap.data());
      if (current.status !== 'CLOSED' && isSessionFresh(current.createdAt)) {
        return current;
      }
    }

    const fresh = {
      roundId: newRoundId(),
      listId,
      createdBy: userId,
      participants: members,
      restaurantIds: candidateIds,
      status: 'ACTIVE' as const,
      matchedRestaurantId: null,
      createdAt: serverTimestamp(),
    };
    tx.set(sessionRef, fresh);
    return { ...fresh, id: listId, createdAt: new Date() };
  });
}

export function subscribeSession(
  listId: string,
  onChange: (session: DecisionSession | null) => void,
  onError: (err: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, 'decisionSessions', listId),
    (snap) => onChange(snap.exists() ? parseSession(snap.id, snap.data()) : null),
    onError,
  );
}

/**
 * Votes live in a top-level collection, one doc per user and round, so the
 * session doc never carries anyone's choices. The UI only ever reveals a match.
 */
export function subscribeVotes(
  roundId: string,
  onChange: (votes: VotesByUser) => void,
  onError: (err: Error) => void,
): () => void {
  return onSnapshot(
    query(collection(db, 'decisionVotes'), where('roundId', '==', roundId)),
    (snap) => {
      const votes: VotesByUser = {};
      for (const d of snap.docs) {
        const data = d.data();
        votes[data.userId] = data.votes ?? {};
      }
      onChange(votes);
    },
    onError,
  );
}

export async function castVote(params: {
  roundId: string;
  listId: string;
  userId: string;
  restaurantId: string;
  vote: Vote;
}): Promise<void> {
  const { roundId, listId, userId, restaurantId, vote } = params;
  await setDoc(
    doc(db, 'decisionVotes', `${roundId}_${userId}`),
    {
      roundId,
      listId,
      userId,
      votes: { [restaurantId]: vote },
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/** Idempotent: only the first client to detect the match writes it. */
export async function markMatched(
  listId: string,
  roundId: string,
  restaurantId: string,
): Promise<void> {
  const sessionRef = doc(db, 'decisionSessions', listId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(sessionRef);
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.roundId !== roundId || data.status !== 'ACTIVE') return;
    tx.update(sessionRef, { status: 'MATCHED', matchedRestaurantId: restaurantId });
  });
}
