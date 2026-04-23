// ─────────────────────────────────────────────
//  userService.ts — User profile and stats management
// ─────────────────────────────────────────────

import { doc, getDoc, setDoc, query, collection, where, getDocs, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { db } from '../multiplayer/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  gameId: string;
  wins: number;
  losses: number;
  status: 'online' | 'offline' | 'in-match';
  createdAt: any;
}

// ── Helpers ───────────────────────────────────────────────────────

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateGameId(): string {
  return Array.from({ length: 6 }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)],
  ).join('');
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Creates a new user profile in Firestore after successful signup.
 * Ensures the gameId is unique.
 */
export async function createUserProfile(uid: string, email: string, displayName: string): Promise<UserProfile> {
  let gameId = '';
  let unique = false;
  let attempts = 0;

  // Ensure gameId uniqueness
  while (!unique && attempts < 10) {
    gameId = generateGameId();
    const q = query(collection(db, 'users'), where('gameId', '==', gameId));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      unique = true;
    }
    attempts++;
  }

  if (!unique) throw new Error("Could not generate a unique Game ID.");

  const profile: UserProfile = {
    uid,
    email,
    displayName,
    gameId,
    wins: 0,
    losses: 0,
    status: 'online',
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'users', uid), profile);
  return profile;
}

/**
 * Fetch a user profile by UID.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

/**
 * Fetch a user profile by Game ID (for friend searches).
 */
export async function getUserByGameId(gameId: string): Promise<UserProfile | null> {
  const q = query(collection(db, 'users'), where('gameId', '==', gameId.toUpperCase()));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  return querySnapshot.docs[0].data() as UserProfile;
}

/**
 * Update user online status.
 */
export async function updateUserStatus(uid: string, status: 'online' | 'offline' | 'in-match'): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { status });
}

/**
 * Record match result.
 */
export async function recordMatchResult(uid: string, isWin: boolean): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    wins: increment(isWin ? 1 : 0),
    losses: increment(isWin ? 0 : 1),
    status: 'online',
  });
}
