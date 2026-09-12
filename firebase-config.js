import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
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
  signInWithEmailLink,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  multiFactor,
  TotpMultiFactorGenerator
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. TAMBAH IMPORT UNTUK FIREBASE MESSAGING
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js";

// Firebase Web configuration
const firebaseConfig = {
  apiKey: "AIzaSyCKb-QOYSTP0scv0UXmraluMe3xFtfIH_0",
  authDomain: "duitjom-sign-up-in.firebaseapp.com",
  projectId: "duitjom-sign-up-in",
  storageBucket: "duitjom-sign-up-in.firebasestorage.app",
  messagingSenderId: "246834525616",
  appId: "1:246834525616:web:a8429bda0166e6e03c1275",
  measurementId: "G-T52Q57SJC4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 2. INISIALISASI MESSAGING & VAPID KEY
const messaging = getMessaging(app);
const VAPID_KEY = "BORAlMubbD_J0GIRGyX9DK4fX7lnjdUHFGmKzpOFlbeKou6hELQX1xzgWhRTnqI6rvlxj1xpIkBXWt5cohDmilc";

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// 3. FUNGSI UNTUK DAPATKAN FCM TOKEN PENGGUNA
async function getNotificationToken() {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (currentToken) {
        console.log("FCM Token Pengguna:", currentToken);
        return currentToken;
      } else {
        console.log("Tiada token didapati. Sila pastikan Service Worker didaftarkan.");
      }
    } else {
      console.log("Kebenaran notifikasi ditolak oleh pengguna.");
    }
  } catch (err) {
    console.error("Ralat mendapatkan token notifikasi:", err);
  }
}

// API global ini digunakan oleh partial auth lama
window.duitjomFirebaseAuth = auth;
window.duitjomFirebaseDb = db;
window.duitjomMessaging = messaging;
window.getNotificationToken = getNotificationToken;

window.firebaseAuth = {
  GoogleAuthProvider,
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
  signInWithEmailLink,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  multiFactor,
  TotpMultiFactorGenerator
};

// 4. EKSPORT FUNGSI & VARIABLE KEPADA FAIL LAIN
export {
  app,
  auth,
  db,
  messaging,
  VAPID_KEY,
  getNotificationToken,
  firebaseConfig,
  githubProvider,
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
};
