// ─────────────────────────────────────────────
//  userService.ts — UUID-based local identity
// ─────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { LocalUser, UserDocument } from './multiplayerTypes';

const UID_KEY = 'ttt:uid';
const NAME_KEY = 'ttt:displayName';

// ── UUID generator (no external deps) ────────────────────────────

function generateUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Read the locally stored user. Returns null if never set up.
 */
export async function getLocalUser(): Promise<LocalUser | null> {
  const [uid, displayName] = await AsyncStorage.multiGet([UID_KEY, NAME_KEY]);
  const uidVal = uid[1];
  const nameVal = displayName[1];
  if (!uidVal || !nameVal) return null;
  return { uid: uidVal, displayName: nameVal };
}

/**
 * Create or update local identity.
 * Generates a stable UUID on first call, then writes the users/{uid} Firestore doc.
 */
export async function initUser(displayName: string): Promise<LocalUser> {
  let uid = (await AsyncStorage.getItem(UID_KEY)) ?? generateUID();
  await AsyncStorage.multiSet([
    [UID_KEY, uid],
    [NAME_KEY, displayName],
  ]);

  const userDoc: Omit<UserDocument, 'updatedAt'> & { updatedAt: unknown } = {
    uid,
    displayName,
    currentMatchId: null,
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, 'users', uid), userDoc, { merge: true });

  return { uid, displayName };
}

/**
 * Update the currentMatchId field on the users doc.
 * Pass null to clear (match ended / left lobby).
 */
export async function setUserCurrentMatch(
  uid: string,
  matchId: string | null,
): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    { currentMatchId: matchId, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
