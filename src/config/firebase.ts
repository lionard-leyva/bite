import { initializeApp } from 'firebase/app';
import { initializeAuth, inMemoryPersistence } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

const firebaseConfig = {
  apiKey: extra.FIREBASE_API_KEY,
  authDomain: extra.FIREBASE_AUTH_DOMAIN,
  projectId: extra.FIREBASE_PROJECT_ID,
  storageBucket: extra.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: extra.FIREBASE_MESSAGING_SENDER_ID,
  appId: extra.FIREBASE_APP_ID,
};

if (__DEV__) {
  console.log('Firebase config loaded:', {
    apiKey: firebaseConfig.apiKey ? firebaseConfig.apiKey.substring(0, 10) + '...' : 'MISSING',
    projectId: firebaseConfig.projectId || 'MISSING',
    authDomain: firebaseConfig.authDomain || 'MISSING',
  });
}

if (!firebaseConfig.apiKey) {
  throw new Error(
    'Firebase API key not found. Check that app.config.js extra.FIREBASE_API_KEY is set and expo-constants is loading correctly.'
  );
}

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  // Force no persistence: always require login on app start.
  persistence: inMemoryPersistence,
});

export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
});

export const storage = getStorage(app);

export default app;
