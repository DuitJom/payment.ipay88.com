import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
  updateProfile,
  signOut,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from "./firebase-config.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export function loginWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function loginWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(displayName, email, password) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const cleanName = displayName.trim();
  if (cleanName) await updateProfile(credential.user, { displayName: cleanName });
  return credential;
}

export function sendVerificationEmail(user = auth.currentUser) {
  if (!user) return Promise.reject(new Error("Tiada pengguna yang sedang log masuk."));
  return sendEmailVerification(user);
}

export async function refreshCurrentUser(user = auth.currentUser) {
  if (!user) return null;
  await reload(user);
  return auth.currentUser;
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

export function sendMagicLink(email, actionCodeSettings) {
  return sendSignInLinkToEmail(auth, email, actionCodeSettings);
}

export function isMagicLink(url = window.location.href) {
  return isSignInWithEmailLink(auth, url);
}

export function completeMagicLink(email, url = window.location.href) {
  return signInWithEmailLink(auth, email, url);
}

export async function ensureUserProfile(user = auth.currentUser) {
  if (!user) return null;

  const profileRef = doc(db, "users", user.uid);
  const existingProfile = await getDoc(profileRef);
  const provider = user.providerData.map((item) => item.providerId).join(",") || "password";
  const profile = {
    uid: user.uid,
    displayName: user.displayName || "",
    email: user.email || "",
    photoURL: user.photoURL || "",
    provider,
    emailVerified: Boolean(user.emailVerified),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp()
  };

  if (!existingProfile.exists()) profile.createdAt = serverTimestamp();
  await setDoc(profileRef, profile, { merge: true });
  return profile;
}

export function logOut() {
  return signOut(auth);
}

export function monitorAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getFriendlyAuthError(error) {
  const messages = {
    "auth/invalid-credential": "Email atau kata laluan tidak betul.",
    "auth/invalid-login-credentials": "Email atau kata laluan tidak betul.",
    "auth/email-already-in-use": "Email ini sudah mempunyai akaun.",
    "auth/weak-password": "Kata laluan perlu sekurang-kurangnya 6 aksara.",
    "auth/invalid-email": "Sila masukkan alamat email yang sah.",
    "auth/too-many-requests": "Terlalu banyak percubaan. Sila cuba lagi kemudian.",
    "auth/popup-closed-by-user": "Tetingkap Google ditutup sebelum log masuk selesai.",
    "auth/popup-blocked": "Browser menyekat popup Google. Benarkan popup dan cuba lagi.",
    "auth/operation-not-allowed": "Kaedah log masuk ini belum diaktifkan dalam Firebase Console.",
    "auth/user-not-found": "Akaun dengan email ini tidak ditemui.",
    "auth/missing-email": "Sila masukkan alamat email.",
    "auth/network-request-failed": "Sambungan internet terganggu. Sila cuba lagi.",
    "auth/invalid-action-code": "Pautan ini tidak sah atau telah tamat tempoh."
  };
  return messages[error?.code] || "Operasi auth tidak berjaya. Sila cuba lagi.";
}
