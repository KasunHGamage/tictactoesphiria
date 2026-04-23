// ─────────────────────────────────────────────
//  matchInviteService.ts — Real-time Invitations
// ─────────────────────────────────────────────

import { 
  collection, doc, addDoc, updateDoc, query, where, 
  onSnapshot, serverTimestamp, Unsubscribe, getDoc 
} from 'firebase/firestore';
import { db } from './firebase';
import { MatchInvite } from './matchTypes';
import { createMatch, joinMatch } from './matchService';

const INVITES = 'invites';

/**
 * Send a match invitation. Creates a 'waiting' match doc first.
 */
export async function sendMatchInvite(fromUid: string, fromName: string, toUid: string): Promise<string> {
  // 1. Create the match first
  const matchId = await createMatch(fromUid, fromName);

  // 2. Create the invitation pointing to that match
  const invite: Omit<MatchInvite, 'id'> = {
    from: fromUid,
    fromName,
    to: toUid,
    status: 'pending',
    matchId,
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, INVITES), invite);
  return ref.id;
}

/**
 * Accept a match invitation.
 */
export async function acceptMatchInvite(inviteId: string, matchId: string, toUid: string, toName: string): Promise<void> {
  // 1. Join the match
  await joinMatch(matchId, toUid, toName);

  // 2. Mark invite as accepted
  await updateDoc(doc(db, INVITES, inviteId), {
    status: 'accepted',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Reject a match invitation.
 */
export async function rejectMatchInvite(inviteId: string): Promise<void> {
  await updateDoc(doc(db, INVITES, inviteId), {
    status: 'rejected',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Listen for incoming 'pending' invitations.
 */
export function listenToIncomingInvites(uid: string, onUpdate: (invites: MatchInvite[]) => void): Unsubscribe {
  const q = query(collection(db, INVITES), where('to', '==', uid), where('status', '==', 'pending'));
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() } as MatchInvite)));
  });
}

/**
 * Listen for any invitation involving me that has been 'accepted'.
 * This allows the sender to know when the recipient has joined.
 */
const handledInvites = new Set<string>();

export function listenToAcceptedInvites(uid: string, onMatchStarted: (matchId: string, playerSide: 'X' | 'O') => void): Unsubscribe {
  // Check invites where I am the sender AND status changed to accepted
  const qFrom = query(collection(db, INVITES), where('from', '==', uid), where('status', '==', 'accepted'));
  const unsubFrom = onSnapshot(qFrom, (snap) => {
    snap.docs.forEach(d => {
      const data = d.data() as MatchInvite;
      if (data.matchId && !handledInvites.has(d.id)) {
        handledInvites.add(d.id);
        onMatchStarted(data.matchId, 'X');
      }
    });
  });

  // Check invites where I am the recipient AND I just accepted
  const qTo = query(collection(db, INVITES), where('to', '==', uid), where('status', '==', 'accepted'));
  const unsubTo = onSnapshot(qTo, (snap) => {
    snap.docs.forEach(d => {
      const data = d.data() as MatchInvite;
      if (data.matchId && !handledInvites.has(d.id)) {
        handledInvites.add(d.id);
        onMatchStarted(data.matchId, 'O');
      }
    });
  });

  return () => {
    unsubFrom();
    unsubTo();
  };
}
