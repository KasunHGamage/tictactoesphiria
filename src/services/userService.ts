// ─────────────────────────────────────────────
//  userService.ts — User profile and stats management
// ─────────────────────────────────────────────

import { doc, getDoc, setDoc, query, collection, where, getDocs, serverTimestamp, updateDoc, increment, deleteDoc } from 'firebase/firestore';
import { getAuth, deleteUser } from 'firebase/auth';
import { db, waitForAuthToken } from './firebase';
import { Difficulty } from '../game/gameTypes';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  gameId: string;
  wins: number;
  losses: number;
  xp: number;
  level: number;
  status: 'online' | 'offline' | 'in-match';
  lastSeen?: number;
  createdAt: any;
  photoURL?: string;
  lastLoginAt?: any;
  provider?: string;
}

/**
 * Level up every 100 XP (approx 2 wins)
 */
export function calculateLevel(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

/**
 * Get difficulty based on level for "auto" mode
 */
export function getAutoDifficulty(level: number): Difficulty {
  if (level <= 3) return 'easy';
  if (level <= 6) return 'medium';
  return 'hard';
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
 */
export async function createUserProfile(
  uid: string,
  email: string,
  displayName: string,
  photoURL?: string | null,
  provider?: string | null
): Promise<UserProfile> {
  let gameId = '';
  let unique = false;
  let attempts = 0;

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
    xp: 0,
    level: 1,
    status: 'online',
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    ...(photoURL ? { photoURL } : {}),
    ...(provider ? { provider } : {}),
  };

  await setDoc(doc(db, 'users', uid), profile);
  return profile;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  await waitForAuthToken();
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function ensureUserProfile(
  uid: string,
  email?: string | null,
  displayName?: string | null,
  photoURL?: string | null,
  provider?: string | null
): Promise<UserProfile> {
  const existing = await getUserProfile(uid);
  if (existing) {
    const userRef = doc(db, 'users', uid);
    const updates: any = {
      lastLoginAt: serverTimestamp(),
    };
    if (photoURL && !existing.photoURL) {
      updates.photoURL = photoURL;
    }
    if (displayName && !existing.displayName) {
      updates.displayName = displayName;
    }
    if (provider && !existing.provider) {
      updates.provider = provider;
    }
    await updateDoc(userRef, updates);
    return { ...existing, ...updates };
  }

  return createUserProfile(
    uid,
    email || '',
    displayName || email?.split('@')[0] || 'Player',
    photoURL,
    provider
  );
}

export async function getUserByGameId(gameId: string): Promise<UserProfile | null> {
  const q = query(collection(db, 'users'), where('gameId', '==', gameId.toUpperCase()));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  return querySnapshot.docs[0].data() as UserProfile;
}

export async function updateUserStatus(uid: string, status: 'online' | 'offline' | 'in-match'): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { status });
}

export async function updateUserLastSeen(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { lastSeen: Date.now() });
}

export async function recordMatchResult(uid: string, isWin: boolean, streak: number = 0): Promise<void> {
  const xpGained = (isWin ? 50 : 10) + (streak * 10);
  
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;
  const currentData = snap.data() as UserProfile;
  
  const nextXP = (currentData.xp || 0) + xpGained;
  const nextLevel = calculateLevel(nextXP);

  await updateDoc(userRef, {
    wins: increment(isWin ? 1 : 0),
    losses: increment(isWin ? 0 : 1),
    xp: nextXP,
    level: nextLevel,
    status: 'online',
  });
}

/**
 * Delete account and cascade all related documents.
 */
export async function deleteUserAccount(uid: string): Promise<void> {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  
  if (!currentUser || currentUser.uid !== uid) {
    throw new Error('Must be logged in as the user to delete account.');
  }

  // 1. ATTEMPT AUTH DELETION FIRST.
  // This is the most sensitive step and the most likely to fail due to 'requires-recent-login'.
  // By doing this first, we ensure that if it fails, the user's Firestore data remains
  // intact and they aren't left in a "half-deleted" state.
  try {
    await deleteUser(currentUser);
  } catch (e: any) {
    if (e.code === 'auth/requires-recent-login') {
      throw new Error('REAUTH_REQUIRED');
    }
    throw e;
  }

  // 2. BEST-EFFORT FIRESTORE CLEANUP.
  // Once the Auth user is deleted, these calls might fail depending on security rules.
  // However, it's better to have an "orphan" Firestore document than a "ghost" Auth account
  // that prevents the user from signing up again with the same email.
  try {
    // Cleanup matches
    const matchXQ = query(collection(db, 'matches'), where('playerX.uid', '==', uid));
    const matchXSnap = await getDocs(matchXQ);
    for (const docSnap of matchXSnap.docs) await deleteDoc(docSnap.ref);

    const matchOQ = query(collection(db, 'matches'), where('playerO.uid', '==', uid));
    const matchOSnap = await getDocs(matchOQ);
    for (const docSnap of matchOSnap.docs) await deleteDoc(docSnap.ref);

    // Cleanup friends and requests
    const friendsQ = query(collection(db, 'friends'), where('users', 'array-contains', uid));
    const friendsSnap = await getDocs(friendsQ);
    for (const docSnap of friendsSnap.docs) await deleteDoc(docSnap.ref);

    const sentQ = query(collection(db, 'friendRequests'), where('from', '==', uid));
    const sentSnap = await getDocs(sentQ);
    for (const docSnap of sentSnap.docs) await deleteDoc(docSnap.ref);

    const recvQ = query(collection(db, 'friendRequests'), where('to', '==', uid));
    const recvSnap = await getDocs(recvQ);
    for (const docSnap of recvSnap.docs) await deleteDoc(docSnap.ref);

    // Delete user profile document
    await deleteDoc(doc(db, 'users', uid));
  } catch (err) {
    console.warn('[Cleanup] Best-effort Firestore cleanup failed after account deletion:', err);
  }
}
