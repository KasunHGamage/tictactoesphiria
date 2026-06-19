// ─────────────────────────────────────────────
//  friendsService.ts — Social and Friends logic (re-save)
// ─────────────────────────────────────────────

import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp, 
  deleteDoc,
  getDocs,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';

export interface FriendRequest {
  id: string;
  from: string;
  fromName: string;
  to: string;
  toName?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: any;
}

/**
 * Send a friend request to another user.
 */
export async function sendFriendRequest(fromUid: string, fromName: string, toUid: string, toName?: string): Promise<void> {
  const request: Omit<FriendRequest, 'id'> = {
    from: fromUid,
    fromName,
    to: toUid,
    toName,
    status: 'pending',
    createdAt: serverTimestamp(),
  };
  
  await addDoc(collection(db, 'friendRequests'), request);
}

/**
 * Accept a friend request.
 * Creates two documents in the 'friends' collection to represent the mutual relationship.
 */
export async function acceptFriendRequest(requestId: string, fromUid: string, toUid: string): Promise<void> {
  // Create friend link 1
  await addDoc(collection(db, 'friends'), {
    users: [fromUid, toUid],
    createdAt: serverTimestamp(),
  });

  // Delete the request
  await deleteDoc(doc(db, 'friendRequests', requestId));
}

/**
 * Reject a friend request.
 */
export async function rejectFriendRequest(requestId: string): Promise<void> {
  await deleteDoc(doc(db, 'friendRequests', requestId));
}

/**
 * Listen to incoming friend requests.
 */
export function listenToRequests(uid: string, onUpdate: (reqs: FriendRequest[]) => void): Unsubscribe {
  const q = query(collection(db, 'friendRequests'), where('to', '==', uid), where('status', '==', 'pending'));
  
  return onSnapshot(
    q,
    (snap) => {
      const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() } as FriendRequest));
      onUpdate(reqs);
    },
    (error) => {
      console.warn('[Firestore] incoming friend requests listener failed:', error);
      onUpdate([]);
    }
  );
}

/**
 * Listen to sent friend requests.
 */
export function watchSentRequests(uid: string, onUpdate: (reqs: FriendRequest[]) => void): Unsubscribe {
  const q = query(collection(db, 'friendRequests'), where('from', '==', uid), where('status', '==', 'pending'));
  
  return onSnapshot(
    q,
    (snap) => {
      const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() } as FriendRequest));
      onUpdate(reqs);
    },
    (error) => {
      console.warn('[Firestore] sent friend requests listener failed:', error);
      onUpdate([]);
    }
  );
}

/**
 * Listen to friend list.
 */
export function listenToFriends(uid: string, onUpdate: (friendUids: string[]) => void): Unsubscribe {
  const q = query(collection(db, 'friends'), where('users', 'array-contains', uid));
  
  return onSnapshot(
    q,
    (snap) => {
      const friendUids = snap.docs.map(d => {
        const users = d.data().users as string[];
        return users.find(u => u !== uid)!;
      });
      onUpdate(friendUids);
    },
    (error) => {
      console.warn('[Firestore] friends listener failed:', error);
      onUpdate([]);
    }
  );
}

/**
 * Remove a friend relationship.
 */
export async function removeFriend(uid1: string, uid2: string): Promise<void> {
  const q = query(
    collection(db, 'friends'), 
    where('users', 'array-contains', uid1)
  );
  
  const snap = await getDocs(q);
  const deletePromises = snap.docs
    .filter(d => (d.data().users as string[]).includes(uid2))
    .map(d => deleteDoc(d.ref));
    
  await Promise.all(deletePromises);
}
