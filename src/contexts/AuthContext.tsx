import { createContext, useReducer, useEffect, useRef, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { ensureUserList, consolidateUserLists, joinListByCode } from '../services/listService';
import {
  getOrCreateDeviceId,
  setSkipMode,
  getLocalRestaurants,
  getLocalRestaurantCount,
  clearLocalRestaurants,
} from '../services/localStorageService';
import { saveRestaurant } from '../services/restaurantService';
import { uploadAvatar } from '../services/imageService';

export interface AuthState {
  user: FirebaseUser | null;
  userId: string;
  listId: string;
  isLoading: boolean;
  skipMode: boolean;
  pendingMigration: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    profile?: {
      name?: string;
      bio?: string;
      birthday?: string;
      city?: string;
      cityLat?: number | null;
      cityLng?: number | null;
      address?: string;
      addressLat?: number | null;
      addressLng?: number | null;
      avatarUri?: string | null;
      inviteCode?: string;
    },
  ) => Promise<void>;
  logout: () => Promise<void>;
  skipLogin: () => Promise<void>;
  migrateLocalData: () => Promise<number>;
  dismissMigration: () => void;
  refreshListId: (newListId: string) => void;
}

export const AuthContext = createContext<AuthState | null>(null);

interface AuthStateShape {
  user: FirebaseUser | null;
  userId: string;
  listId: string;
  isLoading: boolean;
  skipMode: boolean;
  pendingMigration: boolean;
}

type AuthAction =
  | { type: 'patch'; payload: Partial<AuthStateShape> }
  | { type: 'reset' };

const initialAuthState: AuthStateShape = {
  user: null,
  userId: '',
  listId: '',
  isLoading: true,
  skipMode: false,
  pendingMigration: false,
};

function authReducer(state: AuthStateShape, action: AuthAction): AuthStateShape {
  switch (action.type) {
    case 'patch':
      return { ...state, ...action.payload };
    case 'reset':
      return { ...initialAuthState, isLoading: false };
    default:
      return state;
  }
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const pendingJoinCodeRef = useRef<string | null>(null);

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
          let userListId = '';
          if (pendingJoinCodeRef.current) {
            const code = pendingJoinCodeRef.current;
            pendingJoinCodeRef.current = null;
            try {
              const joined = await joinListByCode(firebaseUser.uid, code);
              userListId = joined.listId;
            } catch (err) {
              console.error('[AuthContext] Join by code failed:', err);
            }
          }
          if (!userListId) {
            userListId = await ensureUserList(firebaseUser.uid);
          }
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

          const nextPatch: Partial<AuthStateShape> = {
            skipMode: false,
            userId: firebaseUser.uid,
            listId: userListId,
            user: firebaseUser,
          };
          if (localCount > 0) {
            nextPatch.pendingMigration = true;
          }

          if (!alreadyConsolidated) {
            void consolidateUserLists(firebaseUser.uid, userListId).catch((err) => {
              console.error('[AuthContext] Consolidation failed:', err);
            });
          }

          console.warn('[AuthContext] Auth setup OK — uid:', firebaseUser.uid, 'listId:', userListId);

          dispatch({ type: 'patch', payload: nextPatch });
        } else {
          // Always start at login on app launch; do not auto-enter skip mode.
          await setSkipMode(false);
          if (callIdRef.current !== thisCall) return;
          dispatch({
            type: 'patch',
            payload: {
              user: null,
              userId: '',
              listId: '',
              skipMode: false,
            },
          });
        }
      } catch (err) {
        console.error('[AuthContext] Auth setup failed:', err);
        // If setup fails, reset to signed-out state so the user can retry
        dispatch({ type: 'reset' });
      } finally {
        // Only update isLoading if this is still the latest callback
        if (callIdRef.current === thisCall) {
          dispatch({ type: 'patch', payload: { isLoading: false } });
        }
      }
    });

    return unsubscribe;
  }, []);

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function register(
    email: string,
    password: string,
    profile?: {
      name?: string;
      bio?: string;
      birthday?: string;
      city?: string;
      cityLat?: number | null;
      cityLng?: number | null;
      address?: string;
      addressLat?: number | null;
      addressLng?: number | null;
      avatarUri?: string | null;
      inviteCode?: string;
    },
  ) {
    const invite = profile?.inviteCode?.trim().replace('-', '');
    if (invite) {
      pendingJoinCodeRef.current = invite;
    }

    await createUserWithEmailAndPassword(auth, email, password);

    const current = auth.currentUser;
    if (!current) return;

    let photoURL: string | undefined;
    if (profile?.avatarUri) {
      photoURL = await uploadAvatar(profile.avatarUri, current.uid);
    }

    const displayName = profile?.name?.trim() || current.displayName || '';
    if (displayName || photoURL) {
      await updateProfile(current, {
        displayName: displayName || undefined,
        photoURL: photoURL || undefined,
      });
    }

    const profileData: Record<string, unknown> = {};
    if (displayName) profileData.displayName = displayName;
    if (photoURL) profileData.photoURL = photoURL;
    if (profile?.bio?.trim()) profileData.bio = profile.bio.trim();
    if (profile?.birthday?.trim()) profileData.birthday = profile.birthday.trim();
    if (profile?.city?.trim()) profileData.city = profile.city.trim();
    if (profile?.cityLat != null && profile?.cityLng != null) {
      profileData.cityLat = profile.cityLat;
      profileData.cityLng = profile.cityLng;
    }
    if (profile?.address?.trim()) profileData.address = profile.address.trim();
    if (profile?.addressLat != null && profile?.addressLng != null) {
      profileData.addressLat = profile.addressLat;
      profileData.addressLng = profile.addressLng;
    }

    if (Object.keys(profileData).length > 0) {
      await setDoc(doc(db, 'users', current.uid), profileData, { merge: true });
    }
  }

  async function logout() {
    await signOut(auth);
    dispatch({
      type: 'patch',
      payload: { user: null, userId: '', listId: '', skipMode: false },
    });
    await setSkipMode(false);
  }

  async function skipLogin() {
    const deviceId = await getOrCreateDeviceId();
    dispatch({
      type: 'patch',
      payload: { user: null, userId: deviceId, listId: 'local', skipMode: true },
    });
    await setSkipMode(true);
    dispatch({ type: 'patch', payload: { isLoading: false } });
  }

  async function migrateLocalData(): Promise<number> {
    if (!state.user || state.skipMode) return 0;
    const user = state.user;

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
            photoUris: r.photoURLs?.length ? r.photoURLs : r.photoURL ? [r.photoURL] : [],
            userId: user.uid,
            listId: state.listId,
          }),
        ),
      );
    }

    await clearLocalRestaurants();
    dispatch({ type: 'patch', payload: { pendingMigration: false } });
    return locals.length;
  }

  function dismissMigration() {
    dispatch({ type: 'patch', payload: { pendingMigration: false } });
  }

  function refreshListId(newListId: string) {
    dispatch({ type: 'patch', payload: { listId: newListId } });
  }

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        userId: state.userId,
        listId: state.listId,
        isLoading: state.isLoading,
        skipMode: state.skipMode,
        pendingMigration: state.pendingMigration,
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
