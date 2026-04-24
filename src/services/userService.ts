// ─────────────────────────────────────────────
//  userService.ts — User profile and stats management
// ─────────────────────────────────────────────

import { doc, getDoc, setDoc, query, collection, where, getDocs, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';
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
  createdAt: any;
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
export async function createUserProfile(uid: string, email: string, displayName: string): Promise<UserProfile> {
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
  };

  await setDoc(doc(db, 'users', uid), profile);
  return profile;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
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
