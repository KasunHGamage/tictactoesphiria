// ─────────────────────────────────────────────
//  firebase.ts — Firebase app + Firestore init
// ─────────────────────────────────────────────
//
//  ⚠️  TODO: Replace the placeholder below with YOUR Firebase config.
//
//  How to get it:
//    1. Go to https://console.firebase.google.com/
//    2. Select your project (or create one)
//    3. Project Settings → Your apps → Add app → Web
//    4. Copy the firebaseConfig object and paste it below.
//
//  Required Firestore collections (create in Firestore console):
//    - users    (no rules needed for dev; restrict before shipping)
//    - matches
//    - invites
//
// ─────────────────────────────────────────────

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// ── Firebase Configuration ─────────────────────────────────────
// These are loaded from environment variables (EXPO_PUBLIC_*)
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_APP_ID,
};

// ── Security Hardening: Validate environment variables ──────────
if (!firebaseConfig.apiKey) {
  throw new Error(
    "Missing Firebase Configuration. Ensure .env file exists and is populated with EXPO_PUBLIC_* variables."
  );
}
// ─────────────────────────────────────────────────────────────────

// Prevent duplicate initialization on hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);
