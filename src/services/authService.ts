import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  sendPasswordResetEmail,
  signInWithCredential,
  OAuthProvider
} from 'firebase/auth';
import { auth } from './firebase';
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

/**
 * Send password reset email.
 */
export async function sendPasswordReset(email: string) {
  await sendPasswordResetEmail(auth, email);
}



/**
 * Log in using Apple Sign-In and authenticate with Firebase.
 */
export async function loginWithApple(identityToken: string, rawNonce: string) {
  // Create Firebase OAuthProvider credential for apple.com
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: identityToken,
    rawNonce: rawNonce,
  });

  const userCredential = await signInWithCredential(auth, credential);
  return userCredential.user;
}
