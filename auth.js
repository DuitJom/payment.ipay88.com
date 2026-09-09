import {
  auth,
  googleProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  signOut
} from "./firebase-config.js";


export function loginWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function loginWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function signUpWithEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}


export function logOut() {
  return signOut(auth);
}

export function monitorAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}
