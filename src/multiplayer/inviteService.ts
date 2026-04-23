// ─────────────────────────────────────────────
//  inviteService.ts — In-app invite system
// ─────────────────────────────────────────────

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { InviteDocument } from './multiplayerTypes';
import { joinMatch } from './matchService';

const INVITES = 'invites';

// ── sendInvite ────────────────────────────────────────────────────

/**
 * Send an in-app invite to another user.
 * The match must already exist (call createMatch first).
 * Returns the invite doc ID.
 */
export async function sendInvite(
  fromUid: string,
  fromName: string,
  toUid: string,
  toName: string,
  matchId: string,
): Promise<string> {
  const ref = await addDoc(collection(db, INVITES), {
    fromUid,
    fromName,
    toUid,
    toName,
    matchId,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ── acceptInvite ──────────────────────────────────────────────────

/**
 * Accept an invite. Atomically:
 *   1. Marks invite as 'accepted'
 *   2. Calls joinMatch (which validates the match is still open)
 *
 * @throws if the match is full or already started
 */
export async function acceptInvite(
  inviteId: string,
  invite: InviteDocument,
  joiningUid: string,
  joiningDisplayName: string,
): Promise<void> {
  // Join the match first — if it throws (match full/gone), we don't mark accepted
  await joinMatch(invite.matchId, joiningUid, joiningDisplayName);

  // Mark invite accepted only after successful join
  await updateDoc(doc(db, INVITES, inviteId), {
    status: 'accepted',
    updatedAt: serverTimestamp(),
  });
}

// ── declineInvite ─────────────────────────────────────────────────

export async function declineInvite(inviteId: string): Promise<void> {
  await updateDoc(doc(db, INVITES, inviteId), {
    status: 'declined',
    updatedAt: serverTimestamp(),
  });
}

// ── listenToInvites ───────────────────────────────────────────────

/**
 * Subscribe to all pending invites addressed to this user.
 * Returns an unsubscribe function.
 */
export function listenToInvites(
  uid: string,
  onUpdate: (invites: InviteDocument[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, INVITES),
    where('toUid', '==', uid),
    where('status', '==', 'pending'),
  );

  return onSnapshot(
    q,
    (snap) => {
      const invites = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as InviteDocument[];
      onUpdate(invites);
    },
    (err) => onError?.(err),
  );
}
