import {
  auth,
  authPersistenceReady,
  db,
  googleProvider,
  githubProvider,
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
} from "./firebase-config.js?v=20260914";

// SELEPAS (NPM) - Tukar kepada format ini:
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";

export async function loginWithGoogle() {
  await authPersistenceReady;
  return signInWithPopup(auth, googleProvider);
}

export async function loginWithGithub() {
  await authPersistenceReady;
  return signInWithPopup(auth, githubProvider);
}

export async function loginWithEmail(email, password) {
  await authPersistenceReady;
  return signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(displayName, email, password) {
  await authPersistenceReady;
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const cleanName = displayName?.trim() || "";
    if (cleanName) {
      await updateProfile(credential.user, { displayName: cleanName });
    }
    await sendEmailVerification(credential.user);
    return credential;
  } catch (error) {
    console.error("Ralat pendaftaran:", error);
    throw error;
  }
}

export function sendVerificationEmail(user = auth.currentUser, actionCodeSettings) {
  if (!user) return Promise.reject(new Error("No user is currently signed in."));
  return sendEmailVerification(user, actionCodeSettings);
}

export async function refreshCurrentUser(user = auth.currentUser) {
  if (!user) return null;
  await reload(user);
  return auth.currentUser;
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

export async function sendMagicLink(email, actionCodeSettings) {
  await authPersistenceReady;
  return sendSignInLinkToEmail(auth, email, actionCodeSettings);
}

export function isMagicLink(url = window.location.href) {
  return isSignInWithEmailLink(auth, url);
}

export async function completeMagicLink(email, url = window.location.href) {
  await authPersistenceReady;
  return signInWithEmailLink(auth, email, url);
}

export async function ensureUserProfile(user = auth.currentUser) {
  if (!user) return null;
  try {
    const profileRef = doc(db, "users", user.uid);
    const existingProfile = await getDoc(profileRef);
    const provider = user.providerData.map((item) => item.providerId).join(",") || "password";
    const providerVerified = user.providerData.some(({ providerId }) => providerId === "google.com" || providerId === "github.com");
    
    const profile = {
      uid: user.uid,
      displayName: user.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
      provider,
      emailVerified: Boolean(user.emailVerified || providerVerified),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    };

    if (!existingProfile.exists()) profile.createdAt = serverTimestamp();
    await setDoc(profileRef, profile, { merge: true });
    return profile;
  } catch (error) {
    console.warn("Profil gagal disimpan di Firestore (E-mel belum disahkan):", error.message);
    return null; // Menghalang aplikasi daripada crash
  }
}

export function logOut() {
  return signOut(auth);
}

export function monitorAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getFriendlyAuthError(error) {
  const key = error?.code ? `auth.errors.${error.code}` : null;
  if (window.DJ_I18N && key) {
    const translated = window.DJ_I18N.t(key);
    if (translated !== key) return translated;
  }
  return window.DJ_I18N ? window.DJ_I18N.t("auth.genericError") : "The auth operation failed. Please try again.";
}
