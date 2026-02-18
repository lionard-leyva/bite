import { createContext, useState, useEffect, useRef, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { ensureUserList, consolidateUserLists } from '../services/listService';
import {
  getOrCreateDeviceId,
  getSkipMode,
  setSkipMode,
  getLocalRestaurants,
  getLocalRestaurantCount,
  clearLocalRestaurants,
} from '../services/localStorageService';
import { saveRestaurant } from '../services/restaurantService';

export interface AuthState {
  user: FirebaseUser | null;
  userId: string;
  listId: string;
  isLoading: boolean;
  skipMode: boolean;
  pendingMigration: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  skipLogin: () => Promise<void>;
  migrateLocalData: () => Promise<number>;
  dismissMigration: () => void;
  refreshListId: (newListId: string) => void;
}

export const AuthContext = createContext<AuthState | null>(null);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userId, setUserId] = useState('');
  const [listId, setListId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [skipMode, setSkipModeState] = useState(false);
  const [pendingMigration, setPendingMigration] = useState(false);

  const callIdRef = useRef(0);
  useEffect(() => {
    let isFirstCall = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const thisCall = ++callIdRef.current;

      // Only rely on the initial isLoading=true for the first call.
      // Subsequent calls (token refresh, re-auth) must NOT set isLoading=true
      // because that unmounts all screens (SaveScreen, DetailScreen, etc.).
      if (isFirstCall) {
        isFirstCall = false;
      }

      try {
        if (firebaseUser) {
          // Ensure we have a fresh token before any Firestore reads/writes.
          await firebaseUser.getIdToken(true);
          await setSkipMode(false);
          if (callIdRef.current !== thisCall) return;

          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          const alreadyConsolidated = userDoc.exists()
            ? Boolean(userDoc.data()?.listsConsolidatedAt)
            : false;
          const userListId = await ensureUserList(firebaseUser.uid);
          const [, localCount] = await Promise.all([
            setDoc(
              userDocRef,
              {
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '',
                createdAt: serverTimestamp(),
                ...(alreadyConsolidated ? {} : { listsConsolidatedAt: serverTimestamp() }),
              },
              { merge: true },
            ),
            getLocalRestaurantCount(),
          ]);
          if (callIdRef.current !== thisCall) return;

          if (localCount > 0) {
            setPendingMigration(true);
          }

          if (!alreadyConsolidated) {
            void consolidateUserLists(firebaseUser.uid, userListId).catch((err) => {
              console.error('[AuthContext] Consolidation failed:', err);
            });
          }

          console.warn('[AuthContext] Auth setup OK — uid:', firebaseUser.uid, 'listId:', userListId);

          // Batch all state updates so React commits them in one render
          setSkipModeState(false);
          setUserId(firebaseUser.uid);
          setListId(userListId);
          setUser(firebaseUser);
        } else {
          setUser(null);

          const wasSkip = await getSkipMode();
          if (callIdRef.current !== thisCall) return;

          if (wasSkip) {
            const deviceId = await getOrCreateDeviceId();
            if (callIdRef.current !== thisCall) return;
            setUserId(deviceId);
            setListId('local');
            setSkipModeState(true);
          } else {
            setUserId('');
            setListId('');
            setSkipModeState(false);
          }
        }
      } catch (err) {
        console.error('[AuthContext] Auth setup failed:', err);
        // If setup fails, reset to signed-out state so the user can retry
        setUser(null);
        setUserId('');
        setListId('');
        setSkipModeState(false);
      } finally {
        // Only update isLoading if this is still the latest callback
        if (callIdRef.current === thisCall) {
          setIsLoading(false);
        }
      }
    });

    return unsubscribe;
  }, []);

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function register(email: string, password: string) {
    await createUserWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    await signOut(auth);
    setUser(null);
    setUserId('');
    setListId('');
    setSkipModeState(false);
    await setSkipMode(false);
  }

  async function skipLogin() {
    const deviceId = await getOrCreateDeviceId();
    setUserId(deviceId);
    setListId('local');
    setSkipModeState(true);
    await setSkipMode(true);
    setIsLoading(false);
  }

  async function migrateLocalData(): Promise<number> {
    if (!user || skipMode) return 0;

    const locals = await getLocalRestaurants();
    if (locals.length === 0) return 0;

    const BATCH_SIZE = 5;
    for (let i = 0; i < locals.length; i += BATCH_SIZE) {
      const batch = locals.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((r) =>
          saveRestaurant({
            name: r.name,
            address: r.address,
            latitude: r.latitude,
            longitude: r.longitude,
            rating: r.rating,
            note: r.note,
            visited: r.visited,
            pricePerPerson: r.pricePerPerson,
            photoUris: [],
            userId: user.uid,
            listId,
          }),
        ),
      );
    }

    await clearLocalRestaurants();
    setPendingMigration(false);
    return locals.length;
  }

  function dismissMigration() {
    setPendingMigration(false);
  }

  function refreshListId(newListId: string) {
    setListId(newListId);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userId,
        listId,
        isLoading,
        skipMode,
        pendingMigration,
        login,
        register,
        logout,
        skipLogin,
        migrateLocalData,
        dismissMigration,
        refreshListId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
