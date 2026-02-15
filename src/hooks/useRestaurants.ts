import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './useAuth';
import { getLocalRestaurants } from '../services/localStorageService';
import type { Restaurant } from '../types';

interface UseRestaurantsReturn {
  restaurants: Restaurant[];
  loading: boolean;
  error: string | null;
}

function toDate(val: Timestamp | Date | null | undefined): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val.toDate === 'function') return val.toDate();
  return new Date();
}

export function useRestaurants(): UseRestaurantsReturn {
  const { listId, skipMode } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!listId) {
      setLoading(false);
      return;
    }

    if (skipMode) {
      let cancelled = false;
      async function load() {
        const local = await getLocalRestaurants();
        if (!cancelled) {
          setRestaurants(local);
          setLoading(false);
        }
      }
      load();
      return () => { cancelled = true; };
    }

    const q = query(
      collection(db, 'restaurants'),
      where('listId', '==', listId),
      orderBy('createdAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            name: d.name,
            address: d.address,
            latitude: d.latitude,
            longitude: d.longitude,
            rating: d.rating,
            note: d.note,
            photoURL: d.photoURL,
            visited: d.visited,
            createdBy: d.createdBy,
            createdAt: toDate(d.createdAt),
            updatedAt: toDate(d.updatedAt),
            listId: d.listId,
          } as Restaurant;
        });
        setRestaurants(docs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [listId, skipMode]);

  return { restaurants, loading, error };
}
