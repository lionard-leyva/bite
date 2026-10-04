import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  castVote,
  getOrStartSession,
  markMatched,
  subscribeSession,
  subscribeVotes,
} from '../services/decisionService';
import { findMatch } from '../utils/matchLogic';
import type { DecisionSession, Vote, VotesByUser } from '../types';

interface UseDecisionSessionParams {
  listId: string;
  userId: string;
  /** Candidate ids used only when a new round has to be created. */
  candidateIds: string[];
  /** Wait until restaurants and location are loaded before joining a round. */
  ready: boolean;
}

interface UseDecisionSessionResult {
  session: DecisionSession | null;
  /** Everyone's votes, used only to detect matches; never shown in the UI. */
  votes: VotesByUser;
  myVotes: Record<string, Vote>;
  loading: boolean;
  error: string | null;
  vote: (restaurantId: string, vote: Vote) => void;
  restart: () => Promise<void>;
}

export function useDecisionSession({
  listId,
  userId,
  candidateIds,
  ready,
}: UseDecisionSessionParams): UseDecisionSessionResult {
  const [session, setSession] = useState<DecisionSession | null>(null);
  const [votes, setVotes] = useState<VotesByUser>({});
  const [pendingVotes, setPendingVotes] = useState<Record<string, Vote>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);
  const candidateIdsRef = useRef(candidateIds);
  candidateIdsRef.current = candidateIds;

  const start = useCallback(
    async (forceNew: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const s = await getOrStartSession({
          listId,
          userId,
          candidateIds: candidateIdsRef.current,
          forceNew,
        });
        setSession(s);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo iniciar la ronda');
      } finally {
        setLoading(false);
      }
    },
    [listId, userId],
  );

  useEffect(() => {
    if (!ready || !listId || !userId || startedRef.current) return;
    startedRef.current = true;
    start(false);
  }, [ready, listId, userId, start]);

  useEffect(() => {
    if (!listId) return;
    return subscribeSession(
      listId,
      (s) => {
        if (s) setSession(s);
      },
      (err) => setError(err.message),
    );
  }, [listId]);

  const roundId = session?.roundId ?? null;

  useEffect(() => {
    setVotes({});
    setPendingVotes({});
    if (!roundId) return;
    return subscribeVotes(roundId, setVotes, (err) => setError(err.message));
  }, [roundId]);

  const mergedVotes = useMemo<VotesByUser>(
    () => ({ ...votes, [userId]: { ...(votes[userId] ?? {}), ...pendingVotes } }),
    [votes, pendingVotes, userId],
  );

  useEffect(() => {
    if (!session || session.status !== 'ACTIVE') return;
    const match = findMatch(mergedVotes, session.participants, session.restaurantIds);
    if (match) {
      markMatched(session.listId, session.roundId, match).catch((err) => setError(err.message));
    }
  }, [mergedVotes, session]);

  const vote = useCallback(
    (restaurantId: string, v: Vote) => {
      if (!session) return;
      setPendingVotes((prev) => ({ ...prev, [restaurantId]: v }));
      castVote({
        roundId: session.roundId,
        listId: session.listId,
        userId,
        restaurantId,
        vote: v,
      }).catch((err) => setError(err.message));
    },
    [session, userId],
  );

  const restart = useCallback(() => start(true), [start]);

  return {
    session,
    votes: mergedVotes,
    myVotes: mergedVotes[userId] ?? {},
    loading,
    error,
    vote,
    restart,
  };
}
