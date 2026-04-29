// ─────────────────────────────────────────────
//  firebase.ts — Firebase app + Firestore init
// ─────────────────────────────────────────────

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.EXPO_PUBLIC_AUTH_DOMAIN,
  projectId:         process.env.EXPO_PUBLIC_PROJECT_ID,
  storageBucket:     process.env.EXPO_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_MESSAGING_SENDER_ID,
  appId:             process.env.EXPO_PUBLIC_APP_ID,
};

if (!firebaseConfig.apiKey) {
  throw new Error('Missing Firebase Configuration. Ensure .env file exists.');
}

console.log('Firebase Config loaded:', {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? '***' + firebaseConfig.apiKey.slice(-4) : undefined
});

// Only initialize once — avoid "already initialized" error on hot-reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use initializeAuth with AsyncStorage persistence on first init,
// fall back to getAuth() on subsequent hot-reloads
let auth: ReturnType<typeof getAuth>;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch {
  // Already initialized — retrieve the existing instance
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
