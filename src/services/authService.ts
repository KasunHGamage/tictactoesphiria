// ─────────────────────────────────────────────
//  authService.ts — Firebase Auth operations
// ─────────────────────────────────────────────

import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile 
} from 'firebase/auth';
import { auth } from '../multiplayer/firebase';
import { createUserProfile } from './userService';

/**
 * Sign up a new user with email and password.
 * Creates a Firestore profile immediately after account creation.
 */
export async function signUp(email: string, pass: string, name: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  const user = userCredential.user;

  // Update Firebase Auth profile
  await updateProfile(user, { displayName: name });

  // Create Firestore user document
  await createUserProfile(user.uid, email, name);

  return user;
}

/**
 * Log in an existing user.
 */
export async function login(email: string, pass: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, pass);
  return userCredential.user;
}

/**
 * Log out the current user.
 */
export async function logout() {
  await signOut(auth);
}
