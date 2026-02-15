import { createContext, useState, useEffect, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { ensureUserList } from '../services/listService';
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setUserId(firebaseUser.uid);
        setSkipModeState(false);
        await setSkipMode(false);

        // Ensure user doc exists
        await setDoc(
          doc(db, 'users', firebaseUser.uid),
          {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '',
            createdAt: serverTimestamp(),
          },
          { merge: true },
        );

        const userListId = await ensureUserList(firebaseUser.uid);
        setListId(userListId);

        // Detect local restaurants from skip mode for migration
        const localCount = await getLocalRestaurantCount();
        if (localCount > 0) {
          setPendingMigration(true);
        }
      } else {
        setUser(null);
        const wasSkip = await getSkipMode();
        if (wasSkip) {
          const deviceId = await getOrCreateDeviceId();
          setUserId(deviceId);
          setListId('local');
          setSkipModeState(true);
        } else {
          setUserId('');
          setListId('');
          setSkipModeState(false);
        }
      }
      setIsLoading(false);
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

    for (const r of locals) {
      await saveRestaurant({
        name: r.name,
        address: r.address,
        latitude: r.latitude,
        longitude: r.longitude,
        rating: r.rating,
        note: r.note,
        visited: r.visited,
        photoUri: null,
        userId: user.uid,
        listId,
      });
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
