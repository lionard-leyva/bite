import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  startAfter,
  getDocs,
  type QueryDocumentSnapshot,
  type Timestamp,
} from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../config/firebase';
import { useAuth } from './useAuth';
import { getLocalRestaurants } from '../services/localStorageService';
import type { Restaurant } from '../types';

type RestaurantsMode = 'all' | 'paged';

interface UseRestaurantsOptions {
  mode?: RestaurantsMode;
  pageSize?: number;
}

interface UseRestaurantsReturn {
  restaurants: Restaurant[];
  loading: boolean;
  error: string | null;
  refreshLocal: () => void;
  loadMore: () => Promise<void>;
  loadingMore: boolean;
  hasMore: boolean;
}

function toDate(val: Timestamp | Date | null | undefined): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val.toDate === 'function') return val.toDate();
  return new Date();
}

function buildFingerprint(docs: Restaurant[]): string {
  return docs.map((d) => `${d.id}:${d.name}:${d.rating}:${d.visited}:${d.photoURL}:${(d.photoURLs ?? []).join(',')}:${d.address}:${d.note}:${d.latitude}:${d.longitude}:${d.pricePerPerson}`).join('|');
}

export function useRestaurants(options: UseRestaurantsOptions = {}): UseRestaurantsReturn {
  const mode = options.mode ?? 'paged';
  const { listId, skipMode } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localVersion, setLocalVersion] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const fingerprintRef = useRef('');
  const lastDocRef = useRef<QueryDocumentSnapshot | null>(null);
  const loadMoreInFlightRef = useRef(false);
  const PAGE_SIZE = options.pageSize ?? 200;

  const refreshLocal = useCallback(() => {
    setLocalVersion((v) => v + 1);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (skipMode) {
        setLocalVersion((v) => v + 1);
      }
    }, [skipMode]),
  );

  useEffect(() => {
    setLoading(true);
    setError(null);
    setHasMore(true);
    setRestaurants([]);
    if (!listId) {
      console.warn('[useRestaurants] No listId, skipping listener setup');
      setLoading(false);
      setHasMore(false);
      lastDocRef.current = null;
      return;
    }

    if (skipMode) {
      let cancelled = false;
      async function load() {
        const local = await getLocalRestaurants();
        if (!cancelled) {
          setRestaurants(local);
          setLoading(false);
          setHasMore(false);
          lastDocRef.current = null;
        }
      }
      load();
      return () => { cancelled = true; };
    }

    console.warn('[useRestaurants] Setting up onSnapshot with listId:', listId);

    const base = [
      collection(db, 'restaurants'),
      where('listId', '==', listId),
      orderBy('createdAt', 'desc'),
    ] as const;
    const q = mode === 'paged'
      ? query(...base, limit(PAGE_SIZE))
      : query(...base);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.warn(`[useRestaurants] onSnapshot OK: ${snapshot.docs.length} docs for listId=${listId}`);
        const docs = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name,
            address: data.address,
            latitude: data.latitude,
            longitude: data.longitude,
            rating: data.rating,
            note: data.note,
            photoURL: data.photoURL,
            photoURLs: data.photoURLs ?? [],
            visited: data.visited,
            pricePerPerson: data.pricePerPerson ?? 20,
            createdBy: data.createdBy,
            createdAt: toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
            listId: data.listId,
          } as Restaurant;
        });
        lastDocRef.current = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
        setHasMore(mode === 'paged' ? snapshot.docs.length === PAGE_SIZE : false);
        const fp = buildFingerprint(docs);
        if (fp !== fingerprintRef.current) {
          fingerprintRef.current = fp;
          setRestaurants(docs);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[useRestaurants] onSnapshot ERROR:', err.message);
        setError(err.message);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [listId, skipMode, localVersion, mode, PAGE_SIZE]);

  const loadMore = useCallback(async () => {
    if (mode !== 'paged') return;
    if (skipMode || loadingMore || loadMoreInFlightRef.current) return;
    if (!listId || !hasMore || !lastDocRef.current) return;

    loadMoreInFlightRef.current = true;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, 'restaurants'),
        where('listId', '==', listId),
        orderBy('createdAt', 'desc'),
        startAfter(lastDocRef.current),
        limit(PAGE_SIZE),
      );
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          rating: data.rating,
          note: data.note,
          photoURL: data.photoURL,
          photoURLs: data.photoURLs ?? [],
          visited: data.visited,
          pricePerPerson: data.pricePerPerson ?? 20,
          createdBy: data.createdBy,
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
          listId: data.listId,
        } as Restaurant;
      });

      if (docs.length > 0) {
        setRestaurants((prev) => {
          const map = new Map(prev.map((r) => [r.id, r]));
          for (const r of docs) map.set(r.id, r);
          return Array.from(map.values());
        });
      }

      lastDocRef.current = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : lastDocRef.current;
      setHasMore(snap.docs.length === PAGE_SIZE);
    } finally {
      loadMoreInFlightRef.current = false;
      setLoadingMore(false);
    }
  }, [mode, skipMode, loadingMore, listId, hasMore, PAGE_SIZE]);

  return { restaurants, loading, error, refreshLocal, loadMore, loadingMore, hasMore };
}
