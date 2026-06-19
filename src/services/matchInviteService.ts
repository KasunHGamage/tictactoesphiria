// ─────────────────────────────────────────────
//  matchInviteService.ts — Real-time Invitations
// ─────────────────────────────────────────────

import { 
  collection, doc, addDoc, updateDoc, query, where, 
  onSnapshot, serverTimestamp, Unsubscribe, getDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { MatchInvite } from './matchTypes';
import { createMatch, joinMatch, getUserActiveMatch } from './matchService';

const INVITES = 'invites';

// ── Send ──────────────────────────────────────────────────────────────────────
export async function sendMatchInvite(
  fromUid: string,
  fromName: string,
  toUid: string,
  existingMatchId?: string,
): Promise<string> {
  // Guard: check for a still-pending invite from me to this friend
  const dupQ = query(
    collection(db, INVITES),
    where('from', '==', fromUid)
  );
  const dupSnap = await getDocs(dupQ);
  const existingPending = dupSnap.docs.find(d => {
    const data = d.data();
    return data.to === toUid && data.status === 'pending';
  });
  
  if (existingPending) {
    throw new Error('INVITE_PENDING');
  }

  // Reuse a pre-created match (from setup flow) or create a new one
  const matchId = existingMatchId ?? await createMatch(fromUid, fromName);

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

// ── Accept / Reject ───────────────────────────────────────────────────────
export async function acceptMatchInvite(inviteId: string, matchId: string, toUid: string, toName: string): Promise<void> {
  // Check the match for inviter info
  const matchSnap = await getDoc(doc(db, 'matches', matchId));
  if (!matchSnap.exists()) throw new Error('Match not found');
  const matchData = matchSnap.data() as any;
  if (!matchData) throw new Error('Match data is empty');
  
  const senderUid = matchData?.playerX?.uid;

  const existingMatchId = await getUserActiveMatch(toUid);
  if (existingMatchId && existingMatchId !== matchId) {
    await updateDoc(doc(db, INVITES, inviteId), {
      status: 'user_in_match',
      updatedAt: serverTimestamp(),
    });
    throw new Error('USER_ALREADY_IN_MATCH');
  }

  // Check that the sender (playerX) is still online
  if (senderUid) {
    const senderSnap = await getDoc(doc(db, 'users', senderUid));
    if (senderSnap.exists()) {
      const senderData = senderSnap.data();
      const lastSeen: number = senderData?.lastSeen ?? 0;
      const isOnline = Date.now() - lastSeen < 30_000; // 30s – covers 10s heartbeat + latency
      if (!isOnline) {
        // Cancel the invite so it disappears from UI
        await updateDoc(doc(db, INVITES, inviteId), {
          status: 'cancelled',
          updatedAt: serverTimestamp(),
        });
        throw new Error('SENDER_OFFLINE');
      }
    }
  }

  // Check if another friend has already accepted this match (first-come-first-serve)
  if (matchData.playerO) {
    // Match already has 2 players, reject this invite
    await updateDoc(doc(db, INVITES, inviteId), {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    });
    throw new Error('MATCH_ALREADY_FILLED');
  }

  // Join match and mark invite accepted
  try {
    await joinMatch(matchId, toUid, toName);
    await updateDoc(doc(db, INVITES, inviteId), {
      status: 'accepted',
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    // If join fails (e.g., match no longer waiting), mark invite as cancelled
    if (error.message.includes('already started') || error.message.includes('already has two')) {
      await updateDoc(doc(db, INVITES, inviteId), {
        status: 'user_in_match',
        updatedAt: serverTimestamp(),
      });
    }
    throw error;
  }
}

export async function rejectMatchInvite(inviteId: string): Promise<void> {
  await updateDoc(doc(db, INVITES, inviteId), {
    status: 'rejected',
    updatedAt: serverTimestamp(),
  });
}

// ── Listeners ─────────────────────────────────────────────────────────────────
export function listenToIncomingInvites(uid: string, onUpdate: (invites: MatchInvite[]) => void): Unsubscribe {
  const q = query(
    collection(db, INVITES), 
    where('to', '==', uid), 
    where('status', 'in', ['pending', 'user_in_match'])  // Show pending and blocked invites
  );
  return onSnapshot(
    q,
    (snap) => {
      const invites = snap.docs.map(d => ({ id: d.id, ...d.data() } as MatchInvite));
      // Deduplicate by sender (if there are stuck duplicates, only show one)
      const map = new Map<string, MatchInvite>();
      invites.forEach(inv => map.set(inv.from, inv));
      onUpdate(Array.from(map.values()));
    },
    (error) => {
      console.warn('[Firestore] incoming invites listener failed:', error);
      onUpdate([]);
    }
  );
}

export function listenToSentPendingInvites(uid: string, onUpdate: (invites: MatchInvite[]) => void): Unsubscribe {
  const q = query(collection(db, INVITES), where('from', '==', uid), where('status', '==', 'pending'));
  return onSnapshot(
    q,
    (snap) => {
      onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() } as MatchInvite)));
    },
    (error) => {
      console.warn('[Firestore] sent invites listener failed:', error);
      onUpdate([]);
    }
  );
}

const handledInvites = new Set<string>();

export function listenToAcceptedInvites(uid: string, onMatchStarted: (matchId: string, playerSide: 'X' | 'O') => void): Unsubscribe {
  const checkAndStartMatch = async (inviteId: string, matchId: string, side: 'X' | 'O') => {
    if (handledInvites.has(inviteId)) return;
    handledInvites.add(inviteId);
    
    const matchSnap = await getDoc(doc(db, 'matches', matchId));
    if (matchSnap.exists()) {
      const matchData = matchSnap.data();
      if (matchData.status === 'playing' || matchData.status === 'waiting') {
        onMatchStarted(matchId, side);
      }
    }
  };

  const qFrom = query(collection(db, INVITES), where('from', '==', uid), where('status', '==', 'accepted'));
  const unsubFrom = onSnapshot(
    qFrom,
    (snap) => {
      snap.docs.forEach(d => {
        const data = d.data() as MatchInvite;
        if (data.matchId) checkAndStartMatch(d.id, data.matchId, 'X');
      });
    },
    (error) => console.warn('[Firestore] accepted sent invites listener failed:', error)
  );

  const qTo = query(collection(db, INVITES), where('to', '==', uid), where('status', '==', 'accepted'));
  const unsubTo = onSnapshot(
    qTo,
    (snap) => {
      snap.docs.forEach(d => {
        const data = d.data() as MatchInvite;
        if (data.matchId) checkAndStartMatch(d.id, data.matchId, 'O');
      });
    },
    (error) => console.warn('[Firestore] accepted incoming invites listener failed:', error)
  );

  return () => { unsubFrom(); unsubTo(); };
}
